import * as vscode from 'vscode';

const emptyCurlyBracesPattern = /\{\}/g;

function deletionHelper(target: string) {
    target = target.replace(emptyCurlyBracesPattern, '');
    target = target.replace(/\/+/g, '/');
    target = target.replace(/\/+$/, '');
    target = target.replace(/\/+(.)$/, '$1');
    target = target.replace(/^\/+/, '');

    return target;
}

export default function deleteEmptyParam(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    const start = new vscode.Position(range.start.line, 0);
    const lines = documentContent.split('\n');
    if (start.line !== -1) {
        lines[start.line] = deletionHelper(lines[start.line]);
    }

    return lines.join('\n');
}