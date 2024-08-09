import * as assert from 'assert';
import * as vscode from 'vscode';
import deleteRepeatedTags from '../deleteRepeatedTags';

suite('deleteRepeatedTags Test Suite', () => {

  /**
   * TEST: delete one-line repeated tag
   */

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
  - name: user
  - name: server
  - name: user
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
  - name: user
  - name: server
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
  - name: order
  - name: server
  - name: user
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
  - name: server
  - name: user
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
  - name: user
  - name: user
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(4, 0), new vscode.Position(4, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
  - name: user
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
  - name: order
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  /**
   * TEST: Delte repeated tags and its descendant items
   */

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
    description: Operations related to order
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(13, 0), new vscode.Position(13, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
    description: Operations related to order
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
  - name: user
    description: Operations related to users
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
    description: Operations related to order
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
  - name: user
    description: Operations related to users
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(11, 0), new vscode.Position(11, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
    description: Operations related to order
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
    description: Operations related to order
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
  - name: user
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(11, 0), new vscode.Position(11, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
    description: Operations related to order
  - name: user
    description: Operations related to users
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('deleteRepeatedTags should delete repeated tags from the file', async () => {
    const documentContent = `
tags:
  - name: order
    description: Operations related to order
  - name: user
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
  - name: user
    description: Operations related to users
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 0));
    const given = [''];
    const field = '$';

    const result = await deleteRepeatedTags(document, range, given, field);

    const expected = `
tags:
  - name: order
    description: Operations related to order
  - name: user
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
    `;
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

});
