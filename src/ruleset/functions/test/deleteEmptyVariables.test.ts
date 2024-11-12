import * as assert from 'assert';
import * as vscode from 'vscode';
import deleteEmptyVariables from '../deleteEmptyVariables';

suite('deleteEmptyVariables Test Suite', () => {

    test('deleteEmptyVariables test 1', async () => {
        const documentContent = `
servers:
  production:
    url : api.example{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 2', async () => {
        const documentContent = `
servers:
  production:
    url : api.example.{}.{}.{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 3', async () => {
        const documentContent = `
servers:
  production:
    url : api.example.{}...{}....{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 4', async () => {
        const documentContent = `
servers:
  production:
    url : api.example.{}.{}.{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 5', async () => {
        const documentContent = `
servers:
  production:
    url : api.example.{{}}.{{}{}}.{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 6', async () => {
        const documentContent = `
servers:
  production:
    url : /{var1}.api.example.{{}}.{{}{}}.{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var1}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 7', async () => {
        const documentContent = `
servers:
  production:
    url : {var}.{{}{}{}}.api.example.{{}}.{{}{}}.{}.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 8', async () => {
        const documentContent = `
servers:
  production:
    url : {var}.{{}{}{}}.api.example.{{}}.{{}{}}.{}.com.{}.{}
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 9', async () => {
        const documentContent = `
servers:
  production:
    url : {var}.{{}{}{}}.api.example.{{}}.{{}{}}.{}.com.{}.{}
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 10', async () => {
        const documentContent = `
servers:
  production:
    url : {var}.{{}{{}{}{{}{}}}{}}.api.example.{{}}.{{}{}}.{}.com.{}.{}
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 11', async () => {
        const documentContent = `
servers:
  production:
    url : {}{}{}.{var}.{{}{{}{}{{}{}}}{}}.api.example.{{}}.{{}{}}.{}.com.{}.{}
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 12', async () => {
        const documentContent = `
servers:
  production:
    url : {}.{var}.{{}{{}{}{{}{}}}{}}.api.example.{{}}.{{}{}}.{}.com.{}.{}
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 13', async () => {
        const documentContent = `
servers:
  production:
    url : {}{}{}/////{var}.{{}{{}{}{{{{{{}}}}}{{}{}{}}}}{}}.api.example.{{}}.{{}{}}.{}.com.{}.{}.//..
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 14', async () => {
        const documentContent = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 15', async () => {
        const documentContent = `
servers:
  production:
    url : {}{}{}/////.{var}.{{}{{}{}{{{{{{}}}}}{{}{}{}}}}{}}./{var1}/.api.example.{{}}.{{}{}}.{}.com.{}.{}.//..
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /.{var}./{var1}/.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 16', async () => {
        const documentContent = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyVariables test 17', async () => {
        const documentContent = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyVariables(document, range, given, field);

        const expected = `
servers:
  production:
    url : /{var}.api.example.com
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });


});
