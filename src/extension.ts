import * as vscode from 'vscode';
import { isAsyncAPIFile, openAsyncAPI, openAsyncapiFiles, previewAsyncAPI} from './PreviewWebPanel';
import { openAsyncAPIMarkdown, openAsyncapiMdFiles, previewMarkdown} from './PreviewMarkdown';
import { asyncapiSmartPaste } from './SmartPasteCommand';


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
    if(openAsyncapiMdFiles[document.uri.fsPath]){
      openAsyncAPIMarkdown(context, document.uri);
    }
    if (vscode.window.activeTextEditor?.document) {
      setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
    }
  });


  context.subscriptions.push(vscode.commands.registerCommand('asyncapi.preview', previewAsyncAPI(context)));

  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.paste", asyncapiSmartPaste));

  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.markdown", previewMarkdown(context)));
}

export function deactivate() {}
