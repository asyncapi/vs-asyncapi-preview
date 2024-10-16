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
    const { document } = await fromFile(parser, filePath).parse();
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
    return `console.error("Error parsing AsyncAPI document:", ${error.message});`;
  }
}
async function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri): Promise<string> {
  const edavisualiserJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/browser/standalone/index.js')
  );
  const edavisualiserCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/styles/default.css')
  );
  const props = await visualize(asyncapiFile.fsPath);
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
        .react-flow__renderer {
          background-color: #f0f0f0; 
        }
        .react-flow__node {
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      <div id="visualizer"></div>
  
      <script src="${edavisualiserJs}"></script>
      <script>
        const vscode = acquireVsCodeApi();
        const props = ${JSON.stringify(props)};
        
        EDAVisualiserStandalone.renderApplicationView(props, document.getElementById('visualizer'));
      </script>
    </body>
  </html>
  `;
  return html;
}