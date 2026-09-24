import * as vscode from 'vscode';
import { getConfig, shouldResolveInHost } from './config';
import { DocumentResolver } from './DocumentResolver';
import { Logger, sanitizeText } from './logger';
import { basename, dirname } from './pathUtils';
import { warnPlaintextCredentials } from './secretCommands';

interface ScrollPosition {
  x: number;
  y: number;
}

let position: ScrollPosition = {
  x: 0,
  y: 0
};

export function previewAsyncAPI(context: vscode.ExtensionContext, resolver: DocumentResolver, logger: Logger) {
 return async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
    if (uri) {
      console.log('Opening asyncapi file', uri.fsPath);
      await openAsyncAPI(context, uri, resolver, logger);
    }
  };
}

export const openAsyncapiFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel
const openAsyncapiUris: { [id: string]: vscode.Uri } = {}; // vscode.Uri.fsPath => vscode.Uri, keeps the original scheme (file, vscode-vfs, ...)

/** Re-renders every open preview, for instance after the authentication settings change. */
export async function reloadOpenPreviews(
  context: vscode.ExtensionContext,
  resolver: DocumentResolver,
  logger: Logger
) {
  for (const uri of Object.values(openAsyncapiUris)) {
    await openAsyncAPI(context, uri, resolver, logger);
  }
}

export function isAsyncAPIFile(document?: vscode.TextDocument) {
  if (!document) {
    return false;
  }
  if (document.languageId === 'json') {
    try {
      const json = JSON.parse(document.getText());
      return json.asyncapi;
    } catch (e) {
      return false;
    }
  }
  if (document.languageId === 'yml' || document.languageId === 'yaml') {
    return document.getText().match('^asyncapi:') !== null;
  }
  return false;
}

export async function openAsyncAPI(
  context: vscode.ExtensionContext,
  uri: vscode.Uri,
  resolver: DocumentResolver,
  logger: Logger
) {
  const localResourceRoots = [
    vscode.Uri.file(dirname(uri.fsPath)),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone'),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles'),
  ];
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(folder => {
      localResourceRoots.push(folder.uri);
    });
  }
  const panel: vscode.WebviewPanel =
    openAsyncapiFiles[uri.fsPath] ||
    vscode.window.createWebviewPanel('asyncapi-preview', '', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots,
    });

  panel.title = basename(uri.fsPath);

  const resolved = await resolveDocument(context, uri, resolver, logger);
  panel.webview.html = resolved.error
    ? getErrorWebviewContent(basename(uri.fsPath), resolved.error)
    : getWebviewContent(context, panel.webview, uri, position, resolved.document);

  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.type) {
        case 'position':{
          // Coerced because this value is interpolated back into the webview script.
          position = {
            x: toFiniteNumber(message.scrollX),
            y: toFiniteNumber(message.scrollY)
          };

        }
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    delete openAsyncapiFiles[uri.fsPath];
    delete openAsyncapiUris[uri.fsPath];
  });
  openAsyncapiFiles[uri.fsPath] = panel;
  openAsyncapiUris[uri.fsPath] = uri;
}

/**
 * Resolves remote references in the extension host. When the document has none, the
 * webview keeps loading the file by URL exactly as before.
 */
async function resolveDocument(
  context: vscode.ExtensionContext,
  uri: vscode.Uri,
  resolver: DocumentResolver,
  logger: Logger
): Promise<{ document?: string; error?: string }> {
  const config = getConfig(uri);
  if (!shouldResolveInHost(config)) {
    return {};
  }

  warnPlaintextCredentials(context, config, logger);

  try {
    const textDocument = await vscode.workspace.openTextDocument(uri);
    const document = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'AsyncAPI: resolving references' },
      () => resolver.resolve(uri, textDocument.getText(), config)
    );

    return { document };
  } catch (e) {
    const message = sanitizeText(e instanceof Error ? e.message : String(e));
    logger.failure(`Failed to resolve references of ${uri.toString(true)}: ${message}`, e);

    return { error: message };
  }
}

