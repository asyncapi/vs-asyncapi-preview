import * as vscode from 'vscode';

// In order to delete the repeated tags and relavant content, we need to find the collapse range for the tag
export default async function deleteRepeatedTags(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();

    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const selection = new vscode.Selection(start, end);
    const editor = vscode.window.activeTextEditor;
    const lines = documentContent.split('\n');
    if (start.line === end.line) {
        lines.splice(range.start.line, 1);
    }
    else {
        const foldingRanges = await vscode.commands.executeCommand<vscode.FoldingRange[]>('vscode.executeFoldingRangeProvider', document.uri);
        let rangeEnd = null;
        if (editor) {
            editor.selections = [selection];
        }
        if (foldingRanges) {
            for (const range of foldingRanges) {
                console.log("Range: ", range);
                if (range.start === start.line) {
                    rangeEnd = range.end;
                }
            }
        }

        if (rangeEnd) {
            try {
                if (range.start.line > -1) {
                    lines.splice(range.start.line, rangeEnd - range.start.line + 1);
                }
                return lines.join('\n');
            } catch (error) {
                console.error("Failed to delete the tag.", error);
            }

        }
    }
    return lines.join('\n');
}