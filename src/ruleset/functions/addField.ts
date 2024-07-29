import goodExamples from "../defaultFormat";
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';



export default function addField(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    console.log(typeof documentContent, typeof range);
    console.log(range.start);
    try {
        let jsonObject = yaml.load(documentContent);
        const queryResult = JSONPath({
            path: given, json: jsonObject, resultType: 'all'
        });
        for (const result of queryResult) {
            const exampleFix = JSONPath({
                json: goodExamples, path: given, resultType: 'all'
            });
            for (const example of exampleFix) {
                if (example.parentProperty === result.parentProperty) {
                    if (!result.value.hasOwnProperty(field)) {
                        result.value[field] = example.value[field];
                    }
                    else {
                        for (const key of Object.keys(example.value[field])) {
                            if (!result.value[field].hasOwnProperty(key)) {
                                result.value[field][key] = example.value[field][key];
                            }
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
