import * as vscode from 'vscode';
import * as YAML from 'js-yaml';
import { Preview } from './Preview';
import { PreviewServer } from './PreviewServer';
import * as AsyncapiSchema_2_0_0 from './schemas/asyncapi-2.0.0.json';

const ASYNCAPI_SCHEMA = JSON.stringify(AsyncapiSchema_2_0_0);

const previewServer: PreviewServer = new PreviewServer();
let statusBarItem: vscode.StatusBarItem = null;

export async function activate(context: vscode.ExtensionContext) {
  const redhatExtension = vscode.extensions.getExtension('redhat.vscode-yaml');
  !redhatExtension.isActive || (await redhatExtension.activate());

  try {
    redhatExtension.exports.registerContributor(
      'asyncapipreview',
      uri => {
        for (let document of vscode.workspace.textDocuments) {
          if (document.uri.toString() === uri) {
            const parsedYAML = YAML.safeLoad(document.getText()) as any;
            if (parsedYAML && parsedYAML.asyncnapi) {
              return 'asyncapi:preview';
            }
          }
        }
        return null;
      },
      uri => (uri === 'asyncapi:preview' ? ASYNCAPI_SCHEMA : null)
    );
  } catch (ex) {}

  let disposable = vscode.commands.registerCommand('asyncapi.preview', uri => {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Starting Asyncapi Preview',
      },
      async (progress, token) => {
        progress.report({ increment: 0 });
        previewServer.startServer();
        progress.report({ increment: 50 });
        const fileName = uri ? uri.fsPath : vscode.window.activeTextEditor.document.fileName;
        previewServer.update(fileName);
        progress.report({ increment: 70 });
        const previewInBrowser: boolean = !!vscode.workspace.getConfiguration('asyncapiPreview').previewInBrowser;
        if (previewInBrowser) {
          vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(previewServer.getUrl(fileName)));
        } else {
          let inlinePreview = new Preview(previewServer.getUrl(fileName), fileName);
          context.subscriptions.push(inlinePreview.disposable);
        }

        progress.report({ increment: 90 });

        return new Promise<void>(resolve => {
          const intervalRef = setInterval(() => {
            if (previewServer.isServerRunning()) {
              clearInterval(intervalRef);
              resolve();
              if (!statusBarItem) {
                statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
                statusBarItem.command = 'asyncapi.stop';
                statusBarItem.text = 'AsyncAPI Preview';
                statusBarItem.tooltip = 'Stop AsyncAPI Preview Server';
                statusBarItem.show();
                context.subscriptions.push(statusBarItem);
              }
            }
          }, 1000);
        });
      }
    );
  });
  vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
    if (e.document === vscode.window.activeTextEditor.document) {
      previewServer.update(e.document.fileName, e.document.getText());
    }
  });
  context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode.commands.registerCommand('asyncapi.stop', () => {
      previewServer.stop();
      if (statusBarItem) {
        statusBarItem.hide();
        statusBarItem.dispose();
        statusBarItem = null;
      }
    })
  );
}

export function deactivate() {
  if (previewServer) previewServer.stop();
}
