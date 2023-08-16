import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { createFix } from './createFix';

interface QuickFixOption {
  message: string;
  errorCheck: string;
  quickfix: {
    text: string;
    type: string;
  };
}

interface QuickFixData {
  [errorCode: string]: QuickFixOption[];
}

export function activate(context: vscode.ExtensionContext) {
  // Register code action provider
  const codeActionProvider = new DiagnosticFixProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider({ scheme: 'file', language: 'yaml' }, codeActionProvider)
  );
}

export class DiagnosticFixProvider implements vscode.CodeActionProvider {
  private quickFixes: QuickFixData = {};

  constructor() {
    // Load quick fixes from external YAML file
    const yamlFilePath = path.join(__dirname, '../src/quickfixes.yaml');
    const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');
    this.quickFixes = yaml.load(yamlContent) as QuickFixData;
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
      const errorCode = diagnostic.code?.toString();
      if (errorCode && this.quickFixes[errorCode]) {
        const options = this.quickFixes[errorCode];
        for (const option of options) {
          if (errorCode === 'asyncapi-schema'){
            if(diagnostic.message.includes(option.errorCheck)) {
              const fix = createFix(document, range, errorCode, option, this.quickFixes);
              if (fix) {
                codeActions.push(fix);
              }
            }
          }else{
            const fix = createFix(document, range, errorCode, option, this.quickFixes);
              if (fix) {
                codeActions.push(fix);
              }
          }
        }
      }
    }

    return codeActions;
  }
}

