import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';

const emptyCurlyBracesPattern = /\{\}/g;

function deletionHelper(target: string) {
    target = target.replace(emptyCurlyBracesPattern, '');
    console.log("Replace curly braces:", target);
    target = target.replace(/\/\//g, '/');
    console.log("Replace double slashes", target);
    if (target.endsWith('/')) {
        target = target.replace(/\/+$/, '');
    }
    if (target.startsWith('/')) {
        target = target.slice(1);
    }

    return target;
}

export default function deleteEmptyParam(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    try {

        let jsonObject = yaml.load(documentContent);
        const queryResult = JSONPath({
            path: given, json: jsonObject as any, resultType: 'all'
        });
        for (const result of queryResult) {
            if (typeof result.value === 'object' && result.value !== null) {
                for (const key of Object.keys(result.value)) {
                    if (key !== '' && emptyCurlyBracesPattern.test(key)) {
                        console.log(key);
                        let newKey = deletionHelper(key);
                        result.value[newKey] = result.value[key];
                        delete result.value[key];
                    }
                }
            }
        }
        const yamlText = yaml.dump(jsonObject, { indent: 2 });
        return yamlText;
    } catch (error) {
        console.error("Failed to parse document content as YAML", error);
    }
}