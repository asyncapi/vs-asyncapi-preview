import * as vscode from 'vscode';

function getLeadingSpaces(target: string): string {
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

export default async function addDescription(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
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
        const description = await vscode.window.showInputBox({
            prompt: `Enter description`,
            validateInput: (value: string) => {
                if (!value) {
                    return `Description cannot be empty`;
                }
                return null;
            }
        });
        const newText = `description: ${description}`;
        // Add operation
        let tabSize = 0;
        if (editor) {
            tabSize = editor.options.tabSize as number;
        }
        if (description) {
            lines.splice(range.start.line + 1, 0, getLeadingSpaces(lines[range.start.line]) + ' '.repeat(tabSize) + newText);
        }

    } catch (error) {
        console.error("Failed to show input box.", error);
    }
    return lines.join('\n');
}