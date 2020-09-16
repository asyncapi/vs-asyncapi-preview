import * as vscode from 'vscode';
import * as path from 'path';

export class Preview implements vscode.TextDocumentContentProvider {
  uri: vscode.Uri;
  disposable: vscode.Disposable = null;

  onDidChange?: vscode.Event<vscode.Uri>;

  constructor(private previewUrl: string, private filename: string) {
    const showFullFilePath: boolean = !!vscode.workspace.getConfiguration('asyncapiPreview').showFullFilePath;
    const previewPanel = vscode.window.createWebviewPanel(
      'asyncapiPreview',
      `AsyncAPI - ${showFullFilePath ? this.filename : path.basename(this.filename)}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    previewPanel.webview.html = this.provideTextDocumentContent();
  }

  provideTextDocumentContent(): string {
    return `<html>
            <body style="margin:0px;padding:0px;overflow:hidden">
                <div style="position:fixed;height:100%;width:100%;">
                <iframe src="${this.previewUrl}" frameborder="0" style="overflow:hidden;height:100%;width:100%" height="100%" width="100%"></iframe>
                </div>
            </body>
        </html>`;
  }
}
