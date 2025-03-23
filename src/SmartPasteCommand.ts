import * as vscode from 'vscode';
import * as yml from 'js-yaml';
import { createSchema } from 'genson-js';
import { Logger } from './utils/Logger';

// Initialize logger
const logger = new Logger('asyncapi-smartpaste');

export async function asyncapiSmartPaste() {
    let editor = vscode.window.activeTextEditor;
    if(!editor) {
        logger.info('No active editor, aborting smart paste');
        return;
    }
    
    let start = editor.selection.start;
    let end = editor.selection.end;
    let selectedText = editor.document.getText(editor.selection);
    let currentLineText = editor.document.lineAt(start.line).text;
    
    logger.debug('Reading from clipboard');
    let clipboad = await vscode.env.clipboard.readText();

    const json = parse(clipboad);
    if(typeof json === 'object') {
        logger.info('Creating schema from clipboard JSON content');
        const schema = { PastedSchema: createSchema(json) };
        replace(editor, stringify(schema, editor.document.languageId, 4), editor.selection);
        return;
    }

    logger.debug('Clipboard content is not valid JSON/YAML, performing regular paste');
    return vscode.commands.executeCommand('editor.action.clipboardPasteAction');
}

function insertNewLine(editor: vscode.TextEditor, text: string, line: number) {
    logger.debug(`Inserting new line at position ${line + 1}`);
    editor.edit((editBuilder: vscode.TextEditorEdit) => {
        editBuilder.insert(new vscode.Position(line + 1, 0), text + '\n');
    });
}

function replace(editor: vscode.TextEditor, text: string, selection: vscode.Selection) {
    logger.debug(`Replacing selection with generated schema`);
    editor.edit((editBuilder: vscode.TextEditorEdit) => {
        editBuilder.replace(selection, text);
        editor.revealRange(new vscode.Range(selection.start, selection.start));
    });
}

function parse(text: string): any {
    try {
        logger.debug('Attempting to parse as JSON');
        return JSON.parse(text);
    } catch (e) {
        try {
            logger.debug('JSON parse failed, attempting YAML parse');
            return yml.load(text);
        } catch (e) {
            logger.debug('YAML parse failed, returning text as is');
            return text;
        }
    }
}

function stringify(schema: object, languageId: string, indentYml: number): string {
    if(languageId === 'json') {
        logger.debug('Stringifying as JSON');
        return JSON.stringify(schema, null, 2);
    } else {
        logger.debug('Stringifying as YAML');
        return yml.dump(schema).replace(/^(?!\s*$)/gm, ' '.repeat(indentYml));
    }
}