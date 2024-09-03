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
  
  let editor: any = vscode.window.activeTextEditor;
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
    while(!parsedData) {
      parsedData = parsedAsyncapiPreview();
    }
    parsedData.isAsyncapiParser = false;
    content = await Diagnostics(diagnostics, context);
    content += await Asyncapi(parsedData, context) || "";
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

    try{
      const { document, diagnostics } = await fromFile(parser, uri.fsPath).parse();
    
      let result =  await buildMarkdown(document, diagnostics, context); 
      let {flowchart, classDiagram} = await buildDiagrams(context);  
    
      panel.title = path.basename(uri.fsPath);
      panel.webview.html = getWebviewContent(context, panel.webview, uri, result, flowchart, classDiagram);
    } catch(err) {
      panel.title = path.basename(uri.fsPath);
      panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Centered Error Box</title>
          <style>
              body, html {
                  height: 100%;
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-family: Arial, sans-serif;
              }
              .error-box {
                  background-color: #f8d7da;
                  color: #721c24;
                  border: 1px solid #f5c6cb;
                  padding: 20px;
                  width: 300px;
                  text-align: center;
                  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
                  border-radius: 8px;
              }
          </style>
      </head>
      <body>
          <div class="error-box">
              <p>${err}</p>
          </div>
      </body>
      </html>`;
    }


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
      <div class="expand-contract-btn">
          <div class="contract-btn">&lt;</div>
          <div class="expand-btn">&gt;</div>
      </div>
      <div id="index">
       <h2> Index </h2>
         <a href="#index-info">Info</a>
         <p class="index-part-title">Operations</p>
      </div>
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
              <div class="flowchart_div"> Zoom :  <span id="flowchart_zoom-level"> 1</span> </div>
              <div class="flowchart_div"> Scroll :  <span id="flowchart_scroll-position"> 0, 0</span> </div>
              <div class="classdiagram_div"> Zoom :  <span id="classdiagram_zoom-level"> 1</span> </div>
              <div class="classdiagram_div"> Scroll :  <span id="classdiagram_scroll-position"> 0, 0</span> </div>
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
        try{
          let sectionElement, isHoverEffectAdded = false;
          let zoomLevelSpan = document.getElementById('flowchart_zoom-level');
          let scrollPositionSpan = document.getElementById('flowchart_scroll-position');
          const controlPanel = document.getElementById('control-panel');
          const zoomInfo = document.getElementById('zoom-info');
          let turndownService = new TurndownService();
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
                if(!isHoverEffectAdded){
                  addHoverEffect();
                  isHoverEffectAdded = true;
                }
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
              
              function toggleSection(event) {
                const title = event.currentTarget;
                const content = title.nextElementSibling;
                const arrow = title.querySelector('.arrow');

                title.style.outline = '0px';
                title.style.border = '0px';
                
                if (content?.style?.display === 'none') {
                    content.style.display = 'block';
                    arrow.style.transform = 'rotate(90deg)';
                } else {
                    content.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                }
              }
              
              const expandContractBtn = document.querySelector('.expand-contract-btn');
              const expandBtn = document.querySelector('.expand-btn');
              const contractBtn = document.querySelector('.contract-btn');
              const index = document.querySelector('#index');
              
              expandBtn.addEventListener('click',()=>{
                index.style.width = '20%' ;
                index.style.padding = '10px'
                expandContractBtn.style.left = "calc(20% - 10px)"; 
              })
              
              contractBtn.addEventListener('click',()=>{
                index.style.width = '0%' ;
                index.style.padding = '0px'
                expandContractBtn.style.left = "-35px";
              })
              
              const indexSections = document.querySelectorAll('.index-section');
              let channelList = [];
              let msgList = [];
              let newSection = '<div>';
              indexSections.forEach((part)=> {

                const channel = part.querySelectorAll('p');
                const operationId = part.querySelectorAll('li');
                const h4Elements = part.querySelectorAll('h4');
                const h5Elements = part.querySelectorAll('h5');

                channel[0].id = 'id_' + parseInt(Math.random() * 1000 * (channel[0].textContent.length ?? 3));
                operationId[0].id = 'id_' + parseInt(Math.random() * 1000 * (operationId[0].textContent.length ?? 3));

                newSection += '<div class="index-part"> <a href="#'+operationId[0].id+'" class="index-part-title">  <span class="arrow">&gt;</span> '+operationId[0].textContent?.replaceAll("Operation ID:","")+'</a> <div class="index-part-content" style="display: none;"> <ul>';
                newSection += '<li><a href="#'+channel[0].id+'">Channel</a></li> ';
                channelList.push('<li><a href="#'+channel[0].id+'">'+channel[0].textContent+'</a></li> ');
                h4Elements.forEach((h4)=> {
                  h4.id = parseInt(Math.random() * 10000 * (h4.textContent.length ?? 4));
                  newSection += '<li><a href="#'+h4.id+'">'+h4.textContent+'</a></li> ';
                  if(h4.textContent.indexOf('Message') >= 0){
                    msgList.push('<li><a href="#'+h4.id+'">'+h4.textContent+'</a></li> ')
                  }
                })
                h5Elements.forEach((h5)=> {
                  h5.id = parseInt(Math.random()* 100000 * (h5.textContent.length ?? 5));
                  newSection += '<li><a href="#'+h5.id+'">'+h5.textContent+'</a></li> ';
                })

                newSection += '</ul></div></div> ';
              });
              
               newSection += '</div><p class="index-part-title"> Channels </p> <ul>';
                channelList.forEach(element => {
                  newSection += element;
                });
                newSection += '</ul><p class="index-part-title"> Messages </p> <ul>';
                msgList.forEach(element => {
                  newSection += element;
                });
                newSection += '</ul>';
                index.innerHTML += newSection;
                
                // Add event listeners to all section and list item titles
              const sectionTitles = document.querySelectorAll('.index-part-title');
              sectionTitles.forEach(title => {
              console.log(title);
                  title.addEventListener('click', toggleSection);
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
          }

          window.addEventListener("resize",()=>{
              sectionElement.scrollIntoView({ behavior: 'smooth' });
          });
        } catch (err) {
          console.log(err); 
        }
      </script>
      <script>
        function removeHighlights() {
          document.querySelectorAll(".highlight-node").forEach(el => {
            el.classList.remove("highlight-node");
          });
          document.querySelectorAll(".highlight-edge").forEach(el => {
            el.classList.remove("highlight-edge");
          });
        }
        function addHoverEffect() {
          document.querySelectorAll('rect[style]').forEach(node => {

            node.nextSibling.addEventListener('mouseenter', function () {
              removeHighlights();
              const nodeId = this.parentElement.dataset.id;
              const outgoingEdges = document.getElementsByClassName("LS-" + nodeId);
              const incomingEdges = document.getElementsByClassName("LE-" + nodeId);
              let targetNodeId;
              Array.from(outgoingEdges).forEach(edge => {
                edge.classList.add("highlight-edge");
                let classList = Array.from(edge.classList);
                targetNodeId = classList[classList.indexOf("LS-" + nodeId) + 1].replaceAll("LE-","");
                document.querySelector('[data-id="' + targetNodeId + '"]').firstElementChild.classList.add("highlight-node");
              });
              Array.from(incomingEdges).forEach(edge => {
                edge.classList.add("highlight-edge");
                let classList = Array.from(edge.classList);
                targetNodeId = classList[classList.indexOf("LE-" + nodeId) - 1].replaceAll("LS-","");
                document.querySelector('[data-id="' + targetNodeId + '"]').firstElementChild.classList.add("highlight-node");
              });
              this.previousSibling.classList.add("highlight-node");
            });


            node.nextSibling.addEventListener('mouseleave', removeHighlights);
          });

          document.querySelectorAll('.path').forEach(edge => {
            edge.addEventListener('mouseenter', function () {
              let sourceNodeId;
              let targetNodeId;
              removeHighlights();
              this.classList.add("highlight-edge");
              this.classList.forEach((token)=>{
                  if(token.startsWith("LE-")){
                    targetNodeId = token.replaceAll("LE-","");
                  }
                  if(token.startsWith("LS-")){
                    sourceNodeId = token.replaceAll("LS-","");
                  }
                });
              document.querySelector('[data-id="' + sourceNodeId + '"]').firstElementChild.classList.add("highlight-node");
              document.querySelector('[data-id="' + targetNodeId + '"]').firstElementChild.classList.add("highlight-node");
            });
            edge.addEventListener('mouseleave', removeHighlights);
          });
        }

      </script>
  
    </body>
  </html>
    `;
  return html;
}
