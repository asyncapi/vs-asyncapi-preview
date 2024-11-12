import * as vscode from 'vscode';

export default async function deleteID(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();

    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const selection = new vscode.Selection(start, end);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.selections = [selection];
    }
    const lines = documentContent.split('\n');
    try {
        if (range.start.line > -1) {
            lines.splice(range.start.line, 1);
        }
        return lines.join('\n');
    } catch (error) {
        console.error("Failed to delete ID.", error);
    }
}