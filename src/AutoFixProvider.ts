import * as vscode from 'vscode';
import * as path from 'path';
import ruleset from "./ruleset/asyncapi-rules";

let latestVersion: string | undefined;

export interface FixFunction {
    (document: vscode.TextDocument, range: vscode.Range, given: string, field: string): string | undefined | Promise<string | undefined>;
}



interface FixObject {
    name: string;
    given: string | string[];
    field: string;
    function: FixFunction;
}
interface Rule {
    description: string;
    recommended: boolean;
    given: string;
    fix: FixObject | FixObject[];
}

interface RuleSet {
    rules: Record<string, Rule>;
}

class DiagnosticFixProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] | undefined {
        const codeActions: vscode.CodeAction[] = [];
        console.log("Diagnostics activated");
        if (!this.isFileYAML(document.fileName)) {
            return;
        }
        context.diagnostics.forEach(diagnostic => {
            if (diagnostic.message.startsWith("The latest version is not used.")) {
                const versionPattern = /"(\d+\.\d+\.\d+)"/;
                const match = diagnostic.message.match(versionPattern);
                if (match) {
                    latestVersion = match[1];
                }
            }
            const rule = this.getRuleFromDiagnostic(diagnostic);
            if (rule) {
                const fixAction = this.createFixAction(document, diagnostic.range, rule);
                if (fixAction) {
                    codeActions.push(...fixAction);
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
        const code = diagnostic.code ? diagnostic.code.toString() : undefined;

        if (!code) {
            console.error("Diagnostic code is undefined");
            return undefined;
        }

        const rule = ruleset.rules[code as keyof typeof ruleset.rules];

        if (!rule) {
            console.error(`No rule found for code: ${code}`);
        }

        return rule;
    }

    private createFixAction(
        document: vscode.TextDocument,
        range: vscode.Range,
        rule: Rule
    ): vscode.CodeAction[] {
        const { fix } = rule;
        const codeActions: vscode.CodeAction[] = [];

        if (Array.isArray(fix)) {
            fix.forEach(fixItem => {
                const action = new vscode.CodeAction(fixItem.name, vscode.CodeActionKind.QuickFix);
                action.command = {
                    command: 'extension.applyFix',
                    title: fixItem.name,
                    arguments: [document, range, fixItem.function, fixItem.given, fixItem.field]
                };
                codeActions.push(action);
            });
        }
        else {
            const action = new vscode.CodeAction(fix.name, vscode.CodeActionKind.QuickFix);
            action.command = {
                command: 'extension.applyFix',
                title: fix.name,
                arguments: [document, range, fix.function, fix.given, fix.field]
            };
            codeActions.push(action);
        }
        return codeActions;
    }
}

export { DiagnosticFixProvider as autoFixProvider, latestVersion };
