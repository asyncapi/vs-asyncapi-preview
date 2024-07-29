import * as vscode from 'vscode';

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
    console.log("Selected text: \n", selectedText, range.start.line, range.end.line);
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
        const newText = `description: ${description}`
        // Add operation
        let tabSize = 0;
        if (editor) {
            tabSize = editor.options.tabSize as number;
        }
        console.log(`tabSize is ${tabSize}`);
        lines.splice(range.start.line + 1, 0, getLeadingSpaces(lines[range.start.line]) + ' '.repeat(tabSize) + newText);

        return lines.join('\n');
    } catch (error) {
        console.error("Failed to show input box.", error);
    }
}