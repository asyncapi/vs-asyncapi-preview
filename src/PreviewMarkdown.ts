import * as vscode from 'vscode';
import * as path from 'path';
import { isAsyncAPIFile } from './PreviewWebPanel';
import * as Markdownit from 'markdown-it';
import { Parser, fromFile, AsyncAPIDocumentInterface } from '@asyncapi/parser';
import Info from './components/Info';
import MermaidDiagram from './components/MermaidDiagram';

const md = Markdownit('commonmark');
const parser = new Parser();

function buildMarkdown(document:AsyncAPIDocumentInterface | undefined){

  let content = '';

  if(document !== undefined){
    
    content = `
      ${Info(document)}
      ${MermaidDiagram(document)}
    `;
  }

  return md.render(content);
}

export function previewMarkdown(context: vscode.ExtensionContext) {
    return async (uri: vscode.Uri) => {
       uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
       if (uri) {
         console.log('Opening asyncapi markdown', uri.fsPath);
         openAsyncAPIMarkdown(context, uri);
       }
     };
   }

export const openAsyncapiMdFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel


export async function openAsyncAPIMarkdown(context: vscode.ExtensionContext, uri: vscode.Uri) {
  const localResourceRoots = [
    vscode.Uri.file(path.dirname(uri.fsPath)),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/mermaid/dist/mermaid.min.js')
  ];
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(folder => {
      localResourceRoots.push(folder.uri);
    });
  }
  const panel: vscode.WebviewPanel =
    openAsyncapiMdFiles[uri.fsPath] ||
    vscode.window.createWebviewPanel('markdown-preview', '', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots,
    });

  const { document } = await fromFile(parser, uri.fsPath).parse();   
  let result =  buildMarkdown(document); 

  panel.title = path.basename(uri.fsPath);
  panel.webview.html = getWebviewContent(context, panel.webview, uri, result);

  panel.onDidDispose(() => {
    delete openAsyncapiMdFiles[uri.fsPath];
  });
  openAsyncapiMdFiles[uri.fsPath] = panel;
}

async function promptForAsyncapiFile() {
  if (isAsyncAPIFile(vscode.window.activeTextEditor?.document)) {
    return vscode.window.activeTextEditor?.document.uri;
  }
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

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, result:any) {
  const mermaidJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/mermaid/dist/mermaid.min.js')
  );

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
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
      
      ${result}
      <script src="${mermaidJs}"></script>
      <script>
        mermaid.initialize({ startOnLoad: true });  
      </script>
  
    </body>
  </html>
    `;
  return html;
}
