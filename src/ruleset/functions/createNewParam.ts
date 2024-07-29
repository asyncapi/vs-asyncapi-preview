import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';
import { nextTick } from 'process';

export default async function createNewParam(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();

    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const selection = new vscode.Selection(start, end);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.selections = [selection];
    }
    const selectedText = document.getText(new vscode.Range(start, start));
    const lines = documentContent.split('\n');
    try {
        const paramName = await vscode.window.showInputBox({
            prompt: 'Enter the name for the new parameter',
            validateInput: (value: string) => {
                if (!value) {
                    return 'Parameter name cannot be empty';
                }
                return null;
            }
        });
        const newText = lines[range.start.line].replace(/{}/g, `{${paramName ? paramName : ''}}`);
        console.log("selected text: ", selectedText);
        console.log("newText: ", newText);
        lines[range.start.line] = paramName ? newText : lines[range.start.line];
        return lines.join('\n');
    } catch (error) {
        console.error("Failed to show input box.", error);
    }
}