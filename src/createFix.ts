import * as vscode from 'vscode';

interface QuickFixOption {
  message: string;
  quickfix: {
    text: string;
    type: string;
  };
}

interface CustomCodeAction extends vscode.CodeAction {
  [key: string]: any;
}

export function createFix(
  document: vscode.TextDocument,
  range: vscode.Range,
  errorCode: string,
  option: QuickFixOption,
  quickFixes: { [errorCode: string]: QuickFixOption[] }
): vscode.CodeAction | undefined {
  const { message, quickfix } = option;

  const fix: CustomCodeAction = new vscode.CodeAction(
    quickfix.text,
    vscode.CodeActionKind.QuickFix
  );
  fix.edit = new vscode.WorkspaceEdit();

  if (quickfix.type === 'update') {
    // Replace the version within the range
    fix.edit.replace(document.uri, range, quickfix.text);
  } else if (quickfix.type === 'delete') {
    // Delete the text within the range
    const lineToDelete = range.start.line;
    if (lineToDelete >= 0) {
      const line = document.lineAt(lineToDelete);
      const deleteRange = new vscode.Range(line.range.start, line.range.end);
      fix.edit.delete(document.uri, deleteRange);
    }
  }else if (quickfix.type === 'append') {
    // Append '-1' to the duplicate name value
    const line = document.lineAt(range.start.line);
    const lineText = line.text;

    // Find the position of the duplicate name value
    const nameStartIndex = lineText.indexOf(': "') + 3;
    const nameEndIndex = lineText.lastIndexOf('"');

    if (nameStartIndex !== -1 && nameEndIndex !== -1) {
      const existingNameValue = lineText.substring(nameStartIndex, nameEndIndex);
      const newNameValue = `${existingNameValue}-1`;
      //vscode.window.showInformationMessage(`Existing Name: ${existingNameValue}, New Name: ${newNameValue}`);
      // Replace the existing name value with the appended one
      const nameValueRange = new vscode.Range(
        range.start.line,
        nameStartIndex,
        range.start.line,
        nameEndIndex
      );
      fix.edit.replace(document.uri, nameValueRange, newNameValue);
    }
    } else if (quickfix.type === 'add') {
      const line = document.lineAt(range.start.line);
      const lineText = line.text;
  
      // Calculate the indentation based on the line before the error
      const previousLine = document.lineAt(range.start.line - 1);
      const previousIndentation = previousLine.text.match(/^\s*/)?.[0] || '';
      
      // Check if the current line has an error, and then add the indentation
      if (errorCode === 'asyncapi-schema') {
        const insertionPosition = line.range.end;
  
        // Insert the quick fix text after the ':' 
        const insertionText = ` ${quickfix.text}`;
        fix.edit.insert(document.uri, insertionPosition, insertionText);
      } else {
        // Insert the quick fix text with the calculated indentation
        const shouldAddIndentation = lineText.trim().length > 0;
        const indentation = shouldAddIndentation ? previousIndentation : '';
  
        const insertionPosition = line.range.end;
        const insertionText = `\n${indentation}${quickfix.text}`;
        fix.edit.insert(document.uri, insertionPosition, insertionText);
      }
  
      
  }

  // Set the error message as the code action's title
  fix.title = message;

  // Add type field to code action metadata
  fix.type = quickfix.type;

  return fix;
}
