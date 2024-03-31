import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import performFix from './performFix';
import ruleset from "./ruleset/asyncapi-rules";

interface Rule {
    description: string;
    recommended: boolean;
    given: string;
    then: {
        field: string;
        function: string;
    };
    fix: {
        field: string;
        function: any; // Replace 'any' with the actual type for the function
    };
}

interface RuleSet {
    rules: {
        [key: string]: Rule;
    };
}

export function activate(context: vscode.ExtensionContext) {
    // Register code action provider
    const codeActionProvider = new DiagnosticFixProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'yaml' }, codeActionProvider)
    );
}

export default class DiagnosticFixProvider implements vscode.CodeActionProvider {

    constructor() {
        // Load quick fixes from external YAML file
        // const yamlFilePath = path.join(__dirname, '../src/quickfixes.yaml');
        // const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');
        // this.quickFixes = yaml.load(yamlContent) as QuickFixData;
    }

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] | undefined {
        const codeActions: vscode.CodeAction[] = [];

        // Check if the file is YAML or YML
        const extension = path.extname(document.fileName);
        if (extension !== '.yaml' && extension !== '.yml') {
            return codeActions;
        }

        for (const diagnostic of context.diagnostics) {
            if ((diagnostic.code as string | number) in ruleset.rules) {
                console.log("Diagnostics: ", diagnostic);
                const code = typeof diagnostic.code === 'number' ? diagnostic.code.toString() : diagnostic.code;
                const rule: Rule = ruleset.rules[code];
                // Perform the fix
                if (rule) {
                    const fix = rule.fix;
                    const fixName = fix.name;
                    // console.log("Fix function: ", fix.function)
                    const quickFixObj = fix.function(document, range, fix.given, fix.field);
                    console.log("Quickfix obj: ", quickFixObj);
                    const action = performFix(document, range, fixName, quickFixObj);
                    console.log("performFix returned");
                    if (action) {
                        console.log("Action added");
                        codeActions.push(action);
                    }
                }


            }
        }

        console.log("code actions: ", codeActions);
        return codeActions;
    }
}

export { DiagnosticFixProvider as autofixProvider };


