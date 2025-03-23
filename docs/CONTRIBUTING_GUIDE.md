# VS Code AsyncAPI Preview Extension
## Contributor's Guide

Thank you for your interest in contributing to the VS Code AsyncAPI Preview extension! This guide will help you understand the extension's architecture, development workflow, and how to contribute effectively.

## Table of Contents

1. [Setting Up Your Development Environment](#setting-up-your-development-environment)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Adding New Features](#adding-new-features)
5. [Testing](#testing)
6. [Common Issues](#common-issues)
7. [Release Process](#release-process)

## Setting Up Your Development Environment

### Prerequisites

- Node.js (v14+)
- npm or yarn
- VS Code

### Setup Steps

1. **Clone the repository**
   ```
   git clone https://github.com/asyncapi/vs-asyncapi-preview.git
   cd vs-asyncapi-preview
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Open in VS Code**
   ```
   code .
   ```

4. **Compile the extension**
   ```
   npm run compile
   ```

5. **Run the extension**
   - Press F5 in VS Code to launch a new window with the extension loaded
   - Or run with `npm run watch` for auto-recompilation on changes

## Project Structure

```
vs-asyncapi-preview/
├── .github/                  # GitHub-specific files (workflows, templates)
├── .vscode/                  # VS Code settings
├── dist/                     # Compiled output (generated)
├── docs/                     # Documentation
├── resources/                # Static resources
│   └── icons/                # Icon files
├── snippets/                 # Code snippets
├── src/                      # Source code
│   ├── providers/            # VS Code providers
│   ├── utils/                # Utility functions
│   ├── extension.ts          # Extension entry point
│   ├── PreviewWebPanel.ts    # AsyncAPI preview panel
│   ├── SmartPasteCommand.ts  # Smart paste functionality
│   └── Visualizer.ts         # Visualization functionality
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Prettier configuration
├── package.json              # Project metadata and dependencies
├── tsconfig.json             # TypeScript configuration
└── webpack.config.js         # Webpack configuration
```

## Core Components

### Extension Entry Point (`extension.ts`)

The extension entry point initializes all extension features, registers commands, and sets up event listeners. It's responsible for:
- Activating the extension
- Registering commands
- Setting up logging
- Initializing linting
- Handling VS Code events

### Preview Panel (`PreviewWebPanel.ts`)

This component creates and manages the preview webview panel that renders AsyncAPI documents using the @asyncapi/react-component library. It's responsible for:
- Creating the preview panel
- Rendering AsyncAPI documents
- Handling document changes
- Managing panel state

### Visualizer (`Visualizer.ts`)

The Visualizer creates a graphical representation of AsyncAPI documents using the @asyncapi/edavisualiser library, showing the event-driven architecture. It's responsible for:
- Creating the visualization panel
- Parsing and transforming AsyncAPI documents
- Rendering the architecture diagram

### Smart Paste (`SmartPasteCommand.ts`)

Smart Paste provides functionality to convert JSON examples to AsyncAPI schema objects. It's responsible for:
- Converting clipboard content to schemas
- Inserting schemas into documents

### Spectral Linting (`utils/SpectralLinter.ts`)

This component provides linting and validation for AsyncAPI documents using Spectral. It's responsible for:
- Validating documents against rules
- Providing diagnostics
- Supporting custom rulesets
- Offering quick fixes

## Adding New Features

When adding new features to the extension, please follow these guidelines:

1. **Create a new branch** from the main branch for your feature
   ```
   git checkout -b feature/your-feature-name
   ```

2. **Follow the project's coding style** 
   - Use TypeScript for type safety
   - Follow existing patterns in the codebase
   - Run linting (`npm run lint`) before submitting changes

3. **Document your changes**
   - Add JSDoc comments to functions and classes
   - Update the README if necessary
   - Add example files if appropriate

4. **Submit a pull request**
   - Describe the changes you've made
   - Reference any related issues
   - Explain how to test your changes

## Testing

Testing is essential to maintain the quality of the extension. When adding features or fixing bugs:

1. **Manual Testing**
   - Test with different AsyncAPI documents in various formats (JSON, YAML)
   - Test with large documents to ensure performance
   - Test error cases and edge cases

2. **Unit Testing** (future consideration)
   - Add unit tests for new functionality
   - Ensure existing tests pass

## Common Issues

### Webview Content is Not Displayed

If the webview content is not displaying:
- Check browser console logs for errors
- Ensure resources are properly referenced with webview URIs
- Verify the HTML content is properly formatted

### AsyncAPI Parser Issues

If the parser is failing:
- Check that the AsyncAPI document is valid
- Verify the parser version is compatible with the AsyncAPI version
- Look for syntax errors in the document

### Linting Issues

If linting is not working as expected:
- Check the configuration settings
- Ensure custom ruleset files are properly formatted
- Verify the document is recognized as an AsyncAPI document

## Release Process

The release process is automated using GitHub Actions. The workflow:

1. Create a pull request with your changes
2. Get approval from maintainers
3. Merge to main branch
4. The CI/CD pipeline will:
   - Run tests
   - Build the extension
   - Create a new version
   - Publish to the VS Code Marketplace

## Additional Resources

- [AsyncAPI Specification](https://www.asyncapi.com/docs/specifications/latest)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Spectral Documentation](https://meta.stoplight.io/docs/spectral/ZG9jOjYx-spectral-overview)
- [AsyncAPI React Component](https://github.com/asyncapi/asyncapi-react)
- [AsyncAPI Parser](https://github.com/asyncapi/parser-js)

Thank you for contributing to make the VS Code AsyncAPI Preview extension better! 