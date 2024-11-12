import { Parser, fromFile } from '@asyncapi/parser';
import * as path from 'path';

import * as vscode from 'vscode';
import { promptForAsyncapiFile } from './PreviewWebPanel';

type Operation = {
  channel: string;
  description: string;
  id: string;
  messages: { title: string }[];
  forApplication: string;
};

export const openVisualizerFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel

export function visualizeAsyncApi(context: vscode.ExtensionContext) {
  return async (uri: vscode.Uri) => {
    uri = uri || ((await promptForAsyncapiFile()) as vscode.Uri);
    if (uri) {
      console.log('Opening asyncapi file', uri.fsPath);
      await openVisualizerAsyncApi(context, uri);
    }
  };
}

export async function openVisualizerAsyncApi(context: vscode.ExtensionContext, uri: vscode.Uri) {
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
  const panel: vscode.WebviewPanel =
    openVisualizerFiles[uri.fsPath] ||
    vscode.window.createWebviewPanel('asyncapi-visualizer', `EDAVisualizer: ${path.basename(uri.fsPath)}`, vscode.ViewColumn.Two, {
      localResourceRoots: [vscode.Uri.file(path.dirname(uri.fsPath)), vscode.Uri.joinPath(context.extensionUri, 'dist')],
      enableScripts: true,
    });

  panel.title = `EDAVisualizer: ${path.basename(uri.fsPath)}`;

  panel.webview.html = await getWebviewContent(context, panel.webview, uri);

  panel.onDidDispose(() => {
    delete openVisualizerFiles[uri.fsPath];
  });
  openVisualizerFiles[uri.fsPath] = panel;
}

async function visualize(filePath: string) {
  const parser = new Parser();

  const { document, diagnostics } = await fromFile(parser, filePath).parse();

  console.log(diagnostics);

  if (document) {
    const props = {
      application: {
        id: document.info().title(),
        defaultContentType: document.defaultContentType(),
        description: document.info().description(),
        title: document.info().title(),
        version: document.info().version(),
        license: {
          name: document.info().license()?.name(),
          url: document.info().license()?.url(),
        },
        servers: document
          .servers()
          .all()
          .map(server => ({
            name: server.id(),
            url: server.url(),
            description: server.description(),
            protocol: server.protocol(),
            protocolVersion: server.protocolVersion(),
          })),
      },
      outgoingOperations: Array<Operation>(),
      incomingOperations: Array<Operation>(),
    };

    document.operations().forEach(element => {
      const operation = {
      channel: element.channels().all()[0].address(),
      description: element.description() || '',
      id: element.id(),
      messages: element
        .messages()
        .all()
        .map(message => ({
        title: message.title() || "untitled",
        description: message.description(),
        })),
      forApplication: document.info().title(),
      };

      if (element.action() === 'receive' || element.action() === 'subscribe') {
        props.incomingOperations.push(operation as Operation);
      } else if (element.action() === 'send' || element.action() === 'publish') {
        props.outgoingOperations.push(operation as Operation);
      }
    });
    return JSON.stringify(props);
  }
}

async function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri) {
  const result = await visualize(asyncapiFile.fsPath);

  const visualizerJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/browser/standalone/index.js')
  );
  const visualiserCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/edavisualiser/styles/default.min.css')
  );

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="${visualiserCss}">
        <style> 
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        #edavisualizer {
          width: 100%;
          height: 100%;
        }
        </style>
        <script src="${visualizerJs}"></script>
      </head>
      <body x-timestamp="${Date.now()}">
        <div id="edavisualizer"></div>
    
        <script>
          const props = ${result};
          EDAVisualiserStandalone.renderApplicationView(props, document.getElementById('edavisualizer'));
        </script>
    
      </body>
    </html>
  `;
  return html;
}
