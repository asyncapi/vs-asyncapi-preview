const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSource(file, overrides = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const localRequire = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.')) return loadSource(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')), overrides);
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

const bundler = loadSource('src/refBundler.ts');
const remoteUrl = 'https://registry.example/messages.yaml';
const remoteText = 'Remote:\n  name: Remote\n  payload:\n    type: string\n';
const root = {
  asyncapi: '2.6.0',
  info: { title: 'Mixed references', version: '1.0.0' },
  channels: {
    remote: { subscribe: { message: { $ref: remoteUrl + '#/Remote' } } },
    local: { subscribe: { message: { $ref: './messages.yaml#/Ping' } } }
  }
};

test('workspace and file references never reach the host reader', async () => {
  for (const rootUrl of ['file:///C:/workspace/asyncapi.yaml', 'vscode-remote://ssh-remote+host/workspace/asyncapi.yaml', 'vscode-vfs://github/org/repo/asyncapi.yaml']) {
    const document = structuredClone(root);
    const localRefs = ['./messages.yaml#/Ping', '../../.ssh/id_rsa', 'file:///C:/Users/user/.ssh/id_rsa', 'file:///home/user/.ssh/id_rsa'];
    document['x-local-refs'] = localRefs.map($ref => ({ $ref }));
    const reads = [];
    const result = await bundler.bundleExternalRefs(rootUrl, JSON.stringify(document), async url => {
      reads.push(url);
      assert.equal(url, remoteUrl);
      return remoteText;
    });
    assert.deepEqual(reads, [remoteUrl]);
    assert.deepEqual(result.document['x-local-refs'], document['x-local-refs']);
    assert.equal(result.document.channels.local.subscribe.message.$ref, './messages.yaml#/Ping');
    assert.deepEqual(Object.values(result.document['x-remote-refs']), [{ Remote: { name: 'Remote', payload: { type: 'string' } } }]);
  }
});

test('remote relative dependencies and internal pointers are bundled', async () => {
  const reads = [];
  const result = await bundler.bundleExternalRefs('file:///workspace/root.yaml', JSON.stringify({ $ref: remoteUrl }), async url => {
    reads.push(url);
    return url === remoteUrl ? 'Remote:\n  $ref: ./payload.yaml#/Payload\n' : 'Payload:\n  type: object\n  properties:\n    child:\n      $ref: "#/Payload"\n';
  });
  assert.deepEqual(reads, [remoteUrl, 'https://registry.example/payload.yaml']);
  for (const document of Object.values(result.document['x-remote-refs'])) {
    const ref = document.Remote?.$ref || document.Payload.properties.child.$ref;
    assert.match(ref, /^#\/x-remote-refs\//);
  }
});

test('remote documents cannot reference filesystem dependencies', async () => {
  for (const ref of ['file:///C:/Users/user/.ssh/id_rsa', 'vscode-remote://ssh-remote+host/etc/passwd']) {
    const reads = [];
    await assert.rejects(bundler.bundleExternalRefs('file:///workspace/root.yaml', JSON.stringify({ $ref: remoteUrl }), async url => {
      reads.push(url);
      return JSON.stringify({ $ref: ref });
    }), /remote documents can only reference other HTTP\(S\) documents/);
    assert.deepEqual(reads, [remoteUrl]);
  }
});

test('resolver rejects non-HTTP readers without accessing the workspace filesystem', async () => {
  let filesystemReads = 0;
  const { DocumentResolver } = loadSource('src/DocumentResolver.ts', {
    vscode: { workspace: { fs: { readFile() { filesystemReads++; throw new Error('Privileged filesystem read'); } } } },
    './remoteFetch': { createRemoteReader: () => async () => remoteText }
  });
  const reader = new DocumentResolver({}, {}).createReader({});
  for (const url of ['file:///etc/passwd', 'vscode-vfs://github/org/repo/file', '../file']) {
    await assert.rejects(reader(url), /only accepts HTTP\(S\)/);
  }
  assert.equal(await reader(remoteUrl), remoteText);
  assert.equal(filesystemReads, 0);
});

test('browser parser resolves mixed bundles relative to the original source URL', async () => {
  globalThis.self = globalThis;
  const Parser = require('@asyncapi/parser/browser/index.js');
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    res.setHeader('Content-Type', 'application/yaml');
    res.end('Ping:\n  name: Ping\n  payload:\n    type: string\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const bundled = await bundler.bundleExternalRefs('file:///workspace/asyncapi.yaml', JSON.stringify(root), async () => remoteText);
    const result = await new Parser().parse(JSON.stringify(bundled.document), {
      source: `http://127.0.0.1:${server.address().port}/workspace/asyncapi.yaml`
    });
    assert.deepEqual(result.diagnostics.filter(d => d.severity === 0), []);
    assert.ok(result.document);
    assert.deepEqual(requests, ['/workspace/messages.yaml']);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
