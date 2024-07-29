import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';

function deletionHelper(target: string) {
    return target.replace(/\/+$/, '');
}

export default function deleteEndingSlash(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    try {
        let jsonObject = yaml.load(documentContent);
        const queryResult = JSONPath({
            path: given, json: jsonObject, resultType: 'all'
        });
        for (const result of queryResult) {
            console.log(result.value, typeof result.value);
            if (typeof result.value === 'object' && result.value !== null) {
                if (field !== null && result.value[field].endsWith('/')) {
                    console.log(result.value[field]);
                    let newValue = deletionHelper(result.value[field]);
                    result.value[field] = newValue;
                }
                else {
                    for (const key of Object.keys(result.value)) {
                        // console.log(key);
                        // TODO: delete keys may re-order the object
                        if (key !== '' && key.endsWith('/')) {
                            let newKey = deletionHelper(key);
                            // console.log(newKey);
                            result.value[newKey] = result.value[key];
                            delete result.value[key];
                        }
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