import { ISpectralDiagnostic } from '@stoplight/spectral-core';
import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';

export default async function diagnosticsMarkdown(diagnostics: ISpectralDiagnostic[], context: vscode.ExtensionContext){
    const templatePath = path.join(context.extensionPath,'dist', 'components','Diagnostics.ejs');
    let data: object[] = [];
    let recentErrorPath: string = "";
    let joinedPath: string = "";
    diagnostics.forEach(diagnostic =>{
        joinedPath = diagnostic.path.join(' / ');
        if(joinedPath.indexOf(recentErrorPath) === -1 || !recentErrorPath){
            recentErrorPath = joinedPath;
            data.push({
                code: diagnostic.code,
                message: diagnostic.message,
                path: recentErrorPath,
                severity: diagnostic.severity,
                source: diagnostic.source
            });
        }else{
            recentErrorPath = joinedPath;
            data[data.length - 1] = {
                code: diagnostic.code,
                message: diagnostic.message,
                path: recentErrorPath,
                severity: diagnostic.severity,
                source: diagnostic.source
            };
        }
    });
    return await ejs.renderFile(templatePath, {data});
}