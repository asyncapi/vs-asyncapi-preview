import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Parser, fromFile } from '@asyncapi/parser';
import { validateAsyncAPISchema } from './validateAgainstSchema';

let position : {x:0,y:0} = {
  x: 0,
  y: 0
};

(async () => {
  try {
    // ✅ 1. Run custom AJV-based validator
    validateSchema(uri);

    // ✅ 2. Run asyncapi-parser diagnostics (optional — you're already doing this)
    const parser = new Parser();
    const { diagnostics } = await fromFile(parser, uri.fsPath).parse();
    const errors = diagnostics.filter(d => d.severity === 0);
    if (errors.length > 0) {
      const top = errors[0];
      vscode.window.showWarningMessage(`AsyncAPI validation issue: ${top.message} (at ${top.path.join('.')})`);
    }
  } catch (e) {
    console.warn('Parsing failed, skipping diagnostics warning:', e);
  }

  panel.webview.html = getWebviewContent(context, panel.webview, uri, position);
})();

export function previewAsyncAPI(context: vscode.ExtensionContext) {
 return async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
    if (uri) {
      console.log('Opening asyncapi file', uri.fsPath);
      openAsyncAPI(context, uri);
    }
  };
}

export const openAsyncapiFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel

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

export function openAsyncAPI(context: vscode.ExtensionContext, uri: vscode.Uri) {
  const localResourceRoots = [
    vscode.Uri.file(path.dirname(uri.fsPath)),
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

  panel.title = path.basename(uri.fsPath);

  (async () => {
    try {
      const parser = new Parser();
      const { diagnostics } = await fromFile(parser, uri.fsPath).parse();
      const errors = diagnostics.filter(d => d.severity === 0); // 0 = error
      if (errors.length > 0) {
        const top = errors[0];
        vscode.window.showWarningMessage(`AsyncAPI validation issue: ${top.message} (at ${top.path.join('.')})`);
      }
    } catch (e) {
      console.warn('Parsing failed, skipping diagnostics warning:', e);
    }

    panel.webview.html = getWebviewContent(context, panel.webview, uri, position);
  })();

  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.type) {
        case 'position': {
          position = {
            x: message.scrollX,
            y: message.scrollY,
          };
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    delete openAsyncapiFiles[uri.fsPath];
  });

  openAsyncapiFiles[uri.fsPath] = panel;
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

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, position: {x:0,y:0}) {
  const asyncapiComponentJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
  );
  const asyncapiComponentCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css')
  );
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character
  const asyncapiContent = fs.readFileSync(asyncapiFile.fsPath, 'utf-8');

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
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
  
      <script src="${asyncapiComponentJs}"></script>
      <script>
        const vscode = acquireVsCodeApi();
        AsyncApiStandalone.render({
          schema:  {
            url: '${asyncapiWebviewUri}',
            options: { method: "GET", mode: "cors" },
          },
          config: {
            show: {
              sidebar: true,
              errors: true,
            },
            parserOptions: { path: '${asyncapiBasePath}' }
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
          setTimeout(()=>{window.scrollBy('${position.x}','${position.y}')},1000)
        });
        
      </script>
  
    </body>
  </html>
    `;
  return html;
}

function validateSchema(uri: any) {
  throw new Error('Function not implemented.');
}
