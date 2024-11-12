import * as vscode from 'vscode';

export default async function updateURL(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
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
    try {
        const paramName = await vscode.window.showInputBox({
            prompt: 'Enter the new URL',
            validateInput: (value: string) => {
                if (!value) {
                    return 'URL cannot be empty';
                }
                if (/\{\}/.test(value)) {
                    return 'URL cannot have empty variables.';
                }
                if (/ |\t/.test(value)) {
                    return 'URL cannot have whitespace characters.';
                }
                return null;
            }
        });
        const newText = selectedText.replace(/: .*/g, `: ${paramName ? paramName : ''}`);
        lines[range.start.line] = paramName ? newText : selectedText;
        return lines.join('\n');
    } catch (error) {
        console.error("Failed to show input box.", error);
    }
}