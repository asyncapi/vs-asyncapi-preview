import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { isAsyncAPIFile } from './PreviewWebPanel';
import Diagnostics from './Diagnostics';
import { Parser, fromFile, AsyncAPIDocumentInterface } from '@asyncapi/parser';
import { AvroSchemaParser } from '@asyncapi/avro-schema-parser';
import Asyncapi from './Asyncapi';
import { ISpectralDiagnostic } from '@stoplight/spectral-core';
import { parse } from 'yaml';
import Flowchart from './Flowchart';
import ClassDiagram from './ClassDiagram';

const parser = new Parser();
parser.registerSchemaParser(AvroSchemaParser());

function parsedAsyncapiPreview(){
  
  const editor: any = vscode.window.activeTextEditor;
  if(!editor) {return;}
  const document = editor.document;
  const filePath: any = document?.fileName;
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  
  let parsedData;
  if (filePath.endsWith('.json')) {
    parsedData = JSON.parse(content);
  } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    parsedData = parse(content);
  } else {
    vscode.window.showInformationMessage('Unsupported file type.');
    return;
  }
  return parsedData || "";
}



async function buildMarkdown(document: any, diagnostics: ISpectralDiagnostic[], context: vscode.ExtensionContext){
  
  
  let content: any = '';
  
  if(document !== undefined){
    document.isAsyncapiParser = true;
    content = await Asyncapi(document, context) || "";
  }else{
    let parsedData: any = parsedAsyncapiPreview();
    if(parsedData){
      parsedData.isAsyncapiParser = false;
      content = await Diagnostics(diagnostics, context);
      content += await Asyncapi(parsedData, context) || "";
    }
  }
  
  return content;

}

