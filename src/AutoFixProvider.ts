import * as vscode from 'vscode';
import * as path from 'path';
import performFix from './performFix';
import ruleset from "./ruleset/asyncapi-rules";

interface FixFunction {
    (document: vscode.TextDocument, range: vscode.Range, given: string, field: string): any; // Consider defining a more specific return type than 'any'
}

interface Rule {
    description: string;
    recommended: boolean;
    given: string;
    then: {
        field: string;
        function: string;
    };
    fix: {
        name: string;
        given: string;
        field: string;
        function: FixFunction;
    };
}

interface RuleSet {
    rules: Record<string, Rule>;
}

export function activate(context: vscode.ExtensionContext): void {
    const codeActionProvider = new DiagnosticFixProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: 'yaml' },
            codeActionProvider
        )
    );
}

class DiagnosticFixProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] | undefined {
        const codeActions: vscode.CodeAction[] = [];

        if (!this.isFileYAML(document.fileName)) {
            return;
        }

        context.diagnostics.forEach(diagnostic => {
            const rule = this.getRuleFromDiagnostic(diagnostic);
            if (rule) {
                const fixAction = this.createFixAction(document, range, rule);
                if (fixAction) {
                    codeActions.push(fixAction);
                }
            }
        });

        return codeActions;
    }

    private isFileYAML(fileName: string): boolean {
        const extension = path.extname(fileName).toLowerCase();
        return extension === '.yaml' || extension === '.yml';
    }

    private getRuleFromDiagnostic(diagnostic: vscode.Diagnostic): Rule | undefined {
        const code = typeof diagnostic.code === 'number' ? diagnostic.code.toString() : diagnostic.code;
        return ruleset.rules[code];
    }

    private createFixAction(
        document: vscode.TextDocument,
        range: vscode.Range,
        rule: Rule
    ): vscode.CodeAction | undefined {
        const { fix } = rule;
        const given = fix.given;
        const quickFixObj = fix.function(document, range, given, fix.field);
        return performFix(document, range, fix.name, quickFixObj);
    }
}

export { DiagnosticFixProvider as autoFixProvider };
