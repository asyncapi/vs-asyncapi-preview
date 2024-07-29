import * as vscode from 'vscode';
import { isAsyncAPIFile, openAsyncAPI, openAsyncapiFiles, previewAsyncAPI } from './PreviewWebPanel';
import { asyncapiSmartPaste } from './SmartPasteCommand';
import { autoFixProvider, FixFunction } from './AutoFixProvider';
import performFix from './performFix';


export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "asyncapi-preview" is now active!');

  // sets context to show "AsyncAPI Preview" button on Editor Title Bar
  function setAsyncAPIPreviewContext(document: vscode.TextDocument) {
    const isAsyncAPI = isAsyncAPIFile(document);
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
    if (vscode.window.activeTextEditor?.document) {
      setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
    }
  });


  context.subscriptions.push(vscode.commands.registerCommand('asyncapi.preview', previewAsyncAPI(context)));

  // Register autofix provider and commands
  console.log("AutofixProvider Initiated!");
  const codeActionProvider = new autoFixProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'yaml' }, codeActionProvider)
  );

  context.subscriptions.push(vscode.commands.registerCommand('extension.applyFix', async (document: vscode.TextDocument, range: vscode.Range, fixFunction: FixFunction, given: string, field: string) => {
    const quickFixObj = await fixFunction(document, range, given, field);
    console.log('QuickFixObj received: ', quickFixObj);
    // Apply the quick fix using the performFix method
    const fixAction = performFix(document, range, fixFunction.name, quickFixObj);
    if (fixAction.edit) {
      const edit = new vscode.WorkspaceEdit();
      fixAction.edit.entries().forEach(([uri, textEdits]) => {
        edit.set(uri, textEdits);
      });

      const disposable = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.uri.toString() === document.uri.toString()) {
          console.log('CodeAction applied:', fixAction.title);
          disposable.dispose(); // Remove the event listener after the change is detected
        }
      });
      await vscode.workspace.applyEdit(edit);
    }
  }));


  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.paste", asyncapiSmartPaste));
}

export function deactivate() { }
