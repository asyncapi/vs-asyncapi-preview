[![Marketplace Version](https://vsmarketplacebadges.dev/version/asyncapi.asyncapi-preview.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=asyncapi.asyncapi-preview) [![Marketplace Downloads](https://vsmarketplacebadges.dev/downloads-short/asyncapi.asyncapi-preview.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=asyncapi.asyncapi-preview.svg)

# AsyncAPI Preview
 
Preview AsyncAPI documents inside VSCode.

AsyncAPI Preview was simplified and reworked from scratch to use the latest [@asyncapi/asyncapi-react](https://github.com/asyncapi/asyncapi-react/tree/next), removing old dependencies on Express, socket.io and js-yaml with better startup performance and bundle size.

You can open AsyncAPI Preview from the editor title/context menu. (If you don't see that button, you can use `shift+command+P` to open command palette and select `Preview AsyncAPI`)

![AsyncAPI Preview](docs/asyncapi-editor-title-context.png)

## Web Extension Compatibility

The extension now runs in the web version of VS Code i.e. directly in your browser on `vscode.dev`, `github.dev`, `gitlab.com/-/ide`, `gitpod.io`, and other cloud development environments, as well as a local browser host for development.

### Key Benefits

- No install required: open a repo in your browser and preview AsyncAPI files without a desktop VS Code.
- Works on vscode.dev, github.dev, GitLab Web IDE, Gitpod & more: perfect for quick reviews during PRs or exploring examples.
- Consistent experience: same preview workflow on desktop and web.

### Usage

A) On vscode.dev / github.dev

1. Open your repo:
   - https://vscode.dev/github/<org>/<repo> (or use the . keyboard shortcut on GitHub to open github.dev).
2. Install AsyncAPI Preview in that browser session (Command Palette → "Extensions: Install from VSIX…" if you're side-loading, or from Marketplace once the web-ready version is published).
3. Open an *.yaml / *.yml (or JSON) AsyncAPI file.
4. Run AsyncAPI: Preview Document from the Command Palette (⇧⌘P / Ctrl+Shift+P).

B) Locally in a browser (dev/test)

1. Install dependencies & build:

```
npm install
npm run build
```

2. Add a dev script to package.json to launch a web host:

```
{
  "scripts": {
    "open-in-browser": "vscode-test-web --extensionDevelopmentPath=. --port=8082 ."
  },
  "devDependencies": {
    "@vscode/test-web": "^1.x.x"
  }
}
```

Then:

```
npm run open-in-browser
```

This opens a web VS Code at http://localhost:8082. Open a workspace/folder that contains your AsyncAPI YAMLs, then run AsyncAPI: Preview Document.

Tip: If you don’t see the preview, ensure your file’s language mode is YAML (bottom-right of the status bar), and check Developer: Show Running Extensions to confirm activation.

### Technical Changes
- Removed Node-only modules (e.g., direct path/fs usage).
- Introduced a lightweight pathUtils.ts for browser-safe path handling.
- Updated VS Code engine/types to enable web extension support.
- Removed unmaintained or web-incompatible pieces (e.g., legacy visualizer & Node-specific deps) to simplify the runtime and reduce bundle size.

### Current limitations
- The web host cannot use Node APIs; all file access must go through vscode.workspace.fs.
- Auto-reload works on the active document save; changes to externally referenced files may not hot-reload yet.
- vscode.dev can’t read your local disk—open files from a GitHub repo or use File → Open File… (upload) for one-off files.

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

### Credits

AsyncAPI Viewer utilizes the following open source projects:

- [@asyncapi/asyncapi-react](https://github.com/asyncapi/asyncapi-react/tree/next)

### Contributors

Ivan Garcia Sainz-Aja [ivangsa](https://github.com/ivangsa)
Ruchi Pakhle [Ruchip16](https://github.com/Ruchip16)
