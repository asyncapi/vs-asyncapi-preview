import * as vscode from 'vscode';
import * as path from 'path';

const openAsyncapiFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "asyncapi-preview" is now active!');

  // sets context to show "AsyncAPI Preview" button on Editor Title Bar
  function setAsyncAPIPreviewContext(document: vscode.TextDocument) {
    const isAsyncAPI = (document.languageId === 'yml' || document.languageId === 'yaml') && isAsyncAPIFile(document.getText());
    console.log('Setting context for asyncapi.isAsyncAPI', isAsyncAPI, document.uri.fsPath);
    vscode.commands.executeCommand('setContext', 'asyncapi.isAsyncAPI', isAsyncAPI);
  }

  if (vscode.window.activeTextEditor?.document) {
    setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
  }

  vscode.window.onDidChangeActiveTextEditor(e => {
    if (e?.document) {
      setAsyncAPIPreviewContext(e.document);
    }
  });

  vscode.workspace.onDidSaveTextDocument(document => {
    if (openAsyncapiFiles[document.uri.fsPath]) {
      console.log('Reloading asyncapi file', document.uri.fsPath);
      openAsyncAPI(context, document.uri);
    }
  });

  let disposable = vscode.commands.registerCommand('asyncapi.preview', async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile());
    if (uri) {
      console.log('Opening asyncapi file', uri.fsPath);
      openAsyncAPI(context, uri);
    }
  });

  context.subscriptions.push(disposable);
}

function isAsyncAPIFile(text: string) {
  return text.includes('asyncapi:');
}

function openAsyncAPI(context: vscode.ExtensionContext, uri: vscode.Uri) {
  const panel: vscode.WebviewPanel =
    openAsyncapiFiles[uri.fsPath] ||
    vscode.window.createWebviewPanel('asyncapi-preview', '', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.dirname(uri.fsPath)),
        vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone'),
        vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles'),
      ],
    });
  panel.title = path.basename(uri.fsPath);
  panel.webview.html = getWebviewContent(context, panel.webview, uri);

  panel.onDidDispose(() => {
    delete openAsyncapiFiles[uri.fsPath];
  });
  openAsyncapiFiles[uri.fsPath] = panel;
}

async function promptForAsyncapiFile() {
  if (isAsyncAPIFile(vscode.window.activeTextEditor?.document.getText() || '')) {
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
  const asyncapiWebComponentJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
  );
  const asyncapiWebComponentCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.css')
  );
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="${asyncapiWebComponentCss}">
  </head>
  <body x-timestamp="${Date.now()}">
    
    <div id="asyncapi"></div>

    <script src="${asyncapiWebComponentJs}"></script>
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

export function deactivate() {}
