import * as vscode from 'vscode';
import { DocumentResolver } from './DocumentResolver';
import { Logger } from './logger';
import { isAsyncAPIFile, openAsyncAPI, openAsyncapiFiles, previewAsyncAPI, reloadOpenPreviews } from './PreviewWebPanel';
import { asyncapiSmartPaste } from './SmartPasteCommand';


export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "asyncapi-preview" is now active!');

  const output = vscode.window.createOutputChannel('AsyncAPI Preview');
  const logger = new Logger(output);
  const resolver = new DocumentResolver(context, logger);
  context.subscriptions.push(output);

  // sets context to show "AsyncAPI Preview" button on Editor Title Bar
  function setAsyncAPIPreviewContext(document: vscode.TextDocument) {
    const isAsyncAPI = isAsyncAPIFile(document);
    console.log('Setting context for asyncapi.isAsyncAPI', isAsyncAPI, document.uri.fsPath);
    vscode.commands.executeCommand('setContext', 'asyncapi.isAsyncAPI', isAsyncAPI);
  }

  function refreshOpenPreviews() {
    void reloadOpenPreviews(context, resolver, logger);
  }

  function canManageSecrets(): boolean {
    if (vscode.workspace.isTrusted) {
      return true;
    }
    void vscode.window.showWarningMessage('AsyncAPI secret access requires a trusted workspace.');
    return false;
  }

  context.subscriptions.push(vscode.workspace.onDidGrantWorkspaceTrust(() => {
    resolver.clear();
    refreshOpenPreviews();
  }));

  if (vscode.window.activeTextEditor?.document) {
    setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
  }

  vscode.window.onDidChangeActiveTextEditor(e => {
    if (e?.document) {
      setAsyncAPIPreviewContext(e.document);
    }
  });

  vscode.workspace.onDidSaveTextDocument(async document => {
    if (openAsyncapiFiles[document.uri.fsPath]) {
      console.log('Reloading asyncapi file', document.uri.fsPath);
      await openAsyncAPI(context, document.uri, resolver, logger);
    }
    if (vscode.window.activeTextEditor?.document) {
      setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
    }

  });

  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('asyncapi')) {
      resolver.clear();
      refreshOpenPreviews();
    }
  });


  context.subscriptions.push(vscode.commands.registerCommand('asyncapi.preview', previewAsyncAPI(context, resolver, logger)));

  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.paste", asyncapiSmartPaste));

  context.subscriptions.push(
    vscode.commands.registerCommand('asyncapi.clearRemoteCache', () => {
      resolver.clear();
      refreshOpenPreviews();
    }),
    vscode.commands.registerCommand('asyncapi.setSecret', async () => {
      if (!canManageSecrets()) {
        return;
      }
      const key = await vscode.window.showInputBox({
        title: 'AsyncAPI secret key',
        prompt: 'Name used by the passwordSecret or bearerTokenSecret settings',
        ignoreFocusOut: true,
      });

      if (!key) {
        return;
      }

      const value = await vscode.window.showInputBox({
        title: `Set AsyncAPI secret: ${key}`,
        password: true,
        ignoreFocusOut: true,
      });

      if (value !== undefined) {
        if (!canManageSecrets()) {
          return;
        }
        await context.secrets.store(key, value);
        resolver.clear();
        refreshOpenPreviews();
      }
    }),
    vscode.commands.registerCommand('asyncapi.deleteSecret', async () => {
      if (!canManageSecrets()) {
        return;
      }
      const key = await vscode.window.showInputBox({
        title: 'Delete AsyncAPI secret',
        prompt: 'Secret key to delete',
        ignoreFocusOut: true,
      });

      if (key) {
        if (!canManageSecrets()) {
          return;
        }
        await context.secrets.delete(key);
        resolver.clear();
        refreshOpenPreviews();
      }
    })
  );
}

export function deactivate() {}
