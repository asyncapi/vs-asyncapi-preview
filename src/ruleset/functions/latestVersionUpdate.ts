import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';
import { latestVersion } from '../../AutoFixProvider';

export type AsyncAPISpecVersion = keyof typeof specs;

export default function latestVersionUpdate(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    try {
        let jsonObject = yaml.load(documentContent);
        const queryResult = JSONPath({
            path: given, json: jsonObject, resultType: 'all'
        });
        for (const result of queryResult) {
            if (field !== null && latestVersion !== undefined) {
                console.log(result.value, latestVersion);
                result.value[field] = latestVersion;
            }
        }
        const yamlText = yaml.dump(jsonObject, { indent: 2 });
        return yamlText;
    } catch (error) {
        console.error("Failed to parse document content as YAML", error);
    }
}