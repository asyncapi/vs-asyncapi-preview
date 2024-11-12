import * as assert from 'assert';
import * as vscode from 'vscode';
import updateURL from '../updateURL';
import * as sinon from 'sinon';

suite('updateURL Test Suite', () => {
    let inputBoxStub: sinon.SinonStub;

    test('updateURL test 1', async () => {
        const documentContent = `
servers:
  production:
    url: api.example.{}.com
    protocol: amqp
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('api.example.com');

        const result = await updateURL(document, range, given, field);

        const expected = `
servers:
  production:
    url: api.example.com
    protocol: amqp
    `;
        inputBoxStub.restore();
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('updateURL test 2', async () => {
        const documentContent = `
servers:
  production:
    url: api.example.{}.com
    protocol: amqp
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('');

        const result = await updateURL(document, range, given, field);

        const expected = `
servers:
  production:
    url: api.example.{}.com
    protocol: amqp
    `;
        inputBoxStub.restore();
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('updateURL test 3', async () => {
        const documentContent = `
servers:
  production:
    url: api.example.{}.com
    protocol: amqp
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('123.com');

        const result = await updateURL(document, range, given, field);

        const expected = `
servers:
  production:
    url: 123.com
    protocol: amqp
    `;
        inputBoxStub.restore();
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('updateURL test 4', async () => {
        const documentContent = `
servers:
  production:
    url: api.example.{}.com
    protocol: amqp
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
        const given = '';
        const field = '$';

        inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('example.com');

        const result = await updateURL(document, range, given, field);

        const expected = `
servers:
  production:
    url: example.com
    protocol: amqp
    `;
        inputBoxStub.restore();
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

});
