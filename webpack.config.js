//@ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  devtool: 'nosources-source-map',
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
  plugins: [
    require('copy-webpack-plugin').default({
      patterns: [
        {
          from: 'node_modules/@asyncapi/react-component/browser/standalone/index.js',
          to: 'node_modules/@asyncapi/react-component/browser/standalone/index.js',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/@asyncapi/react-component/styles/default.min.css',
          to: 'node_modules/@asyncapi/react-component/styles/default.min.css',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/@asyncapi/edavisualiser/browser/standalone/index.js',
          to: 'node_modules/@asyncapi/edavisualiser/browser/standalone/index.js',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/@asyncapi/edavisualiser/styles/default.min.css',
          to: 'node_modules/@asyncapi/edavisualiser/styles/default.min.css',
          noErrorOnMissing: true
        },
        // Fallback paths for newer versions
        {
          from: 'node_modules/@asyncapi/react-component/web/react-component.js',
          to: 'node_modules/@asyncapi/react-component/browser/standalone/index.js',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/@asyncapi/react-component/web/react-component.css',
          to: 'node_modules/@asyncapi/react-component/styles/default.min.css',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/@asyncapi/edavisualiser/web/eda-visualiser.js',
          to: 'node_modules/@asyncapi/edavisualiser/browser/standalone/index.js',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/@asyncapi/edavisualiser/web/eda-visualiser.css',
          to: 'node_modules/@asyncapi/edavisualiser/styles/default.min.css',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
};
module.exports = [extensionConfig];
