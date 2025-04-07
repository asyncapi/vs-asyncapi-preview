[![Marketplace Version](https://vsmarketplacebadges.dev/version/asyncapi.asyncapi-preview.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=asyncapi.asyncapi-preview) [![Marketplace Downloads](https://vsmarketplacebadges.dev/downloads-short/asyncapi.asyncapi-preview.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=asyncapi.asyncapi-preview.svg)

# VS AsyncAPI Preview

This VS Code extension provides previewing, linting, and visualization features for AsyncAPI documents.

## Features

- **AsyncAPI Preview:** View rendered AsyncAPI documents directly in VS Code
- **EDA Visualizer:** Visualize event-driven architecture diagrams
- **Smart Paste:** Automatically convert JSON into AsyncAPI schemas
- **Spectral Linting:** Validate your AsyncAPI documents with Spectral

## Getting Started

### Running the Extension

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the extension:
   ```bash
   npm run compile
   ```

3. Run the extension:
   - Press F5 in VS Code
   - This will open a new VS Code window with the extension loaded

### Using the Extension

1. Open an AsyncAPI file (examples/streetlights.yaml)
2. Use one of the following methods to preview:
   - Click the preview icon in the editor title bar
   - Press Ctrl+Shift+P and search for "AsyncAPI: Preview"
   - Right-click in the editor and select "AsyncAPI: Preview"

3. View the EDA visualizer:
   - Press Ctrl+Shift+P and search for "AsyncAPI: EDA Visualizer"

4. Use Smart Paste:
   - Copy a JSON example
   - Right-click in the editor under the schemas section
   - Select "AsyncAPI: Paste as Schema"

## Development Notes

### Adding Custom Spectral Rules

You can create a custom ruleset file and specify its path in your VS Code settings:

```json
{
  "asyncapi.linting.customRulesetPath": "path/to/ruleset.json"
}
```

The ruleset file should follow Spectral's ruleset format.

### Troubleshooting

If you encounter issues with dependencies, try:

1. Delete the node_modules directory:
   ```bash
   rm -rf node_modules
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

3. Reinstall dependencies:
   ```bash
   npm install
   ```

### Logging

You can adjust the logging level in VS Code settings:

```json
{
  "asyncapi.logging.level": "debug" // Options: none, error, warn, info, debug
}
```

## Example AsyncAPI Document

An example AsyncAPI document is provided in the `examples` directory. Open `examples/streetlights.yaml` to see a sample Streetlights API definition.

## Key Features

### Preview and Visualize
- **Document Preview**: Render your AsyncAPI documents in a readable format
- **EDA Visualizer**: Visualize the event-driven architecture described in your AsyncAPI document
- **Automatic hot-reloading**: Changes automatically refresh when you save files

### Linting and Validation
- **Spectral Linting**: Validate your AsyncAPI documents using Spectral rules
- **Custom Rulesets**: Add your own validation rules via custom rulesets
- **Quick Fixes**: Automatic suggestions to fix common issues

### Content Assistance
- **Code Snippets**: Speed up development with pre-built AsyncAPI snippets
- **Smart Paste**: Convert JSON examples to AsyncAPI schema objects

## Linting with Spectral

The extension includes integrated Spectral linting to validate your AsyncAPI documents against best practices and standards. Issues are displayed inline in your document with appropriate severity levels.

### Custom Rules

You can create your own validation ruleset by creating a JSON file with your rules. Specify the path to this file in the extension settings.

Example ruleset format:
```json
{
  "rules": {
    "info-contact-required": {
      "description": "Info object must have a contact object with name and email",
      "message": "The info object must contain a contact object with name and email",
      "severity": "error",
      "given": "$.info",
      "then": {
        "field": "contact",
        "function": "truthy"
      }
    }
  }
}
```

A complete example can be found in the [docs/custom-ruleset-example.json](docs/custom-ruleset-example.json) file.

### Configuration

The linting feature can be configured in the extension settings:

- `asyncapi.linting.enabled`: Enable or disable linting
- `asyncapi.linting.autoLintOnSave`: Automatically lint documents when saving
- `asyncapi.linting.customRulesetPath`: Path to a custom ruleset file

## Automatic hot-reloading

Automatic hot-reloading on editor save, but currently, it doesn't reload when saving referenced external files.

## Content Assistance

### Available snippets:

Open an empty or otherwise yaml file and start typing one of the following prefixes, you may need to press `Ctrl+space` to trigger autocompletion in some cases:

- `add asyncapi skeleton`: Adds an asyncapi skeleton for jump starting your API editing.
- `add asyncapi subscribe to async request`: Inserts a new subscribe operation, for listening to incoming async requests/commands.
- `add asyncapi publish event operation`: Inserts a new publish operation, for producing domain events.
- `add asyncapi message`: Inserts a new message, you can choose it to be either a **Request** or an **Event**.

Once snippets are inserted use the `<TAB>` key to travel between snippet placeholders.

## Paste as Schema

You can also autogenerate an Schema object from a JSON example.

Right-click inside `#/components/schemas` section and choose `AsyncAPI: Paste as Schema` from the context menu.

![VSCode AsyncapiPreview - Content Assistance](docs/VSCode%20AsyncAPI%20Content%20Assistance-X4.gif)

## Logging

You can configure the logging level in settings:

- `asyncapi.logging.level`: Set the logging level (none, error, warn, info, debug)

To view logs, open the Output panel and select "AsyncAPI Preview" from the dropdown.

### Credits

AsyncAPI Viewer utilizes the following open source projects:

- [@asyncapi/asyncapi-react](https://github.com/asyncapi/asyncapi-react/tree/next)
- [@asyncapi/parser](https://github.com/asyncapi/parser)
- [@asyncapi/spectral-ruleset](https://github.com/asyncapi/spectral-ruleset)
- [@stoplight/spectral-core](https://github.com/stoplightio/spectral)

### Contributors

Ivan Garcia Sainz-Aja [ivangsa](https://github.com/ivangsa)
