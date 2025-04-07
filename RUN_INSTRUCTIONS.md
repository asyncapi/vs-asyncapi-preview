# Running the VS Code AsyncAPI Preview Extension

## Steps to Run the Extension

### 1. Open the Project in VS Code
The project is already open in VS Code, so this step is complete.

### 2. Install Dependencies
Run this command in the terminal:
```
npm install
```
If you encounter any errors during installation, try:
```
npm cache clean --force
rm -rf node_modules
npm install
```

### 3. Run the Extension (F5 Method)
1. Press `F5` in VS Code 
2. This will:
   - Compile the extension
   - Launch a new VS Code window with the extension loaded
   - The new window is called the "Extension Development Host"

### 4. Open an AsyncAPI Document
1. In the Extension Development Host window, open the example AsyncAPI document:
   - File → Open File... → Navigate to `examples/streetlights.yaml`
   - Or, open the Explorer sidebar and navigate to the `examples` folder

### 5. Preview the AsyncAPI Document
Use one of these methods:
1. Click the preview icon in the editor title bar
2. Press `Ctrl+Shift+P` to open the Command Palette, then type and select "AsyncAPI: Preview"
3. Right-click in the editor and select "AsyncAPI: Preview" from the context menu

### 6. Try Other Features
- **Visualize**: Press `Ctrl+Shift+P` and run "AsyncAPI: EDA Visualizer"
- **Smart Paste**: Copy a JSON example, right-click in the editor and select "AsyncAPI: Paste as Schema"
- **Lint**: Errors and warnings will be shown in the editor

## Troubleshooting

- If you see errors related to Spectral ruleset, the extension now uses `@stoplight/spectral-rulesets` instead of the non-existent `@asyncapi/spectral-ruleset`.
- To check logs, open the Output panel (View → Output) and select "AsyncAPI Extension" from the dropdown.
- If the extension doesn't activate, check the Developer Tools console (Help → Toggle Developer Tools).

## Viewing Your Changes

Any changes you make to the extension code will require you to:
1. Stop the extension (close the Extension Development Host)
2. Press F5 again to launch with your changes

## Expected Behavior

When previewing the AsyncAPI document, you should see:
- The rendered AsyncAPI documentation with server information, channels, and schemas
- Proper linting highlighting any issues in the document
- The ability to visualize the event flows 