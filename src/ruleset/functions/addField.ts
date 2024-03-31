import goodExamples from "../defaultFormat";
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';



export default function addField(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    console.log("given: ", given);
    try {
        let jsonObject = yaml.load(documentContent);
        console.log(jsonObject);
        const queryResult = JSONPath({
            path: given, json: jsonObject, resultType: 'all'
        });
        for (const result of queryResult) {
            console.log("query result", result);
            const exampleFix = JSONPath({
                json: goodExamples, path: given, resultType: 'all'
            });
            for (const example of exampleFix) {
                console.log("example: ", example);
                if (example.parentProperty === result.parentProperty) {
                    console.log("result: ", result);
                    result.value[field] = example.value[field];
                }
            }
        }
        const yamlText = yaml.dump(jsonObject, { indent: 2 });
        return yamlText;
    } catch (error) {
        console.error("Failed to parse document content as YAML", error);
    }
}
