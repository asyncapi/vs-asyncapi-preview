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

  // Check if panel already exists
  let panel = openVisualizerFiles[uri.fsPath];
  
  if (!panel) {
    // Create new panel only if it doesn't exist
    panel = vscode.window.createWebviewPanel(
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
    
    panel.onDidDispose(() => {
      delete openVisualizerFiles[uri.fsPath];
    });
    
    openVisualizerFiles[uri.fsPath] = panel;
  }

  try {
    // Update the existing panel's content
    panel.webview.html = await getWebviewContent(context, panel.webview, uri);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to visualize AsyncAPI: ${error.message}`);
  }
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
          description: document.info().description() || "No Description",
          title: document.info().title(),
          version: document.info().version(),
          license: document.info().license() ? {
            name: document.info().license()?.name(),
            url: document.info().license()?.url()
          } : undefined,
          servers: document.servers().all().map(server => ({
            name: server.id(),
            url: server.url(),
            description: server.description() || "No Description",
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
          description: operation.channels().all()[0].description() || "",
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
      <div id="loading-overlay">
        <div class="loader"></div>
        <div class="loading-text">Loading EDA Visualizer...</div>
      </div>
      <div id="visualizer"></div>
      <script>
        const vscode = acquireVsCodeApi();
        const props = ${JSON.stringify(result)};
        
        // Wait for the script to load before rendering
        function renderVisualizer() {
          try {
            if (typeof EDAVisualiserStandalone !== 'undefined') {
              EDAVisualiserStandalone.renderApplicationView(props, document.getElementById('visualizer'));
              document.getElementById('loading-overlay').style.display = 'none';
            } else {
              // If script is not loaded yet, try again after a short delay
              setTimeout(renderVisualizer, 100);
            }
          } catch (error) {
            console.error('Error rendering visualizer:', error);
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('visualizer').innerHTML = '<div style="color: red; padding: 20px;">Error rendering visualizer. Please try again.</div>';
          }
        }

        // Start the rendering process
        renderVisualizer();
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
        #loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .loader {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        .loading-text {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          font-size: 16px;
          color: #333;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      ${content}
      <script src="${edavisualiserJs}"></script>
    </body>
  </html>
  `;
  return html;
}