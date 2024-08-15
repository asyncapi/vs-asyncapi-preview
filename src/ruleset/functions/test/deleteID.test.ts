import * as assert from 'assert';
import * as vscode from 'vscode';
import deleteID from '../deleteID';

suite('deleteID Test Suite', () => {

    /**
     * TEST: delete one-line repeated tag
     */

    test('deleteID test 1', async () => {
        const documentContent = `
channels:
  order/{us}/created/{creation}:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/{update}/{server}:
    description: Channel for order update
    subscribe:
      description: description for subscribe
      operationId: operation1
      summary: Receive order update events
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(25, 0), new vscode.Position(25, 0));
        const given = '';
        const field = '$';

        const result = await deleteID(document, range, given, field);

        const expected = `
channels:
  order/{us}/created/{creation}:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/{update}/{server}:
    description: Channel for order update
    subscribe:
      description: description for subscribe
      operationId: operation1
      summary: Receive order update events
      message:
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

    test('deleteID test 2', async () => {
        const documentContent = `
channels:
  order/{us}/created/{creation}:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/{update}/{server}:
    description: Channel for order update
    subscribe:
      description: description for subscribe
      operationId: receiveOrderCreated
      summary: Receive order update events
      message:
        messageId: trueMessage1
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(22, 0), new vscode.Position(22, 0));
        const given = '';
        const field = '$';

        const result = await deleteID(document, range, given, field);

        const expected = `
channels:
  order/{us}/created/{creation}:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/{update}/{server}:
    description: Channel for order update
    subscribe:
      description: description for subscribe
      summary: Receive order update events
      message:
        messageId: trueMessage1
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });


    test('deleteID test 3', async () => {
        const documentContent = `
channels:
  order/{us}/created/{creation}:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/{update}/{server}:
    description: Channel for order update
    subscribe:
      description: description for subscribe
      operationId: receiveOrderCreated
      summary: Receive order update events
      message:
        messageId: trueMessage
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
    `;
        const document = await vscode.workspace.openTextDocument({
            content: documentContent,
            language: 'yaml'
        });

        const range = new vscode.Range(new vscode.Position(26, 0), new vscode.Position(26, 0));
        const given = '';
        const field = '$';

        const result = await deleteID(document, range, given, field);

        const expected = `
channels:
  order/{us}/created/{creation}:
    description: Channel for order creation events
    subscribe:
      summary: Receive order creation events
      operationId: receiveOrderCreated
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
      description: Description for subscribe
  order/{update}/{server}:
    description: Channel for order update
    subscribe:
      description: description for subscribe
      operationId: receiveOrderCreated
      summary: Receive order update events
      message:
        messageId: trueMessage
        contentType: application/json
        payload:
          type: object
          properties:
            orderId:
              type: string
            totalAmount:
              type: number
    `;
        assert.ok(result, 'The result is undefined, the test failed.');
        assert.strictEqual(result.trim(), expected.trim());

    });

});
