import * as assert from 'assert';
import * as vscode from 'vscode';
import addDescription from '../addDescription';
import * as sinon from 'sinon';

suite('addDescription Test Suite', () => {
  let inputBoxStub: sinon.SinonStub;

  test('addDescription test 1', async () => {
    const documentContent = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        summary: Receive user creation events
        operationId: receiveUserCreated
        message:
          contentType: application/json
          payload:
            type: object
            properties:
              userId:
                type: string
              userName:
                type: string
      `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });
    const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument());
    editor.options.tabSize = 2;

    const range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 0));
    const given = '';
    const field = '$';

    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('new description');

    const result = await addDescription(document, range, given, field);

    const expected = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        description: new description
        summary: Receive user creation events
        operationId: receiveUserCreated
        message:
          contentType: application/json
          payload:
            type: object
            properties:
              userId:
                type: string
              userName:
                type: string
      `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('addDescription test 2', async () => {
    const documentContent = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        summary: Receive user creation events
        operationId: receiveUserCreated
        message:
          contentType: application/json
          payload:
            type: object
            properties:
              userId:
                type: string
              userName:
                type: string
      `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });
    const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument());
    editor.options.tabSize = 2;

    const range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 0));
    const given = '';
    const field = '$';

    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('');

    const result = await addDescription(document, range, given, field);

    const expected = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        summary: Receive user creation events
        operationId: receiveUserCreated
        message:
          contentType: application/json
          payload:
            type: object
            properties:
              userId:
                type: string
              userName:
                type: string
      `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('addDescription test 3', async () => {
    const documentContent = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        summary: Receive user creation events
        operationId: receiveUserCreated
        message:
          contentType: application/json
          payload:
            type: object
            properties:
              userId:
                type: string
              userName:
                type: string
      `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });
    const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument());
    editor.options.tabSize = 2;

    const range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 0));
    const given = '';
    const field = '$';

    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('123');

    const result = await addDescription(document, range, given, field);

    const expected = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        description: 123
        summary: Receive user creation events
        operationId: receiveUserCreated
        message:
          contentType: application/json
          payload:
            type: object
            properties:
              userId:
                type: string
              userName:
                type: string
      `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('addDescription test 4', async () => {
    const documentContent = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
      `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });
    const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument());
    editor.options.tabSize = 2;

    const range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 0));
    const given = '';
    const field = '$';

    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('123');

    const result = await addDescription(document, range, given, field);

    const expected = `
  channels:
    user/created:
      description: Channel for user creation events.
      subscribe:
        description: 123
      `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

});
