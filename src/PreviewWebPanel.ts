import * as vscode from 'vscode';
import * as path from 'path';
import { convertAsyncAPIToMermaid } from './ConvertMD';

let position : {x:0,y:0} = {
  x: 0,
  y: 0
};

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
  console.log('Opening HTML');
  console.log(getWebviewContent(context, panel.webview, uri, position));
  panel.webview.html = getWebviewContent(context, panel.webview, uri, position);

  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.type) {
        case 'position':{
          position = {
            x: message.scrollX,
            y: message.scrollY
          };
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

async function promptForAsyncapiFile() {
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

export function previewMarkdown(context: vscode.ExtensionContext) {
  return "Hello World!";

 }

  async function convertAsyncAPItoMD(context: vscode.ExtensionContext, uri: vscode.Uri) {
    return "Hello World!";

  }
  
function convertToMD(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, position: {x:0,y:0}){
  console.log('Converting to MD');
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  console.log(asyncapiWebviewUri);
  return "Hello";
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, position: {x:0,y:0}) {
  const asyncapiComponentJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
  );
  const asyncapiComponentCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css')
  );
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  const mermaidCode = convertAsyncAPIToMermaid(asyncapiFile.fsPath);
  const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character
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
      <pre class="mermaid">
        ${mermaidCode};
      </pre>
      <script src="${asyncapiComponentJs}"></script>
      <script>
        const vscode = acquireVsCodeApi();
        AsyncApiStandalone.render({
          schema: {
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
      <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    </script>
    </body>
  </html>
    `;
  return html;
}
