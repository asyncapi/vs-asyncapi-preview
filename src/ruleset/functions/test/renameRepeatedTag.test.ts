import * as assert from 'assert';
import * as vscode from 'vscode';
import renameRepeatedTag from '../renameRepeatedTag';
import * as sinon from 'sinon';


suite('renameRepeatedTag Test Suite', () => {
  let inputBoxStub: sinon.SinonStub;

  /**
   * TEST: delete one-line repeated tag
   */

  test('renameRepeatedTag test 1', async () => {
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
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('user2');

    const result = await renameRepeatedTag(document, range, given, field);

    const expected = `
tags:
  - name: order
  - name: user
  - name: server
  - name: user2
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('renameRepeatedTag test 2', async () => {
    const documentContent = `
tags:
  - name: order
  - name: server
  - name: user
  - name: user
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 0));
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('user2');

    const result = await renameRepeatedTag(document, range, given, field);

    const expected = `
tags:
  - name: order
  - name: server
  - name: user
  - name: user2
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('renameRepeatedTag test 3', async () => {
    const documentContent = `
tags:
  - name: user
  - name: user
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(3, 0), new vscode.Position(3, 0));
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('user2');

    const result = await renameRepeatedTag(document, range, given, field);

    const expected = `
tags:
  - name: user
  - name: user2
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  /**
* TEST: rename repeated tag having descendant items
*/

  test('renameRepeatedTag test 4', async () => {
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
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('user2');

    const result = await renameRepeatedTag(document, range, given, field);

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
  - name: user2
    description: Operations related to users
    `;
    inputBoxStub.restore();
    console.log('Expected:', expected.trim());
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('renameRepeatedTag test 5', async () => {
    const documentContent = `
tags:
  - name: order
    description: Operations related to order
    - name: server
    description: Opearations related to order
    externalDocs:
    description: More info about time
    url: https://time.example.com/docs
    - name: user
      description: Operations related to users
  - name: user
    description: Operations related to users
    `;
    const document = await vscode.workspace.openTextDocument({
      content: documentContent,
      language: 'yaml'
    });

    const range = new vscode.Range(new vscode.Position(11, 0), new vscode.Position(11, 0));
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('user2');

    const result = await renameRepeatedTag(document, range, given, field);

    const expected = `
tags:
  - name: order
    description: Operations related to order
    - name: server
    description: Opearations related to order
    externalDocs:
    description: More info about time
    url: https://time.example.com/docs
    - name: user
      description: Operations related to users
  - name: user2
    description: Operations related to users
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('renameRepeatedTag test 6', async () => {
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

    const range = new vscode.Range(new vscode.Position(11, 0), new vscode.Position(11, 0));
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('server2');

    const result = await renameRepeatedTag(document, range, given, field);

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
  - name: server2
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  test('renameRepeatedTag test 7', async () => {
    const documentContent = `
tags:
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
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

    const range = new vscode.Range(new vscode.Position(7, 0), new vscode.Position(7, 0));
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('server2');

    const result = await renameRepeatedTag(document, range, given, field);

    const expected = `
tags:
  - name: server
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
  - name: server2
    description: Opearations related to order
    externalDocs:
      description: More info about time
      url: https://time.example.com/docs
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

  /**
* TEST: No input
*/

  test('renameRepeatedTag test 1', async () => {
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
    const given = '';
    const field = '$';
    // Mocking vscode.window.showInputBox
    inputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('');

    const result = await renameRepeatedTag(document, range, given, field);

    const expected = `
tags:
  - name: order
  - name: user
  - name: server
  - name: user
    `;
    inputBoxStub.restore();
    assert.ok(result, 'The result is undefined, the test failed.');
    assert.strictEqual(result.trim(), expected.trim());

  });

});
