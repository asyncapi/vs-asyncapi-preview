import * as assert from 'assert';
import * as vscode from 'vscode';
import deleteEmptyParam from '../deleteEmptyParam';

suite('deleteEmptyParam Test Suite', () => {

    test('deleteEmptyParam test 1', async () => {
        const documentContent = `
channels:
  order/{us}/{}/created:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 2', async () => {
        const documentContent = `
channels:
  order/{us}/{}/created/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 3', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/order/{us}/{}/created/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 4', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/{server}/order/{us}/{}/{}/{}/created/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /{server}/order/{us}/created:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 5', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/order/{us}/{}/created/{}/{}/{patch}/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 6', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/order/{}/{}/{us}/{}/created/{}/{}/{patch}/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 7', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/order/{}/{}/{us}/{}/created/{}/{}/{patch}/{}=
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}=
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });


    test('deleteEmptyParam test 8', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/order/{}/{}/{us}/{}/created/{}/{}/{patch}/{}/{}
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 9', async () => {
        const documentContent = `
channels:
  /{}/{}/{}/order/{}/{}/{us}/{}/////created/{}/{}/{patch}/{}/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 10', async () => {
        const documentContent = `
channels:
  ////{}/{}/{}/order/{}/{}/{us}/{}/////created/{}/{}/{patch}/{}/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteEmptyParam test 11', async () => {
        const documentContent = `
channels:
  ////{}/{}/{}/order/{}////{}/{us}/{}/////created/{}////{}/{patch}/{}/{}:
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
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 0));
        const given = '';
        const field = '$';

        const result = await deleteEmptyParam(document, range, given, field);

        const expected = `
channels:
  /order/{us}/created/{patch}:
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
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

});
