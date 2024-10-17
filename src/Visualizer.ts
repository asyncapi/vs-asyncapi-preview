import * as vscode from 'vscode';
import * as path from 'path';
import { Parser, fromFile } from '@asyncapi/parser';
import { promptForAsyncapiFile } from './PreviewWebPanel';
export const openVisualizerFiles: { [id: string]: vscode.WebviewPanel } = {};

export function visualizeAsyncApi(context: vscode.ExtensionContext) {
  return async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
    if (uri) {
      console.log('Visualizing asyncapi file', uri.fsPath);
      await openVisualizer(context, uri);
    }
  };
}
async function openVisualizer(context: vscode.ExtensionContext, uri: vscode.Uri) {
  const localResourceRoots = [
    vscode.Uri.file(path.dirname(uri.fsPath)),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/browser/standalone'),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/styles'),
  ];
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(folder => {
      localResourceRoots.push(folder.uri);
    });
  }
  const panel = vscode.window.createWebviewPanel(
    'asyncapi-visualizer',
    `Visualizer: ${path.basename(uri.fsPath)}`,
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.dirname(uri.fsPath)),
        vscode.Uri.joinPath(context.extensionUri, 'dist'),
      ],
    }
  );
    
    panel.title = path.basename(uri.fsPath);
  try {
    panel.webview.html = await getWebviewContent(context, panel.webview, uri);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to visualize AsyncAPI: ${error.message}`);
  }
  panel.onDidDispose(() => {
    delete openVisualizerFiles[uri.fsPath];
  });
  openVisualizerFiles[uri.fsPath] = panel;
}
async function visualize(filePath: string): Promise<any> {
  const parser = new Parser();
  try {
    const { document, diagnostics } = await fromFile(parser, filePath).parse();
    const errors = diagnostics.filter(d => d.severity === 0);
    console.log("errors", errors);  
    console.log("diagnostics", diagnostics);
    if (errors.length > 0) {
      return {
        errors: errors.map(error => ({
          message: error.message,
          path: error.path.join('.'),
          range: error.range
        }))
      };
    }
    if (document) {
      const props = {
        application: {
          id: document.info().title() || "Application",
          defaultContentType: document.defaultContentType(),
          description: document.info().description(),
          title: document.info().title(),
          version: document.info().version(),
          license: document.info().license() ? {
            name: document.info().license()?.name(),
            url: document.info().license()?.url()
          } : undefined,
          servers: document.servers().all().map(server => ({
            name: server.id(),
            url: server.url(),
            description: server.description(),
            protocol: server.protocol(),
            protocolVersion: server.protocolVersion()
          })),
        },
        incomingOperations: [] as any,
        outgoingOperations: [] as any,
      };
      
      for (const operation of document.operations()) {
        const operationObject = {
          channel: operation.channels().all()[0].address(),
          description: operation.description() || "",
          id: operation.id(),
          messages: operation.messages().all().map(message => ({
            title: message.title() || message.name() || 'Untitled Message',
            description: message.description(),
          })),
          forApplication: props.application.id,
        };
        if (operation.action() === 'send' || operation.action() === 'publish') {
          props.outgoingOperations.push(operationObject);
        } else if (operation.action() === 'receive' || operation.action() === 'subscribe') {
          props.incomingOperations.push(operationObject);
        }
      }
      return props;
    }
  } catch (error:any) {
    return { errors: [{ message: `Error parsing AsyncAPI document: ${error.message}` }] };
  }
}
async function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri): Promise<string> {
  const edavisualiserJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/browser/standalone/index.js')
  );
  const edavisualiserCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/styles/default.min.css')
  );
  const result = await visualize(asyncapiFile.fsPath);
  let content;
  if ('errors' in result) {
    content = `
      <div id="error-overlay">
        <div id="error-card">
          <h2 style="margin-top: 0;">Validation Errors:</h2>
          <ul style="padding-left: 20px;">
            ${result.errors.map((error: any) => `
              <li style="margin-bottom: 10px;">
                <strong>${error.path || 'Document'}:</strong> ${error.message}
                ${error.range ? `<br>Line: ${error.range.start.line}, Column: ${error.range.start.character}` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  } else {
    content = `
      <div id="visualizer"></div>
      <script>
        const vscode = acquireVsCodeApi();
        const props = ${JSON.stringify(result)};
        EDAVisualiserStandalone.renderApplicationView(props, document.getElementById('visualizer'));
      </script>
    `;
  }
  const html = `
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
          #error-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        #error-card {
          background-color: #FFD2D2;
          color: #D8000C;
          padding: 20px;
          border-radius: 5px;
          max-width: 80%;
          max-height: 80%;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      </style>
    </head>
    <body>
      <div id="visualizer"></div>
  
      <script src="${edavisualiserJs}"></script>
      ${content}
    </body>
  </html>
  `;
  return html;
}