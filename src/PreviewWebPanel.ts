import * as vscode from 'vscode';
import * as path from 'path';

export function previewAsyncAPI(context) {
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
  panel.webview.html = getWebviewContent(context, panel.webview, uri);

  panel.onDidDispose(() => {
    delete openAsyncapiFiles[uri.fsPath];
  });
  openAsyncapiFiles[uri.fsPath] = panel;
}

async function promptForAsyncapiFile() {
  if (isAsyncAPIFile(vscode.window.activeTextEditor?.document)) {
    return vscode.window.activeTextEditor?.document.uri;
  }
  return await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Open AsyncAPI file',
    filters: {
      AsyncAPI: ['yml', 'yaml', 'json'],
    },
  });
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri) {
  const asyncapiComponentJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
  );
  const asyncapiComponentCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css')
  );
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="${asyncapiComponentCss}">
    </head>
    <body x-timestamp="${Date.now()}">
      
      <div id="asyncapi"></div>
  
      <script src="${asyncapiComponentJs}"></script>
      <script>
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
      </script>
  
    </body>
  </html>
    `;
  return html;
}
