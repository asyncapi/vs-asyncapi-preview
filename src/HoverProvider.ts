import * as vscode from 'vscode';
import * as yaml from 'yaml';

export class AsyncAPIHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const lineText = document.lineAt(position.line).text;
    const wordRange = document.getWordRangeAtPosition(position, /[\w.$-]+/);
    const hoveredWord = document.getText(wordRange);

    // Parse the document to get structured context (optional for later)
    // const parsedYaml = yaml.parse(document.getText());

    // Show hover based on key presence in line
    const hoverTexts: { [key: string]: string } = {
      'asyncapi': '**asyncapi**: Specifies the AsyncAPI version.',
      'info': '**info**: Metadata about the API (title, description, version).',
      'title': '**title**: The title of the API or component.',
      'version': '**version**: The document version.',
      'description': '**description**: A human-readable explanation.',
      'channels': '**channels**: Map of available message channels.',
      '$ref': '**$ref**: Reference to reusable component or schema.',
      'components': '**components**: Reusable definitions like messages, schemas, etc.',
    };

    for (const key in hoverTexts) {
      const keyPattern = new RegExp(`\\b${key}\\b`);
      if (keyPattern.test(lineText)) {
        return new vscode.Hover(new vscode.MarkdownString(hoverTexts[key]));
      }
    }

    // Fallback: match exact hovered word
    if (hoverTexts[hoveredWord]) {
      return new vscode.Hover(new vscode.MarkdownString(hoverTexts[hoveredWord]));
    }

    return null;
  }
}