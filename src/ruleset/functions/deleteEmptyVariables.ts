import * as vscode from 'vscode';

const emptyCurlyBracesPattern = /\{\}/g;
const extraDotsPattern = /\.\./g;
const trailingSlashesPattern = /\/\//g;

function deletionHelper(target: string) {
    // Replace nested empty curly braces until none are left
    while (emptyCurlyBracesPattern.test(target)) {
        target = target.replace(emptyCurlyBracesPattern, '');
    }
    // Replace extra dots until only one are left
    while (extraDotsPattern.test(target)) {
        target = target.replace(extraDotsPattern, '.');
    }
    // Replace extra slashes until none
    while (trailingSlashesPattern.test(target)) {
        target = target.replace(trailingSlashesPattern, '/');
    }
    target = target.replace(/\.$/g, '');
    target = target.replace(/^\./g, '');
    target = target.replace(/^\{/g, '/{');
    target = target.replace(/\/+$/, '');
    target = target.replace(/\.+$/g, '');

    return target;
}

export default function deleteEmptyVariables(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
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
    const splitText = selectedText.split(':');
    if (splitText) {
        let removeLeadingSpaceStr = splitText[splitText.length - 1].trimStart();
        splitText[splitText.length - 1] = ' '.repeat(splitText[splitText.length - 1].length - removeLeadingSpaceStr.length) + deletionHelper(removeLeadingSpaceStr);
        const newText = splitText.join(':');
        lines[range.start.line] = newText;
    }
    return lines.join('\n');
}