import * as vscode from 'vscode';
import * as path from 'path';
import { isAsyncAPIFile } from './PreviewWebPanel';

import { Parser, fromFile, AsyncAPIDocumentInterface } from '@asyncapi/parser';
import Asyncapi from './Asyncapi';


const parser = new Parser();


async function buildMarkdown(document:AsyncAPIDocumentInterface | undefined, context: vscode.ExtensionContext){


  let content = '';

  if(document !== undefined){
    
    content = await Asyncapi(document, context);
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
  let result =  await buildMarkdown(document, context); 


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
          background-color: #efefef;
          word-wrap: break-word;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        h1 {
          color: #121212;
        }
        .container {
          display: flex;
          overflow-x: hidden;
        }
        .section {
          flex: 0 0 100%;
          box-sizing: border-box;
          padding: 20px;
          aspect-ratio:1;
          overflow-y: auto;
          height:calc(100vh - 60px);;
        }
        .button-container {
          display: flex;
          justify-content: center;
          margin: 10px;
        }
        .button {
          padding: 10px 20px;
          margin: 0px 10px;
          border-radius: .5rem;
          color: #444;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: .1rem;
          cursor: pointer;
          flex:1;
          border: none;
          outline: none;
          transition: .2s ease-in-out;
          box-shadow: -6px -6px 14px rgba(255, 255, 255, .7),
                      -6px -6px 10px rgba(255, 255, 255, .5),
                      6px 6px 8px rgba(255, 255, 255, .075),
                      6px 6px 10px rgba(0, 0, 0, .15);
          }
          button:hover {
            box-shadow: -2px -2px 6px rgba(255, 255, 255, .6),
                        -2px -2px 4px rgba(255, 255, 255, .4),
                        2px 2px 2px rgba(255, 255, 255, .05),
                        2px 2px 4px rgba(0, 0, 0, .1);
          }
          button:active {
            box-shadow: inset -2px -2px 6px rgba(255, 255, 255, .7),
                        inset -2px -2px 4px rgba(255, 255, 255, .5),
                        inset 2px 2px 2px rgba(255, 255, 255, .075),
                        inset 2px 2px 4px rgba(0, 0, 0, .15);
          }
        .table-container{
          overflow-x:auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: black;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #fefefe;
        }
        code {
          display: block;
          padding: 10px;
          background-color: #282c34;
          color: #abb2bf;
          border-radius: 5px;
          margin-bottom: 20px;
          margin-top: 20px;
          white-space: pre-wrap;
        }
        blockquote {
          border-left: 4px solid #61dafb;
          margin: 0;
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #fff;
          color: #333;
        }
        a {
          text-decoration: none;
          color: #3498db;
          font-weight: bold;
          transition: color 0.3s ease-in-out;
        }
        a:hover {
          color: #1abc9c;
        }
    
        @media screen and (max-width: 600px) {
          table {
            display: block;
          }
    
          thead, tbody, th, td, tr {
            display: block;
          }
    
          th {
            position: absolute;
            top: -9999px;
            left: -9999px;
          }
    
          td {
            border: none;
            position: relative;
            padding-left: 50%;
            white-space: nowrap;
          }
    
          td:before {
            position: absolute;
            top: 12px;
            left: 6px;
            width: 45%;
            padding-right: 10px;
            white-space: nowrap;
            content: attr(data-th) ": ";
            font-weight: bold;
          }
          code {
            font-size: 14px;
          }
    
          blockquote {
            font-size: 16px;
          }
        }
      </style>
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
