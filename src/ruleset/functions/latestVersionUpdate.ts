import * as vscode from 'vscode';
import { latestVersion } from '../../AutoFixProvider';

export default function latestVersionUpdate(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    const start = new vscode.Position(range.start.line, 0);
    const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
    const lines = documentContent.split('\n');
    try {
        lines[start.line] = `asyncapi: ${latestVersion}`;
    } catch (error) {
        console.error("Failed to update latest version", error);
    }

    return lines.join('\n');
}