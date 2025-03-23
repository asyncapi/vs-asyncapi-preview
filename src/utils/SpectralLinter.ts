import * as vscode from 'vscode';
import { Spectral, ISpectralDiagnostic } from '@stoplight/spectral-core';
import { asyncapi } from '@stoplight/spectral-rulesets';
import * as fs from 'fs/promises';
import { Logger } from './Logger';

/**
 * Result of a linting operation with Spectral
 */
export interface LintingResult {
  diagnostics: vscode.Diagnostic[];
  quickFixes: Map<string, vscode.CodeAction[]>;
}

/**
 * Spectral linter for AsyncAPI documents
 */
export class SpectralLinter {
  private spectral: Spectral;
  private logger: Logger;
  private diagnosticCollection: vscode.DiagnosticCollection;

  /**
   * Creates a new SpectralLinter
   */
  constructor() {
    this.logger = new Logger('asyncapi-linter');
    this.spectral = new Spectral();
    
    // Set up the default AsyncAPI ruleset
    this.spectral.setRuleset({
      extends: [[asyncapi, 'recommended']], // Use the standard asyncapi ruleset with 'recommended' severity
      rules: {}
    });
    
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('asyncapi');
  }

  /**
   * Load custom rules from the workspace configuration
   */
  public async loadCustomRules(): Promise<void> {
    const config = vscode.workspace.getConfiguration('asyncapi');
    const customRulesetPath = config.get<string>('linting.customRulesetPath');
    
    if (customRulesetPath) {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          return;
        }
        
        const rootPath = workspaceFolders[0].uri.fsPath;
        const fullPath = `${rootPath}/${customRulesetPath}`;
        
        this.logger.info(`Loading custom ruleset from: ${fullPath}`);
        const customRulesetContent = await fs.readFile(fullPath, 'utf8');
        
        try {
          const customRuleset = JSON.parse(customRulesetContent);
          this.spectral.setRuleset({
            extends: [[asyncapi, 'recommended']],
            rules: customRuleset.rules || {}
          });
          this.logger.info('Custom ruleset loaded successfully');
        } catch (error: any) {
          this.logger.error(`Error parsing custom ruleset: ${error.message}`);
          throw new Error(`Failed to parse custom ruleset: ${error.message}`);
        }
      } catch (error: any) {
        this.logger.error(`Error loading custom ruleset: ${error.message}`);
        throw new Error(`Failed to load custom ruleset: ${error.message}`);
      }
    }
  }

  /**
   * Lint an AsyncAPI document
   * @param document The document to lint
   * @returns Linting results
   */
  public async lintDocument(document: vscode.TextDocument): Promise<LintingResult> {
    if (!this.isAsyncAPIDocument(document)) {
      return { diagnostics: [], quickFixes: new Map() };
    }
    
    this.logger.debug(`Linting document: ${document.uri.fsPath}`);
    
    try {
      const results = await this.spectral.run(document.getText());
      const diagnostics: vscode.Diagnostic[] = [];
      const quickFixes = new Map<string, vscode.CodeAction[]>();
      
      results.forEach((result: ISpectralDiagnostic) => {
        const range = this.getRange(document, result);
        const diagnostic = new vscode.Diagnostic(
          range,
          result.message,
          this.getSeverity(result.severity)
        );
        
        diagnostic.code = result.code;
        diagnostic.source = 'asyncapi-spectral';
        diagnostics.push(diagnostic);
        
        // Create quick fixes if available
        const fixes = this.createQuickFixes(document, diagnostic, result);
        if (fixes.length > 0) {
          quickFixes.set(this.getDiagnosticKey(diagnostic), fixes);
        }
      });
      
      this.diagnosticCollection.set(document.uri, diagnostics);
      this.logger.info(`Linting complete: ${diagnostics.length} issues found`);
      
      return { diagnostics, quickFixes };
    } catch (error: any) {
      this.logger.error(`Error linting document: ${error.message}`);
      vscode.window.showErrorMessage(`Error linting AsyncAPI document: ${error.message}`);
      return { diagnostics: [], quickFixes: new Map() };
    }
  }

  /**
   * Get quick fixes for a diagnostic
   * @param uri The document URI
   * @param diagnostic The diagnostic to get fixes for
   * @returns An array of code actions (quick fixes)
   */
  public getQuickFixes(uri: vscode.Uri, diagnostic: vscode.Diagnostic): vscode.CodeAction[] {
    const key = this.getDiagnosticKey(diagnostic);
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    
    if (!document) {
      return [];
    }
    
    return [];
  }

  /**
   * Clear diagnostics for a document
   * @param uri The document URI
   */
  public clearDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  /**
   * Check if a document is an AsyncAPI document
   * @param document The document to check
   * @returns True if the document is an AsyncAPI document
   */
  private isAsyncAPIDocument(document: vscode.TextDocument): boolean {
    if (document.languageId === 'json') {
      try {
        const content = JSON.parse(document.getText());
        return !!content.asyncapi;
      } catch {
        return false;
      }
    } else if (document.languageId === 'yaml' || document.languageId === 'yml') {
      return document.getText().includes('asyncapi:');
    }
    
    return false;
  }

  /**
   * Get a range for a Spectral result
   * @param document The document
   * @param result The result
   * @returns A VS Code range
   */
  private getRange(document: vscode.TextDocument, result: ISpectralDiagnostic): vscode.Range {
    if (result.range && result.range.start && result.range.end) {
      const start = new vscode.Position(
        result.range.start.line,
        result.range.start.character
      );
      
      const end = new vscode.Position(
        result.range.end.line,
        result.range.end.character
      );
      
      return new vscode.Range(start, end);
    }
    
    // Default to first line if no range is provided
    return new vscode.Range(0, 0, 0, 0);
  }

  /**
   * Map Spectral severity to VS Code diagnostic severity
   * @param severity The Spectral severity
   * @returns The VS Code diagnostic severity
   */
  private getSeverity(severity: number): vscode.DiagnosticSeverity {
    switch (severity) {
      case 0:
        return vscode.DiagnosticSeverity.Error;
      case 1:
        return vscode.DiagnosticSeverity.Warning;
      case 2:
        return vscode.DiagnosticSeverity.Information;
      case 3:
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }

  /**
   * Create quick fixes for a diagnostic
   * @param document The document
   * @param diagnostic The diagnostic
   * @param result The Spectral result
   * @returns An array of code actions (quick fixes)
   */
  private createQuickFixes(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, result: ISpectralDiagnostic): vscode.CodeAction[] {
    const fixes: vscode.CodeAction[] = [];
    
    // Example quick fix for a common rule
    if (result.code === 'asyncapi-info-contact-properties') {
      const fix = new vscode.CodeAction(
        'Add contact information',
        vscode.CodeActionKind.QuickFix
      );
      fix.diagnostics = [diagnostic];
      // Implementation would go here
      fixes.push(fix);
    }
    
    return fixes;
  }

  /**
   * Get a unique key for a diagnostic
   * @param diagnostic The diagnostic
   * @returns A unique key
   */
  private getDiagnosticKey(diagnostic: vscode.Diagnostic): string {
    return `${diagnostic.range.start.line}:${diagnostic.range.start.character}:${diagnostic.message}`;
  }
} 