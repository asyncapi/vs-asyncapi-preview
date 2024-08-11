import * as assert from 'assert';
import * as vscode from 'vscode';
import deleteEndingSlash from '../deleteEndingSlash';

suite('deleteEndingSlash Test Suite', () => {

  /**
   * TEST: delete one-line endling slash
   */

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
user/:
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
user:
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
user//:
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
user:
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
user////:
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
user:
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
user/
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
user
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
user//
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
user
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
user////
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
user
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  /**
   * TEST delete ending slashes for one of channels
   */

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
channels:
  order/{us}/created///:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/created:
    description: Channel for user signup events
  user/noted:
    description: Channel for user signup events
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(16, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
channels:
  order/{us}/created:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/created:
    description: Channel for user signup events
  user/noted:
    description: Channel for user signup events
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteEndingSlash should delete ending slashes from the file', async () => {
    const documentContent = `
channels:
  order/{us}/created:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/created/:
    description: Channel for user signup events
  user/noted:
    description: Channel for user signup events
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(17, 0), new vscode.Position(18, 0));
    const given = '';
    const field = '$';

    const result = await deleteEndingSlash(document, range, given, field);

    const expected = `
channels:
  order/{us}/created:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/created:
    description: Channel for user signup events
  user/noted:
    description: Channel for user signup events
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

});
