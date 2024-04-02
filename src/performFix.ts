import * as vscode from 'vscode';

interface CustomCodeAction extends vscode.CodeAction {
    [key: string]: any;
}

export default function performFix(document: vscode.TextDocument, range: vscode.Range, fixName: string, quickFixObj: string): vscode.CodeAction {
    const fix: CustomCodeAction = new vscode.CodeAction(
        fixName,
        vscode.CodeActionKind.QuickFix
    );
    fix.edit = new vscode.WorkspaceEdit();
    try {
        const fullDocRange = new vscode.Range(document.positionAt(0), document.lineAt(document.lineCount - 1).range.end);
        const edit = vscode.TextEdit.replace(fullDocRange, quickFixObj);
        fix.edit.set(document.uri, [edit]);
    } catch (error) {
        console.error("Failed to parse document content as YAML", error);
    }

    return fix;
}