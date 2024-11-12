import goodExamples from "../defaultFormat";
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';

export default function addField(document: vscode.TextDocument, range: vscode.Range, given: string, field: string) {
    const documentContent = document.getText();
    const start = new vscode.Position(range.start.line, 0);
    const lines = documentContent.split('\n');
    try {
        let jsonObject = yaml.load(documentContent);
        const queryResult = JSONPath({
            path: given, json: jsonObject as any, resultType: 'all'
        });
        // no info object
        if (queryResult.length === 0) {
            const infoObjectWithContact = { info: { [field]: goodExamples['info'][`${field}` as keyof typeof goodExamples['info']] } };
            const newText = yaml.dump(infoObjectWithContact, { indent: 2 }).trim();
            if (newText && start.line >= 0 && start.line < lines.length) {
                lines.splice(range.start.line + 1, 0, newText);
            }
            return lines.join('\n');
        }
        else {
            for (const result of queryResult) {
                const exampleFix = JSONPath({
                    json: goodExamples, path: given, resultType: 'all'
                });
                for (const example of exampleFix) {
                    if (example.parentProperty === result.parentProperty) {
                        if (result.value) {
                            if (!result.value.hasOwnProperty(field) || !result.value[field]) {
                                result.value[field] = example.value[field];
                            }
                            else {
                                for (const key of Object.keys(example.value[field])) {
                                    if (result.value[field] && (!result.value[field].hasOwnProperty(key) || !result.value[field][key])) {
                                        result.value[field][key] = example.value[field][key];
                                    }
                                }
                            }
                        }
                        else {
                            result.parent[result.parentProperty] = { [field]: example.value[field] };
                        }
                    }
                }
            }
        }
        const yamlText = yaml.dump(jsonObject, { indent: 2 }).trim();
        return yamlText;
    }
    catch (error) {
        console.error("Failed to parse document content as YAML", error);
        return documentContent;
    }
}
