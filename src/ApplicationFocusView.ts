import * as vscode from 'vscode';
import * as path from 'path';
import { Parser, fromFile } from '@asyncapi/parser';
import fetch from 'node-fetch';
import { promptForAsyncapiFile } from './PreviewWebPanel';

export const openVisualizerFiles: { [id: string]: vscode.WebviewPanel } = {};

interface ExternalConfig {
  externalApplications: {
    [key: string]: string;
  };
}

async function loadExternalConfig(): Promise<ExternalConfig> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const configFile = vscode.Uri.joinPath(workspaceRoot.uri, 'eda-config.json');
    const configContent = await vscode.workspace.fs.readFile(configFile);
    const config = JSON.parse(configContent.toString());
    return config;
  } catch (error) {
    console.error('Failed to load eda-config.json:', error);
    throw error;
  }
}

async function fetchExternalDocument(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    
    const parser = new Parser();
    const { document } = await parser.parse(content);
    return document;
  } catch (error) {
    console.error(`Failed to fetch/parse document from ${url}:`, error);
    throw error;
  }
}

async function processExternalDocuments(config: ExternalConfig): Promise<any[]> {
  const externalDocs = [];

  for (const [name, url] of Object.entries(config.externalApplications)) {
    try {
      const document = await fetchExternalDocument(url);
      const processedDoc = {
        application: {
          id: document.info().title() || "Application",
          defaultContentType: document.defaultContentType(),
          description: document.info().description() || "No Description",
          title: document.info().title(),
          version: document.info().version(),
        },
        incomingOperations: [] as any[],
        outgoingOperations: [] as any[]
      };

      for (const operation of document.operations()) {
        const operationObject = {
          channel: operation.channels().all()[0].address(),
          description: operation.channels().all()[0].description() || "",
          id: operation.id(),
          messages: operation.messages().all().map((message: any) => ({
            title: message.title() || message.name() || 'Untitled Message',
            description: message.description(),
          })),
          forApplication: processedDoc.application.id,
        };

        if (operation.action() === 'send' || operation.action() === 'publish') {
          processedDoc.outgoingOperations.push(operationObject);
        } else if (operation.action() === 'receive' || operation.action() === 'subscribe') {
          processedDoc.incomingOperations.push(operationObject);
        }
      }

      externalDocs.push(processedDoc);
    } catch (error:any) {
      vscode.window.showWarningMessage(`Failed to process external API '${name}': ${error.message}`);
    }
  }

  return externalDocs;
}

export function visualizeAsyncApiFocus(context: vscode.ExtensionContext) {
  return async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
    if (!uri) return;

    try {
      const config = await loadExternalConfig();
      
      const externalDocs = await processExternalDocuments(config);
      
      const panel = vscode.window.createWebviewPanel(
        'asyncapi-focus-visualizer',
        `Focus View: ${path.basename(uri.fsPath)}`,
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.dirname(uri.fsPath)),
            vscode.Uri.joinPath(context.extensionUri, 'dist'),
          ],
        }
      );

      const { document } = await fromFile(new Parser(), uri.fsPath).parse();
      let mainProps: any = {};
      if(document){
        mainProps = {
          application: {
            id: document.info().title() || "Main Application",
            title: document.info().title(),
            version: document.info().version(),
            description: document.info().description() || "No Description",
            servers: document.servers().all().map((server: any) => ({
              name: server.id(),
              url: server.url(),
              description: server.description() || "No Description",
              protocol: server.protocol(),
              protocolVersion: server.protocolVersion()
            })),
          },
          incomingOperations: [],
          outgoingOperations: []
        };
        for (const operation of document.operations()) {
          const operationObject = {
            channel: operation.channels().all()[0].address(),
            description: operation.channels().all()[0].description() || "",
            id: operation.id(),
            messages: operation.messages().all().map((message: any) => ({
              title: message.title() || message.name() || 'Untitled Message',
              description: message.description(),
            })),
            forApplication: mainProps.application.id,
          };

          if (operation.action() === 'send' || operation.action() === 'subscribe') {
            mainProps.outgoingOperations.push(operationObject);
          } else if (operation.action() === 'receive' || operation.action() === 'publish') {
            mainProps.incomingOperations.push(operationObject);
          }
        }
      }
      const focusViewProps = {
        ...mainProps,
        external: externalDocs
      };
      const html = await generateWebviewContent(context, panel.webview, focusViewProps);
      panel.webview.html = html;

      panel.onDidDispose(() => {
        delete openVisualizerFiles[uri.fsPath];
      });
      openVisualizerFiles[uri.fsPath] = panel;

    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to visualize AsyncAPI: ${error.message}`);
    }
  };
}

async function generateWebviewContent(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  props: any
): Promise<string> {
  const edavisualiserJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/browser/standalone/index.js')
  );
  const edavisualiserCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/styles/default.min.css')
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${edavisualiserCss}">
        <style>
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          #visualizer {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="visualizer"></div>
        <script src="${edavisualiserJs}"></script>
        <script>
          const vscode = acquireVsCodeApi();
          const props = ${JSON.stringify(props)};
          
          EDAVisualiserStandalone.renderApplicationFocusView(props, document.getElementById('visualizer'));
        </script>
      </body>
    </html>
  `;
}