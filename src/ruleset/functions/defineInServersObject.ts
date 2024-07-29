import * as vscode from 'vscode';

export default function defineInServersObject(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();

    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const selection = new vscode.Selection(start, end);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.selections = [selection];
    }
    const selectedText = document.getText(new vscode.Range(start, end));
    const lines = documentContent.split('\n');
    const splitText = selectedText.split('url: ');
    if (splitText) {
        splitText[splitText.length - 1] = deletionHelper(splitText[splitText.length - 1]);
        const newText = splitText.join('url: ');
        lines[range.start.line] = newText;
    }
    console.log("Selected text: \n", selectedText, range.start.line, range.end.line);
    console.log(selectedText.split(' '));
    return lines.join('\n');
}