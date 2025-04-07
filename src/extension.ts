import * as vscode from 'vscode';
import { isAsyncAPIFile, openAsyncAPI, openAsyncapiFiles, previewAsyncAPI } from './PreviewWebPanel';
import { asyncapiSmartPaste } from './SmartPasteCommand';
import { visualizeAsyncApi } from './Visualizer';
import { Logger, LogLevel } from './utils/Logger';
import { SpectralLinter } from './utils/SpectralLinter';
import { AsyncAPICodeActionProvider } from './providers/AsyncAPICodeActionProvider';

// Type declarations for missing Node.js types
declare global {
  interface NodeJS {
    Timeout: ReturnType<typeof setTimeout>;
  }
}

// The main logger instance - initialize before use
const logger = new Logger('asyncapi-extension');

// The Spectral linter instance
let spectralLinter: SpectralLinter;

export function activate(context: vscode.ExtensionContext) {
  logger.info('AsyncAPI Preview extension activated');

  // Configure logger based on settings
  configureLogger();
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    if (event.affectsConfiguration('asyncapi.logging')) {
      configureLogger();
    }
  }));

  // Initialize Spectral linter
  spectralLinter = new SpectralLinter();
  initializeLinting(context);

  // sets context to show "AsyncAPI Preview" button on Editor Title Bar
  function setAsyncAPIPreviewContext(document: vscode.TextDocument) {
    const isAsyncAPI = isAsyncAPIFile(document);
    logger.debug(`Setting context for asyncapi.isAsyncAPI: ${isAsyncAPI}, file: ${document.uri.fsPath}`);
    vscode.commands.executeCommand('setContext', 'asyncapi.isAsyncAPI', isAsyncAPI);
  }

  if (vscode.window.activeTextEditor?.document) {
    setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
  }

  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
    if (e?.document) {
      setAsyncAPIPreviewContext(e.document);
    }
  });

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    if (openAsyncapiFiles[document.uri.fsPath]) {
      logger.debug(`Reloading AsyncAPI file: ${document.uri.fsPath}`);
      openAsyncAPI(context, document.uri);
    }
    if (vscode.window.activeTextEditor?.document) {
      setAsyncAPIPreviewContext(vscode.window.activeTextEditor.document);
    }
    if(openAsyncapiFiles[document.uri.fsPath]){
      logger.debug(`Reloading visualizer file: ${document.uri.fsPath}`);
      visualizeAsyncApi(context);
    }

    // Auto lint on save if enabled
    const config = vscode.workspace.getConfiguration('asyncapi');
    if (config.get<boolean>('linting.enabled', true) && config.get<boolean>('linting.autoLintOnSave', true)) {
      if (isAsyncAPIFile(document)) {
        lintDocument(document);
      }
    }
  });

  // Register commands
  context.subscriptions.push(vscode.commands.registerCommand('asyncapi.preview', previewAsyncAPI(context)));
  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.paste", asyncapiSmartPaste));
  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.visualize", visualizeAsyncApi(context)));
  
  // Register lint command
  context.subscriptions.push(vscode.commands.registerCommand("asyncapi.lint", async () => {
    const document = vscode.window.activeTextEditor?.document;
    if (document && isAsyncAPIFile(document)) {
      await lintDocument(document);
    } else {
      vscode.window.showInformationMessage('This file is not an AsyncAPI document.');
    }
  }));
}

/**
 * Configure the logger based on settings
 */
function configureLogger(): void {
  const config = vscode.workspace.getConfiguration('asyncapi');
  const logLevel = config.get<string>('logging.level', 'info');
  
  switch (logLevel.toLowerCase()) {
    case 'debug':
      logger.setLogLevel(LogLevel.DEBUG);
      break;
    case 'info':
      logger.setLogLevel(LogLevel.INFO);
      break;
    case 'warn':
      logger.setLogLevel(LogLevel.WARN);
      break;
    case 'error':
      logger.setLogLevel(LogLevel.ERROR);
      break;
    case 'none':
      logger.setLogLevel(LogLevel.NONE);
      break;
    default:
      logger.setLogLevel(LogLevel.INFO);
  }
}

/**
 * Initialize linting
 */
function initializeLinting(context: vscode.ExtensionContext): void {
  // Try to load custom rules
  spectralLinter.loadCustomRules().catch(error => {
    logger.error(`Error loading custom rules: ${error.message}`);
  });

  // Register code action provider
  const codeActionProvider = new AsyncAPICodeActionProvider(spectralLinter);
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ language: 'json' }, { language: 'yaml' }, { language: 'yml' }],
      codeActionProvider
    )
  );

  // Lint the active document if it's an AsyncAPI document
  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument && isAsyncAPIFile(activeDocument)) {
    lintDocument(activeDocument);
  }

  // Lint documents when they are opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
      if (isAsyncAPIFile(document)) {
        lintDocument(document);
      }
    })
  );

  // Lint documents when they are changed (with debounce)
  let timeout: number | undefined = undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      const config = vscode.workspace.getConfiguration('asyncapi');
      if (!config.get<boolean>('linting.enabled', true)) {
        return;
      }

      if (isAsyncAPIFile(event.document)) {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          lintDocument(event.document);
        }, 500) as unknown as number;
      }
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration('asyncapi.linting')) {
        const config = vscode.workspace.getConfiguration('asyncapi');
        const enabled = config.get<boolean>('linting.enabled', true);
        
        if (!enabled) {
          // Clear all diagnostics if linting is disabled
          for (const document of vscode.workspace.textDocuments) {
            if (isAsyncAPIFile(document)) {
              spectralLinter.clearDiagnostics(document.uri);
            }
          }
        } else {
          // Re-lint active document if linting is enabled
          const activeDocument = vscode.window.activeTextEditor?.document;
          if (activeDocument && isAsyncAPIFile(activeDocument)) {
            lintDocument(activeDocument);
          }
        }

        // Reload custom rules if changed
        if (event.affectsConfiguration('asyncapi.linting.customRulesetPath')) {
          spectralLinter.loadCustomRules().catch(error => {
            logger.error(`Error loading custom rules: ${error.message}`);
          });
        }
      }
    })
  );
}

/**
 * Lint a document
 * @param document The document to lint
 */
async function lintDocument(document: vscode.TextDocument): Promise<void> {
  const config = vscode.workspace.getConfiguration('asyncapi');
  if (!config.get<boolean>('linting.enabled', true)) {
    return;
  }

  try {
    logger.debug(`Linting document: ${document.uri.fsPath}`);
    await spectralLinter.lintDocument(document);
  } catch (error: any) {
    logger.error(`Error linting document: ${error.message}`);
  }
}

export function deactivate() {
  logger.info('AsyncAPI Preview extension deactivated');
}
