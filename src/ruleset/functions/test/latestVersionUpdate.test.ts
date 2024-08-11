import * as assert from 'assert';
import * as vscode from 'vscode';
import latestVersionUpdate from '../latestVersionUpdate';
import { latestVersion } from '../../../AutoFixProvider';

suite('latestVersionUpdate Test Suite', () => {

    /**
     * TEST: Update asyncapi version to spetral's latest version
     */

    test('latestVersionUpdate should update the AsyncAPI version to Spectral version', async () => {
        const documentContent = `
asyncapi: 2.0.0
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '';
        const field = '$';

        const result = await latestVersionUpdate(document, range, given, field);

        const expected = `
asyncapi: ${latestVersion}
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });
});
