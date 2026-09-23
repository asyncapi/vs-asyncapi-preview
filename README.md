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
- The web host cannot use Node APIs. The extension runs near the UI: in the local Node extension host on desktop, including Remote SSH/WSL/Containers, and in your browser on vscode.dev/github.dev. HTTP(S) references use your machine's or browser's network access; workspace-relative references are loaded only by the webview through VS Code resource URLs. Browser requests remain subject to CORS — see [Remote references with authentication](#remote-references-with-authentication).
- Host-resolved previews do not follow HTTP(S) `$ref`s that appear only inside a workspace or `file:` dependency. The host never reads those files, and the bundled preview's CSP allows VS Code resource URLs only, so the webview cannot fetch the nested remote either. Put HTTP(S) `$ref`s in the root document or in another HTTP(S) document if they need to resolve. Without host resolution, those nested remotes still use webview/CORS as before.
- Auto-reload works on the active document save; changes to externally referenced files may not hot-reload yet.
- vscode.dev can’t read your local disk—open files from a GitHub repo or use File → Open File… (upload) for one-off files.

## Remote references with authentication

Documents that reference other documents over HTTP(S) — a schema registry, a Bitbucket/GitLab repository, an internal API catalog — are resolved by the **extension host** instead of the webview. That is what makes authentication possible: credentials never reach the preview, and on desktop the requests go through `https.request`, so the VS Code proxy settings (`http.proxy`, `http.proxySupport`) and the system certificate store (`http.systemCertificates`) apply.

HTTP(S) references are inlined under the root `x-remote-refs` extension and rewritten to local JSON pointers. Relative references inside downloaded HTTP(S) documents are resolved against their remote URL. Filesystem references, including workspace-relative paths and `file:` URLs, are never read or bundled by the host: they remain for the webview to resolve under its existing resource access controls. Documents without remote references keep being loaded directly by the webview, exactly as before.

> **This is off until you configure it.** With the default `"asyncapi.remoteRefs.resolve": "auto"` the extension host only resolves references when `asyncapi.loaders`, `asyncapi.remoteAuth` or `asyncapi.allowedHosts` is set. If you never touch those settings the preview behaves exactly as it did before — the webview loads the document and the browser CORS policy applies — so no request leaves your machine that did not leave it already. Use `"always"` to opt in without authentication (useful behind a corporate proxy) or `"never"` to disable host side resolution entirely.

### Settings

In an untrusted workspace, extension-host reference resolution and secret access are disabled, including when user settings select `"always"`. Previewing continues through the webview, with relative references loaded from the current workspace and HTTP(S) references subject to browser CORS. Workspace values for `asyncapi.remoteRefs.resolve`, `asyncapi.remoteAuth`, `asyncapi.loaders` and `asyncapi.allowedHosts` are ignored until trust is granted. The Set Secret and Delete Secret commands also require trust. Granting trust reloads open previews with the effective configuration.

Host resolution currently starts only when the root document contains an absolute HTTP(S) `$ref`. An HTTP(S) `$ref` found only inside a filesystem dependency is not bundled, and once the root *is* bundled the preview CSP also blocks the webview from fetching it (`connect-src` is VS Code resources only, so leftover browser requests cannot carry credentials). Put those HTTP(S) references in the root document, or in another HTTP(S) document, if they need to resolve. Without host resolution, nested remotes still use webview/CORS as before.

```jsonc
{
  // "auto" (default) resolves in the host only when the settings below are configured.
  // "always" | "never" force it on or off.
  "asyncapi.remoteRefs.resolve": "auto",

  // Per host authentication. The first entry whose `match` applies wins.
  // `match` is a URL prefix or a JavaScript regular expression.
  // HTTP(S) URL prefixes are literal; regex patterns should be simple to avoid excessive backtracking.
  "asyncapi.loaders": [
    {
      "match": "https://bitbucket.example.com/projects/",
      "basic": { "username": "my-user", "passwordSecret": "bitbucket-pat" }
    }
  ],

  // Fallback for any remote reference that does not match a loader.
  "asyncapi.remoteAuth": {
    "bearerTokenSecret": "registry-token"
  },

  // Hosts allowed to serve references. When empty, any host can be *read*,
  // but see "Where credentials are sent" below.
  "asyncapi.allowedHosts": ["bitbucket.example.com"],

  // Troubleshooting: logs to the "AsyncAPI Preview" output channel.
  "asyncapi.outputVerbosity": "debug"
}
```

Both `asyncapi.remoteAuth` and every `asyncapi.loaders` entry accept:

| Field | Description |
| --- | --- |
| `headers` | Static HTTP headers, e.g. `{ "X-Api-Key": "..." }` |
| `bearerToken` | Token sent as `Authorization: Bearer <token>` |
| `bearerTokenSecret` | Key of a token stored in the VS Code SecretStorage |
| `basic.username` / `basic.password` | HTTP basic authentication |
| `basic.passwordSecret` | Key of a password stored in the VS Code SecretStorage |

Credentials embedded in the reference itself (`https://user:password@host/api.yaml`) are also
supported and are stripped from every log message.

### Where credentials are sent

The URL of a reference comes from the document being previewed, which may not be trustworthy (a pull
request from a fork, a sample downloaded from the internet). A `$ref` pointing at
`https://attacker.example/steal.yaml` must never receive your token, so **configured credentials are
only sent to hosts you pinned explicitly**:

- a loader whose `match` is a URL prefix pins that host, e.g. `https://bitbucket.example.com/projects/`;
- any host listed in `asyncapi.allowedHosts` is pinned;
- a loader whose `match` is a regular expression cannot be verified, so it also needs the host in
  `asyncapi.allowedHosts`;
- `asyncapi.remoteAuth` applies to every host by definition, so it **only** sends credentials to hosts
  listed in `asyncapi.allowedHosts`.

Hosts are compared after parsing the URL, never as a string prefix, so
`https://bitbucket.example.com.attacker.test/` does not match a loader pinned to
`https://bitbucket.example.com`. An `asyncapi.allowedHosts` entry with a port (`host:8443`) matches
that port only, an entry without one matches the host on any port. Redirects are re-evaluated hop by
hop with the same rules, and credentials embedded in the reference itself are always sent, since they
come from the document and not from your settings.

### References to your own machine or private network

References that resolve to loopback, private or link-local addresses (`localhost`, `127.0.0.1`,
`10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`, `::1`, `fc00::/7`, `fe80::/10`, and the IPv4 forms
mapped into IPv6) are **only fetched when the host is pinned**, with the same rule as credentials. The
URL is chosen by the document, and the extension host has no CORS policy to stop it, so without this
an untrusted document could make your machine walk the intranet, the loopback interface or the cloud
metadata endpoint.

If you do point references at a local schema registry, pin it once:

```jsonc
"asyncapi.allowedHosts": ["localhost"]   // or "localhost:8080" for that port only
```

When credentials are withheld the request is still made anonymously and the reason is logged in the
output channel, so a resulting `HTTP 401` tells you which host you still need to pin.

### Keeping credentials out of settings.json

Use `passwordSecret` / `bearerTokenSecret` with the **AsyncAPI: Set Secret** command: it stores the
value in the VS Code SecretStorage (the OS keychain) under the key you choose, so `settings.json`
only contains the key name. **AsyncAPI: Delete Secret** removes it, and **AsyncAPI: Clear Remote
Reference Cache** forces the next preview to fetch the references again.

### What a malicious reference can and cannot do

Remote documents are untrusted input, so the resolution path deliberately does nothing but download
text and rewrite `$ref` strings:

- References are parsed with `js-yaml` 4 `load()`, whose default schema rejects the code executing
  tags (`!!js/function`, `!!js/eval`, …) and does not pollute `Object.prototype`. Nothing fetched is
  ever passed to `eval`, `require`, a dynamic `import` or written to disk, and there is no
  loader plugin mechanism that could execute local JavaScript.
- References to loopback, private and link-local addresses are refused unless the host is pinned, so
  a document cannot use your machine to reach your intranet or the cloud metadata endpoint.
- Resource limits: 10 MB per reference, at most 100 external documents per preview, and the resolved
  object graph is rejected past 1,000,000 nodes, which is what stops a YAML anchor bomb (a few hundred
  bytes of aliases can otherwise expand into hundreds of megabytes when serialized).
- Desktop redirects are followed only to `http(s)` locations and re-evaluated hop by hop. HTTPS-to-HTTP
  redirects are rejected. Browser extension-host resolution rejects redirects because their destinations
  cannot be validated before following them; use the final URL directly. Webview resolution retains browser redirect behavior.
- A document downloaded over HTTP(S) can only reference other HTTP(S) documents: it cannot pull a
  local file into the preview. The workspace side of the graph is unaffected, so the file you open and
  the files it references keep using relative paths as usual.
- The preview itself runs under a Content Security Policy with a per render nonce, so markup that
  slipped through the renderer's sanitizer cannot execute script. Unbundled previews allow VS Code
  resources and HTTP(S) (subject to CORS). Bundled previews allow VS Code resources only: workspace
  `$ref`s still load as `vscode-webview` URLs, but HTTP(S) `$ref`s left inside those files are not
  fetched. External images in descriptions are still allowed (`img-src https:`), which remains a
  possible low bandwidth channel.

The renderer is `@asyncapi/react-component`, which sanitizes markdown with DOMPurify. It runs in the
webview sandbox, with no access to Node, the file system or your credentials.

[docs/remote-references-risk-assessment.md](docs/remote-references-risk-assessment.md) documents what
the preview could already do before this feature existed, what the feature adds, and what was
verified.

### Troubleshooting

Set `"asyncapi.outputVerbosity": "debug"` and check the *AsyncAPI Preview* output channel. Common
failures are reported with an explicit message in the preview panel:

- `HTTP 401` / `HTTP 403` — wrong or missing credentials for that host.
- `returned HTML instead of YAML/JSON` — the server answered with a login page (typical for Bitbucket
  behind SSO) instead of the document.
- `$ref outside of the asyncapi.allowedHosts allow-list` — the host is not in `asyncapi.allowedHosts`.

On the web version (vscode.dev, github.dev) requests are made by the browser and are therefore subject
to the CORS policy of the target server, so authenticated references to servers that do not allow
cross origin requests only work on desktop VS Code.

## Automatic hot-reloading

Automatic hot-reloading on editor save, but currently, it doesn't reload when saving referenced external files.

## Content Assistance

### Available snippets

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

