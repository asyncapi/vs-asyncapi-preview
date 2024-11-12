import * as assert from 'assert';
import * as vscode from 'vscode';
import addField from '../addField';
import * as sinon from 'sinon';

suite('addField Test Suite', () => {

    test('addField test 1', async () => {
        const documentContent = `
asyncapi: 2.5.0
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: A-Team
    email: a-team@goarmy.com
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 2', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: A-Team
    email: a-team@goarmy.com
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 3', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: A-Team
    email: a-team@goarmy.com
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 4', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    name: test name
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: test name
    email: a-team@goarmy.com
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 5', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    name: test name
    email: test email
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: test name
    email: test email
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 6', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    name: test name
    url: testurl
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: test name
    url: testurl
    email: a-team@goarmy.com
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 7', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    url: https://goarmy.com/apis/support
    email: a-team@goarmy.com
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    url: https://goarmy.com/apis/support
    email: a-team@goarmy.com
    name: A-Team
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 8', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    url: 
    email: a-team@goarmy.com
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    url: https://goarmy.com/apis/support
    email: a-team@goarmy.com
    name: A-Team
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 9', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    url: 
    email: 
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    url: https://goarmy.com/apis/support
    email: a-team@goarmy.com
    name: A-Team
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 10', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    url: 
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    url: https://goarmy.com/apis/support
    name: A-Team
    email: a-team@goarmy.com
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 11', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    name: 
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    name: A-Team
    email: a-team@goarmy.com
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 12', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    email: 
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    email: a-team@goarmy.com
    name: A-Team
    url: https://goarmy.com/apis/support
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 13', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  contact:
    url: 
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'contact';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  contact:
    url: https://goarmy.com/apis/support
    name: A-Team
    email: a-team@goarmy.com
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 14', async () => {
        const documentContent = `
asyncapi: 2.5.0
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'description';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  description: Description of the API
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 15', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'description';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  description: Description of the API
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

    test('addField test 16', async () => {
        const documentContent = `
asyncapi: 2.5.0
info:
  description:
      `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
        const given = '$.info';
        const field = 'description';

        const result = await addField(document, range, given, field);

        const expected = `
asyncapi: 2.5.0
info:
  description: Description of the API
      `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());
    });

});
