const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');

function loadSource(file, overrides = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const localRequire = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), name.endsWith('.ts') ? name : name + '.ts');
      return loadSource(path.relative(path.resolve(__dirname, '..'), resolved), overrides);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

const secrets = loadSource('src/secretSettings.ts');
const { findLoader } = loadSource('src/loaderMatch.ts');

function config(overrides = {}) {
  return {
    remoteRefsMode: 'auto',
    remoteAuth: {},
    loaders: [],
    allowedHosts: [],
    outputVerbosity: 'off',
    ...overrides
  };
}

test('findLoader treats HTTP(S) match as a literal prefix, not a regex', () => {
  const loaders = [{ match: 'https://bitbucket.example.com/projects/' }];
  assert.ok(findLoader('https://bitbucket.example.com/projects/FOO/raw/api.yaml', loaders));
  assert.equal(findLoader('https://bitbucket.example.com.attacker.test/projects/', loaders), undefined);
  assert.equal(findLoader('https://bitbucket.example.com/other/', loaders), undefined);
});

test('referencedSecretKeys is the set of passwordSecret and bearerTokenSecret names', () => {
  assert.deepEqual(
    secrets.referencedSecretKeys(config({
      remoteAuth: { bearerTokenSecret: 'sso' },
      loaders: [{ basic: { passwordSecret: 'sso' } }, { bearerTokenSecret: 'registry' }]
    })).sort(),
    ['registry', 'sso']
  );
});

test('secretKeysForUrl returns the named secret already configured for that URL', () => {
  const cfg = config({
    remoteAuth: { bearerTokenSecret: 'fallback' },
    loaders: [{ match: 'https://bitbucket.example.com/projects/', basic: { username: 'ada', passwordSecret: 'sso' } }]
  });
  assert.deepEqual(
    secrets.secretKeysForUrl('https://bitbucket.example.com/projects/FOO/raw/api.yaml', cfg),
    ['sso']
  );
  assert.deepEqual(secrets.secretKeysForUrl('https://registry.example/schema.yaml', cfg), ['fallback']);
});

test('secretKeysForUrl omits named secrets shadowed by inline credentials', () => {
  const cfg = config({
    loaders: [{
      match: 'https://bitbucket.example.com/projects/',
      basic: { username: 'ada', password: 'inline', passwordSecret: 'sso' },
      bearerTokenSecret: 'unused-bearer'
    }],
    remoteAuth: { bearerToken: 'inline-token', bearerTokenSecret: 'registry' }
  });
  assert.deepEqual(
    secrets.secretKeysForUrl('https://bitbucket.example.com/projects/FOO/raw/api.yaml', cfg),
    []
  );
  assert.deepEqual(secrets.secretKeysForUrl('https://registry.example/schema.yaml', cfg), []);
});

test('secretKeysForUrl prefers passwordSecret over bearerTokenSecret when Basic would win', () => {
  const cfg = config({
    loaders: [{
      match: 'https://bitbucket.example.com/projects/',
      bearerTokenSecret: 'unused-bearer',
      basic: { username: 'ada', passwordSecret: 'sso' }
    }]
  });
  assert.deepEqual(
    secrets.secretKeysForUrl('https://bitbucket.example.com/projects/FOO/raw/api.yaml', cfg),
    ['sso']
  );
});

test('plaintextCredentialFields lists inline passwords and tokens', () => {
  assert.deepEqual(
    secrets.plaintextCredentialFields(config({
      remoteAuth: { bearerToken: 't', basic: { password: 'p' } },
      loaders: [{ match: 'https://a.example/', bearerToken: 'x' }, { basic: { password: 'y' } }]
    })),
    [
      'asyncapi.remoteAuth.bearerToken',
      'asyncapi.remoteAuth.basic.password',
      'asyncapi.loaders[0].bearerToken',
      'asyncapi.loaders[1].basic.password'
    ]
  );
  assert.deepEqual(secrets.plaintextCredentialFields(config({
    loaders: [{ basic: { username: 'ada', passwordSecret: 'sso' } }]
  })), []);
});
