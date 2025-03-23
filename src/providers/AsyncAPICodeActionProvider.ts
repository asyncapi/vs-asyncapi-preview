import * as vscode from 'vscode';
import { SpectralLinter } from '../utils/SpectralLinter';
import { Logger } from '../utils/Logger';

/**
 * Code action provider for AsyncAPI documents
 * Provides quick fixes for linting issues
 */
export class AsyncAPICodeActionProvider implements vscode.CodeActionProvider {
  private linter: SpectralLinter;
  private logger: Logger;

  /**
   * Creates a new AsyncAPI code action provider
   * @param linter The Spectral linter instance
   */
  constructor(linter: SpectralLinter) {
    this.linter = linter;
    this.logger = new Logger('asyncapi-code-actions');
  }

  /**
   * Provide code actions for the given document and range
   * @param document The document
   * @param range The range
   * @param context The context
   * @returns An array of code actions
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] | undefined {
    try {
      // Filter diagnostics to only include those for the current range
      const diagnostics = context.diagnostics.filter(
        (diagnostic: vscode.Diagnostic) => diagnostic.source === 'asyncapi-spectral'
      );
      
      if (diagnostics.length === 0) {
        return undefined;
      }
      
      const actions: vscode.CodeAction[] = [];
      
      // Add quick fixes for each diagnostic
      for (const diagnostic of diagnostics) {
        const fixes = this.linter.getQuickFixes(document.uri, diagnostic as vscode.Diagnostic);
        actions.push(...fixes);
      }
      
      return actions;
    } catch (error: any) {
      this.logger.error(`Error providing code actions: ${error.message}`);
      return undefined;
    }
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
} 