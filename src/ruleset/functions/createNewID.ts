import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';
import { count } from 'console';

function getMessageIDMap(documentContent: string, given: string, field: string) {
    const IDMap = new Set<string>();
    try {
        let jsonObject = yaml.load(documentContent);
        const queryResult = JSONPath({
            path: given, json: jsonObject as any, resultType: 'all'
        });
        for (const result of queryResult) {
            IDMap.add(result.value);
        }
    } catch (error) {
        console.error("Failed to parse document content as YAML", error);
    }
    return IDMap;
}

function getLeadingSpaces(target: string): string {
    console.log("target: ", target);
    let res = '';
    for (const c of target) {
        if (c === ' ') {
            res += ' ';
        } else {
            break;
        }
    }
    return res;
}

export default async function createNewID(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();

    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const selection = new vscode.Selection(start, end);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.selections = [selection];
    }
    const selectedText = document.getText(new vscode.Range(start, end));
    console.log("Selected text: \n", selectedText, range.start.line, range.end.line);
    const lines = documentContent.split('\n');
    const idMap = getMessageIDMap(documentContent, given, field);
    try {
        const paramName = await vscode.window.showInputBox({
            prompt: `Enter a new unique ${field}`,
            validateInput: (value: string) => {
                if (!value) {
                    return `${field} cannot be empty`;
                }
                if (idMap.has(value)) {
                    return `${value} is already existed!`;
                }
                return null;
            }
        });
        const newText = field === 'messageId' ? selectedText.replace(/messageId: \w+/g, `messageId: ${paramName ? paramName : ''}`) : selectedText.replace(/operationId: \w+/g, `operationId: ${paramName ? paramName : ''}`);
        // ID is already existed
        if (range.start.line === range.end.line) {
            lines[range.start.line] = paramName ? newText : selectedText;
        }
        // Add a new operationId
        else {
            let tabSize = 0;
            if (editor) {
                tabSize = editor.options.tabSize as number;
            }
            console.log(`tabSize is ${tabSize}`);
            lines.splice(range.start.line + 1, 0, getLeadingSpaces(lines[range.start.line]) + ' '.repeat(tabSize) + `operationId: ${paramName}`);
        }
        return lines.join('\n');
    } catch (error) {
        console.error("Failed to show input box.", error);
    }
}