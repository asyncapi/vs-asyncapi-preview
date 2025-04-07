import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './utils/Logger';

// Initialize logger
const logger = new Logger('asyncapi-preview');

let position : {x:number, y:number} = {
  x: 0,
  y: 0
};

export function previewAsyncAPI(context: vscode.ExtensionContext) {
 return async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
    if (uri) {
      logger.info(`Opening AsyncAPI file: ${uri.fsPath}`);
      openAsyncAPI(context, uri);
    }
  };
}

export const openAsyncapiFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel

export function isAsyncAPIFile(document?: vscode.TextDocument) {
  if (!document) {
    return false;
  }
  if (document.languageId === 'json') {
    try {
      const json = JSON.parse(document.getText());
      return json.asyncapi;
    } catch (e) {
      logger.debug(`Error parsing JSON: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
  if (document.languageId === 'yml' || document.languageId === 'yaml') {
    return document.getText().match('^asyncapi:') !== null;
  }
  return false;
}

export function openAsyncAPI(context: vscode.ExtensionContext, uri: vscode.Uri) {
  logger.debug(`Opening AsyncAPI in webview: ${uri.fsPath}`);
  const localResourceRoots = [
    vscode.Uri.file(path.dirname(uri.fsPath)),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone'),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles'),
  ];
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(folder => {
      localResourceRoots.push(folder.uri);
    });
  }
  
  try {
    const panel: vscode.WebviewPanel =
      openAsyncapiFiles[uri.fsPath] ||
      vscode.window.createWebviewPanel('asyncapi-preview', '', vscode.ViewColumn.Two, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots,
      });

    panel.title = path.basename(uri.fsPath);
    panel.webview.html = getWebviewContent(context, panel.webview, uri, position);
            
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'position':{
            logger.debug(`Received position update: x=${message.scrollX}, y=${message.scrollY}`);
            position = {
              x: message.scrollX,
              y: message.scrollY
            };
            break;
          }
          case 'error': {
            logger.error(`Error from webview: ${message.message}`);
            vscode.window.showErrorMessage(`AsyncAPI Preview Error: ${message.message}`);
            break;
          }
        }
      },
      undefined,
      context.subscriptions
    );

    panel.onDidDispose(() => {
      logger.debug(`Panel disposed for: ${uri.fsPath}`);
      delete openAsyncapiFiles[uri.fsPath];
    });
    openAsyncapiFiles[uri.fsPath] = panel;
  } catch (error: any) {
    const errorMessage = `Failed to open AsyncAPI preview: ${error.message}`;
    logger.error(errorMessage);
    logger.error(`Stack trace: ${error.stack}`);
    vscode.window.showErrorMessage(errorMessage);
  }
}

export async function promptForAsyncapiFile() {
  if (isAsyncAPIFile(vscode.window.activeTextEditor?.document)) {
    logger.debug('Using active editor document as AsyncAPI file');
    return vscode.window.activeTextEditor?.document.uri;
  }
  logger.debug('Prompting user to select AsyncAPI file');
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Open AsyncAPI file',
    filters: {
      asyncAPI: ['yml', 'yaml', 'json'],
    },
  });
  return uris?.[0];
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, position: {x: number, y: number}) {
  try {
    // Try to get component paths with fallbacks for different versions
    let asyncapiComponentJs;
    let asyncapiComponentCss;
    
    try {
      // First try the original paths
      asyncapiComponentJs = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
      );
      asyncapiComponentCss = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css')
      );
      
      // Check if the files exist
      const jsPath = vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js').fsPath;
      const cssPath = vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css').fsPath;
      
      if (!fs.existsSync(jsPath) || !fs.existsSync(cssPath)) {
        // Fallback to newer path structure
        logger.debug('Using fallback paths for AsyncAPI components');
        asyncapiComponentJs = webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, 'dist/react-component.js')
        );
        asyncapiComponentCss = webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, 'dist/react-component.css')
        );
      }
    } catch (error) {
      // Fallback to newer path structure
      logger.debug(`Error accessing component paths: ${error instanceof Error ? error.message : String(error)}`);
      asyncapiComponentJs = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist/react-component.js')
      );
      asyncapiComponentCss = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist/react-component.css')
      );
    }
    
    const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
    const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character
    
    logger.debug(`Reading file content: ${asyncapiFile.fsPath}`);
    const asyncapiContent = fs.readFileSync(asyncapiFile.fsPath, 'utf-8');

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="${asyncapiComponentCss}">
        <style> 
        html{
          scroll-behavior: smooth;
        }
        body {
          color: #121212;
          background-color: #fff;
          word-wrap: break-word;
        }
        h1 {
          color: #121212;
        }
        </style>
      </head>
      <body x-timestamp="${Date.now()}">
        
        <div id="asyncapi"></div>
    
        <script src="${asyncapiComponentJs}"></script>
        <script>
          const vscode = acquireVsCodeApi();
          
          window.onerror = function(message, source, lineno, colno, error) {
            vscode.postMessage({
              type: 'error',
              message: message,
              source: source,
              line: lineno,
              column: colno
            });
            return true;
          };
          
          // Check if we're using the newer component
          if (typeof AsyncApiStandalone !== 'undefined') {
            AsyncApiStandalone.render({
              schema:  {
                url: '${asyncapiWebviewUri}',
                options: { method: "GET", mode: "cors" },
              },
              config: {
                show: {
                  sidebar: true,
                  errors: true,
                },
                parserOptions: { path: '${asyncapiBasePath}' }
              },
            }, document.getElementById('asyncapi'));
          } else if (typeof AsyncApiRenderer !== 'undefined') {
            // Newer component might use a different name
            AsyncApiRenderer.render({
              schema:  {
                url: '${asyncapiWebviewUri}',
                options: { method: "GET", mode: "cors" },
              },
              config: {
                show: {
                  sidebar: true,
                  errors: true,
                },
                parserOptions: { path: '${asyncapiBasePath}' }
              },
            }, document.getElementById('asyncapi'));
          } else {
            document.getElementById('asyncapi').innerHTML = '<p>Error: AsyncAPI component not found. Please check the extension\'s configuration.</p>';
            vscode.postMessage({
              type: 'error',
              message: 'AsyncAPI component not found'
            });
          }
          
          window.addEventListener('scrollend', event => {
                  vscode.postMessage({
                    type: 'position',
                    scrollX: window.scrollX || 0,
                    scrollY: window.scrollY || 0
                  });
          });
          
          window.addEventListener("load", (event) => {
            setTimeout(()=>{window.scrollBy('${position.x}','${position.y}')},1000)
          });
          
        </script>
    
      </body>
    </html>
      `;
    return html;
  } catch (error: any) {
    logger.error(`Error generating webview content: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    throw error;
  }
}
