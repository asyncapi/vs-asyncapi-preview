const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
    files: 'src/ruleset/functions/test/*.test.ts',

    mocha: {
        require: ['ts-node/register']
    }
});