async function buildDiagrams(context: vscode.ExtensionContext){
  let parsedData: any = parsedAsyncapiPreview();
  let flowchart;
  let classDiagram;

  if(parsedData){
    flowchart = await Flowchart(parsedData, context);
    classDiagram = await ClassDiagram(parsedData, context);
  }

  return {flowchart, classDiagram};
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
    vscode.Uri.joinPath(context.extensionUri, 'dist')
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

  let result =  await buildMarkdown(document, diagnostics, context); 
  let {flowchart, classDiagram} = await buildDiagrams(context);  

  panel.title = path.basename(uri.fsPath);
  panel.webview.html = getWebviewContent(context, panel.webview, uri, result, flowchart, classDiagram);

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

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, result: any, flowchart: any, classDiagram: any) {
  const mermaidJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/mermaid/dist/mermaid.min.js')
  );
  const panzoomJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/panzoom/dist/panzoom.min.js')
  );
  const turndownJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/turndown/dist/turndown.js')
  );
  const globalsCSS = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/globals.css')
  );

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="${globalsCSS}"/>
    </head>
    <body x-timestamp="${Date.now()}">

      <div class="container">
        <div class="section" id="section1">${result}</div>
        <div class="section" id="section2">${flowchart}</div>
        <div class="section" id="section3">${classDiagram}</div>
        <div id="control-panel">
          <div id="zoom-in" class="control-button">+</div>
          <div id="pan-up" class="control-button">↑</div>
          <div id="zoom-out" class="control-button">-</div>
          <div id="pan-left" class="control-button">←</div>
          <div id="pan-right" class="control-button">→</div>
          <div id="pan-down" class="control-button">↓</div>
          </div>
          <div id="zoom-info">
              <div class="flowchart_div"> Zoom : <span id="flowchart_zoom-level"> 1</span> </div>
              <div class="flowchart_div"> Scroll : <span id="flowchart_scroll-position"> 0, 0</span> </div>
              <div class="classdiagram_div"> Zoom : <span id="classdiagram_zoom-level"> 1</span> </div>
              <div class="classdiagram_div"> Scroll : <span id="classdiagram_scroll-position"> 0, 0</span> </div>
          </div>
      </div>

      <div class="button-container">
        <button class="button" onclick="moveToSection('section1')">Markdown</button>
        <button class="button" onclick="moveToSection('section2')">Flowchart</button>
        <button class="button" onclick="moveToSection('section3')">Class Diagram</button>
      </div>
      
      <div id="copy-button"><b>Copy</b></div>
      <div id="copied-indicator">Copied!</div>

      <script src="${mermaidJs}"></script>
      <script src="${panzoomJs}"></script>
      <script src="${turndownJs}"></script>
      <script>
        let sectionElement;
        let zoomLevelSpan = document.getElementById('flowchart_zoom-level');
        let scrollPositionSpan = document.getElementById('flowchart_scroll-position');
        const controlPanel = document.getElementById('control-panel');
        const zoomInfo = document.getElementById('zoom-info');
        var turndownService = new TurndownService();
        turndownService.keep(['table','tr','th','td']);

        mermaid.initialize({ 
          "startOnLoad": true ,
          "securityLevel": 'loose',
          "theme": "base",
            "themeVariables": {
              "primaryColor": "#e8e9eb",
              "primaryTextColor": "#000",
              "primaryBorderColor": "#b9babd",
              "lineColor": "#4169e1"
            },
          "flowchart": {
            "defaultRenderer": "elk"
          }
        });  
        function moveToSection(sectionId) {
          sectionElement = document.getElementById(sectionId);
          sectionElement.scrollIntoView({ behavior: 'smooth' });
          if(sectionId === 'section1'){
            controlPanel.style.display = "none";
            zoomInfo.style.display = "none";
          }else{
            controlPanel.style.display = "flex";
            zoomInfo.style.display = "flex";
            if(sectionId === 'section2'){
              document.querySelectorAll('.flowchart_div').forEach(ele=> {ele.style.display = "flex";})
              document.querySelectorAll('.classdiagram_div').forEach(ele=> {ele.style.display = "none";})
              zoomLevelSpan = document.getElementById('flowchart_zoom-level');
              scrollPositionSpan = document.getElementById('flowchart_scroll-position');
            }else {
              document.querySelectorAll('.flowchart_div').forEach(ele=> {ele.style.display = "none";})
              document.querySelectorAll('.classdiagram_div').forEach(ele=> {ele.style.display = "flex";})
              zoomLevelSpan = document.getElementById('classdiagram_zoom-level');
              scrollPositionSpan = document.getElementById('classdiagram_scroll-position');
            }
          }
        }
         document.addEventListener("DOMContentLoaded", function() { 
            const flowchartElement = document.getElementById('section2');
            const classDiagramElement = document.getElementById('section3');
            const panZoomFlowchartInstance = panzoom(flowchartElement.querySelector('.mermaid'), {
                maxScale: 4,
                minScale: 0.5,
                contain: 'outside'
            });
            const panZoomClassDiagramInstance = panzoom(classDiagramElement.querySelector('.mermaid'), {
                maxScale: 4,
                minScale: 0.5,
                contain: 'outside'
            });

            panZoomFlowchartInstance.on('zoom', function (e) {
                zoomLevelSpan.textContent = e.getTransform().scale.toFixed(2);
            });

            panZoomFlowchartInstance.on('pan', function (e) {
                const { x, y } = e.getTransform();
                scrollPositionSpan.textContent = x.toFixed(0) + ', ' + y.toFixed(0);
            });

            panZoomClassDiagramInstance.on('zoom', function (e) {
                zoomLevelSpan.textContent = e.getTransform().scale.toFixed(2);
            });

            panZoomClassDiagramInstance.on('pan', function (e) {
                const { x, y } = e.getTransform();
                scrollPositionSpan.textContent = x.toFixed(0) + ', ' + y.toFixed(0);
            });

            document.getElementById('zoom-in').addEventListener('click', function () {
            if(sectionElement.id === 'section2')
                panZoomFlowchartInstance.smoothZoom(flowchartElement.clientWidth / 2, flowchartElement.clientHeight / 2, 1.1);
            else
                panZoomClassDiagramInstance.smoothZoom(classDiagramElement.clientWidth / 2, classDiagramElement.clientHeight / 2, 1.1);
            });

            document.getElementById('zoom-out').addEventListener('click', function () {
            if(sectionElement.id === 'section2')
                panZoomFlowchartInstance.smoothZoom(flowchartElement.clientWidth / 2, flowchartElement.clientHeight / 2, 0.9);
            else
                panZoomClassDiagramInstance.smoothZoom(classDiagramElement.clientWidth / 2, classDiagramElement.clientHeight / 2, 0.9);
            });

            document.getElementById('pan-up').addEventListener('click', function () {
              if(sectionElement.id === 'section2'){
                const { x, y } = panZoomFlowchartInstance.getTransform()
                panZoomFlowchartInstance.smoothMoveTo(x, y-50);
              } else {
                const { x, y } = panZoomClassDiagramInstance.getTransform()
                panZoomClassDiagramInstance.smoothMoveTo(x, y-50);
              }
            });

            document.getElementById('pan-down').addEventListener('click', function () {
              if(sectionElement.id === 'section2'){
                const { x, y } = panZoomFlowchartInstance.getTransform()
                panZoomFlowchartInstance.smoothMoveTo(x, y+50);
              }
              else {        
                const { x, y } = panZoomClassDiagramInstance.getTransform()
                panZoomClassDiagramInstance.smoothMoveTo(x, y+50);
              }
            });

            document.getElementById('pan-left').addEventListener('click', function () {
              if(sectionElement.id === 'section2'){
                const { x, y } = panZoomFlowchartInstance.getTransform()
                panZoomFlowchartInstance.smoothMoveTo(x-50, y);
              }
              else {
                const { x, y } = panZoomClassDiagramInstance.getTransform()
                panZoomClassDiagramInstance.smoothMoveTo(x-50, y);
              }
            });

            document.getElementById('pan-right').addEventListener('click', function () {
              if(sectionElement.id === 'section2'){
                const { x, y } = panZoomFlowchartInstance.getTransform()
                panZoomFlowchartInstance.smoothMoveTo(x+50, y);
              }            
              else {
                const { x, y } = panZoomClassDiagramInstance.getTransform()
                panZoomClassDiagramInstance.smoothMoveTo(x+50, y);
              }
            });            
        });

        document.getElementById('copy-button').addEventListener('click', function() {
            const textToCopy = turndownService.turndown(document.getElementById('turndown'));
            
            navigator.clipboard.writeText(textToCopy).then(function() {
                showCopiedIndicator()
            }).catch(function(error) {
                console.error('Failed to copy text: ', error);
            });
        });

        function showCopiedIndicator() {
            const indicator = document.getElementById('copied-indicator');
            indicator.style.top = "10px";
            setTimeout(()=>{
              indicator.style.top = "-50px";
            },2000);            
            console.log("reomved");

        }

        window.addEventListener("resize",()=>{
            sectionElement.scrollIntoView({ behavior: 'smooth' });
        });
      </script>
  
    </body>
  </html>
    `;
  return html;
}
