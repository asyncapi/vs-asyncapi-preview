//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const common = {
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
};

/**
 * Desktop bundle: runs in the Node.js extension host, so remote references can be
 * resolved with `https.request` (VS Code proxy support and system certificates).
 * @type WebpackConfig
 */
const nodeConfig = {
  ...common,
  target: 'node', // 📖 -> https://webpack.js.org/configuration/node/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'node/extension.js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      __WEB_EXTENSION__: JSON.stringify(false),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@asyncapi/react-component/browser/standalone/index.js',
          to: 'node_modules/@asyncapi/react-component/browser/standalone/index.js',
        },
        {
          from: 'node_modules/@asyncapi/react-component/styles/default.min.css',
          to: 'node_modules/@asyncapi/react-component/styles/default.min.css',
        },
      ],
    }),
  ],
};

/**
 * Web bundle (vscode.dev): runs in a web worker, where requests are subject to the
 * browser CORS policy, so authenticated remote references only work against servers
 * that allow cross origin requests.
 * @type WebpackConfig
 */
const webConfig = {
  ...common,
  target: 'webworker',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'web/extension.js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js'],
    fallback: {
      // Node builtins are only reachable from the Node bundle (see __WEB_EXTENSION__).
      http: false,
      https: false,
      fs: false,
      path: false,
      url: false,
      buffer: false,
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      __WEB_EXTENSION__: JSON.stringify(true),
    }),
  ],
};

module.exports = [nodeConfig, webConfig];
