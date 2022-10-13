import * as vscode from 'vscode';
import * as yml from 'js-yaml';
import { createSchema } from './lib/genson-js/schema-builder';

export async function asyncapiSmartPaste() {
    let editor = vscode.window.activeTextEditor;
    if(!editor) {
        return;
    }
    let start = editor.selection.start;
    let end = editor.selection.end;
    let selectedText = editor.document.getText(editor.selection);
    let currentLineText = editor.document.lineAt(start.line).text;
    let clipboad = await vscode.env.clipboard.readText();

    console.log("Smart Pasting", clipboad);
    const json = parse(clipboad);
    if(typeof json === 'object') {
        const schema = { PastedSchema: createSchema(json) };
        replace(editor, stringify(schema, editor.document.languageId, 4), editor.selection);
        return;
    }


    return vscode.commands.executeCommand('editor.action.clipboardPasteAction');
}

function insertNewLine(editor: vscode.TextEditor, text: string, line: number) {
    editor.edit((editBuilder: vscode.TextEditorEdit) => {
        editBuilder.insert(new vscode.Position(line + 1, 0), text + '\n');
    });
}

function replace(editor: vscode.TextEditor, text: string, selection: vscode.Selection) {
    editor.edit((editBuilder: vscode.TextEditorEdit) => {
        editBuilder.replace(selection, text);
        editor.revealRange(new vscode.Range(selection.start, selection.start));
    });
}

function parse(text: string) {
    try {
        return JSON.parse(text);
    } catch (e) {
        try {
            return yml.load(text);
        } catch (e) {
            return text;
        }
    }
}

function stringify(schema, languageId: string, indentYml: number) {
    if(languageId === 'json') {
        return JSON.stringify(schema, null, 2);
    } else {
        return yml.dump(schema).replace(/^(?!\s*$)/gm, ' '.repeat(indentYml));
    }
}