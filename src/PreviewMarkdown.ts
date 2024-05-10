import * as vscode from 'vscode';
import * as path from 'path';
import { isAsyncAPIFile } from './PreviewWebPanel';

import { Parser, fromFile, AsyncAPIDocumentInterface } from '@asyncapi/parser';
import Asyncapi from './Asyncapi';
import { ISpectralDiagnostic } from '@stoplight/spectral-core';
import Diagnostics from './Diagnostics';


const parser = new Parser();


async function buildMarkdown(document:AsyncAPIDocumentInterface | undefined, diagnostics: ISpectralDiagnostic[], context: vscode.ExtensionContext){


  let content = '';

  if(document !== undefined){
    
    content = await Asyncapi(document, context);
  }else{
    content = await Diagnostics(diagnostics, context);
  }

  return content;

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
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/mermaid/dist/mermaid.min.js'),
    vscode.Uri.joinPath(context.extensionUri, 'dist/globals.css')
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

  const { document, diagnostics } = await fromFile(parser, uri.fsPath).parse(); 
  console.log(diagnostics);  
  let result =  await buildMarkdown(document, diagnostics, context); 


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
  const globalsCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/globals.css')
  );

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="${globalsCss}"/>
    </head>
    <body x-timestamp="${Date.now()}">

      <div class="container">
        <div class="section" id="section1">${result}</div>
        <div class="section" id="section2">Section 2</div>
        <div class="section" id="section3">Section 3</div>
      </div>

      <div class="button-container">
        <button class="button" onclick="moveToSection('section1')">Markdown</button>
        <button class="button" onclick="moveToSection('section2')">Flowchart</button>
        <button class="button" onclick="moveToSection('section3')">Class Diagram</button>
      </div>
      
      
      <script src="${mermaidJs}"></script>
      <script>
        mermaid.initialize({ startOnLoad: true });  
        function moveToSection(sectionId) {
          const sectionElement = document.getElementById(sectionId);
          sectionElement.scrollIntoView({ behavior: 'smooth' });
        }
      </script>
  
    </body>
  </html>
    `;
  return html;
}
