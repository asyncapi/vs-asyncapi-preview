import * as vscode from 'vscode';

function deletionHelper(target: string) {
    target = target.replace(/\/+$/, '');
    target = target.replace(/\/+(.)$/, '$1');
    return target;
}

export default function deleteEndingSlash(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const lines = documentContent.split('\n');

    if (start.line !== -1) {
        lines[start.line] = deletionHelper(lines[start.line]);
    }
    return lines.join('\n');
}