export async function promptForAsyncapiFile() {
  if (isAsyncAPIFile(vscode.window.activeTextEditor?.document)) {
    return vscode.window.activeTextEditor?.document.uri;
  }
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Open AsyncAPI file',
    filters: {
      asyncAPI: ['yml', 'yaml', 'json'],
    },
  });
  return uris?.[0];
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  asyncapiFile: vscode.Uri,
  position: ScrollPosition,
  resolvedDocument?: string
) {
  const asyncapiComponentJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
  );
  const asyncapiComponentCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css')
  );
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character

  // Documents with remote references are resolved by the extension host and inlined
  // here, so the webview never performs an authenticated request itself.
  const schema = resolvedDocument
    ? toScriptLiteral(resolvedDocument)
    : `{ url: ${toScriptLiteral(asyncapiWebviewUri.toString())}, options: { method: "GET", mode: "cors" } }`;

  // Without a CSP, any markup that slipped through the renderer's sanitizer could run
  // script in the webview, and from there read everything under localResourceRoots and
  // POST it anywhere. The nonce means injected markup and inline event handlers never
  // execute. Bundled documents need only VS Code resources; leftover HTTP(S) $refs
  // inside workspace files stay blocked so they cannot bypass host auth and pinning.
  // Browser-resolved documents still need HTTP(S), subject to CORS.
  // 'unsafe-eval' is required because the AsyncAPI parser compiles JSON Schema
  // validators with `new Function`; it grants nothing to an attacker who cannot already
  // execute script.
  const nonce = createNonce();
  const csp = [
    `default-src 'none'`,
    `script-src 'nonce-${nonce}' 'unsafe-eval'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `img-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource} data:`,
    `connect-src ${webview.cspSource}${resolvedDocument ? '' : ' http: https:'}`,
  ].join('; ');

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="Content-Security-Policy" content="${csp}">
      <link rel="stylesheet" href="${asyncapiComponentCss}">
      <style>
      html{
        scroll-behavior: smooth;
      }
      body {
        color: #121212;
        background-color: #fff;
        word-wrap: break-word;
      }
      h1 {
        color: #121212;
      }
      </style>
    </head>
    <body x-timestamp="${Date.now()}">

      <div id="asyncapi"></div>

      <script nonce="${nonce}" src="${asyncapiComponentJs}"></script>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        AsyncApiStandalone.render({
          schema: ${schema},
          config: {
            show: {
              sidebar: true,
              errors: true,
            },
            parserOptions: { source: ${toScriptLiteral(asyncapiBasePath)} }
          },
        }, document.getElementById('asyncapi'));

        window.addEventListener('scrollend', event => {
                vscode.postMessage({
                  type: 'position',
                  scrollX: window.scrollX || 0,
                  scrollY: window.scrollY || 0
                });
        });

        window.addEventListener("load", (event) => {
          setTimeout(()=>{window.scrollBy(${position.x},${position.y})},1000)
        });

      </script>

    </body>
  </html>
    `;
  return html;
}

function getErrorWebviewContent(title: string, message: string) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
      body {
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
        padding: 1rem 1.5rem;
      }
      pre {
        background-color: var(--vscode-textCodeBlock-background);
        border-radius: 4px;
        padding: 1rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
      </style>
    </head>
    <body>
      <h2>Could not resolve ${escapeHtml(title)}</h2>
      <pre>${escapeHtml(message)}</pre>
      <p>See the <em>AsyncAPI Preview</em> output channel for details. Named secrets are stored with
      <strong>AsyncAPI: Set Secret</strong> and referenced from settings as
      <code>passwordSecret</code> or <code>bearerTokenSecret</code>.</p>
    </body>
  </html>
  `;
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function createNonce(): string {
  const random = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (random) {
    return Array.from(random(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  let nonce = '';
  while (nonce.length < 32) {
    nonce += Math.floor(Math.random() * 0xffffffff).toString(16);
  }

  return nonce.slice(0, 32);
}

// `<` closes the inline script and U+2028/U+2029 are line terminators in JavaScript,
// built from char codes so the source itself stays free of raw separators.
const UNSAFE_SCRIPT_CHARS = new RegExp('[<' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');

/** Safely embeds a string inside an inline `<script>` block. */
function toScriptLiteral(value: string): string {
  return JSON.stringify(value).replace(UNSAFE_SCRIPT_CHARS, char => {
    return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
