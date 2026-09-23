# Remote references: risk assessment before and after

This document accompanies the change that adds authenticated remote `$ref` resolution to the
extension. Its purpose is to make the security review concrete: what the preview could already do
before this change, what the change actually adds, and what was hardened along the way.

The single most useful framing:

> Before this change **the extension host never made a network request**. Every request was made by
> the webview, through the browser network stack, and was therefore subject to the browser's CORS
> policy. After this change the extension host makes the requests — but only for users who opt in.

## How the preview worked before

`PreviewWebPanel.ts` built an HTML page that loaded the prebuilt `@asyncapi/react-component`
standalone bundle and handed it a URL:

```js
AsyncApiStandalone.render({
  schema: { url: '<webview URI of the file>', options: { method: 'GET', mode: 'cors' } },
  config: { show: { sidebar: true, errors: true }, parserOptions: { path: '<webview base path>' } },
}, document.getElementById('asyncapi'));
```

Everything — parsing and `$ref` resolution — happened inside the webview:

- the webview was created with `enableScripts: true` and `retainContextWhenHidden: true`;
- `localResourceRoots` included the document's directory, the component assets **and every workspace
  folder**;
- the page had **no Content Security Policy**;
- remote `$ref`s were fetched by the bundled AsyncAPI parser in the browser, so they only worked
  against servers that allow cross origin reads. This is the limitation that motivated the change.

## How it works now

For users who opt in in a trusted workspace, the extension host downloads only HTTP(S) references,
inlines them under the root `x-remote-refs` extension and rewrites them to local JSON pointers.
Relative references inside HTTP(S) documents are resolved against their remote URL. Filesystem and
virtual-workspace references remain unchanged for the webview, which uses the original document's
VS Code resource URL as its parser source. The host never reads filesystem dependencies through
`workspace.fs.readFile`. Bundled previews restrict `connect-src` to VS Code resources, so an
HTTP(S) `$ref` that exists only inside a left-behind local file is not fetched.

Opting in is explicit. With the default `asyncapi.remoteRefs.resolve: "auto"`, host side resolution
only happens when `asyncapi.loaders`, `asyncapi.remoteAuth` or `asyncapi.allowedHosts` is configured.
A user who never opens the settings gets byte for byte the previous behaviour.

## Before / after

| Risk | Before this change | After this change |
| --- | --- | --- |
| Script injection in the webview (the renderer has 14 `dangerouslySetInnerHTML` sites in a 2.9 MB minified bundle; no CSP) | **Already present**, for every document opened, including fully local ones | **Improved**: CSP with a per render nonce; bundled previews restrict connections to VS Code resources, browser-resolved previews also allow HTTP(S) |
| Injection through the `position` message, interpolated back into the webview script | **Already present**, identical code | Fixed: the value is coerced to a finite number |
| Reading workspace files from the webview (`localResourceRoots` covers every workspace folder) | **Already present** | Unchanged, but injected markup can no longer execute to exploit it |
| External images in descriptions as an outbound channel | **Already present** (no `img-src` restriction) | Unchanged: `img-src https:` is deliberately still allowed so badges and diagrams keep working |
| Blind `GET` to a URL chosen by the document | **Largely already present**: a simple cross origin `GET` is sent, CORS only blocks reading the response. Subject to whatever Chromium's Private Network Access rules applied to the webview origin | Desktop host resolution bypasses browser CORS and Private Network Access restrictions; requests originate on the user's machine, including for remote workspaces. Web extension requests originate in the user's browser and remain subject to browser restrictions |
| **Reading** the response of an internal or non CORS host | Not possible: CORS blocked the read | **New.** This is the point of the feature |
| **Sending credentials** with a reference | Not possible: there was no authentication | **New**, restricted to hosts the user pinned |
| Reaching loopback, private or link-local addresses (including the cloud metadata endpoint) | Possible as a blind `GET` only, within the browser's restrictions | **New for reading the response**, and refused entirely unless the host is pinned |
| Denial of service: YAML anchor bomb, oversized response, unbounded reference chain | The failure mode existed but was **confined to the webview** (the panel hangs, not the extension host) and required content from a CORS enabled host | **New as a host side DoS**, now bounded: 10 MB per reference, 100 documents, 1,000,000 nodes — limits the webview never had |
| A remote document referencing `file:///…` | Not possible: a browser cannot fetch `file://` from the webview origin | **Introduced by this change and then closed**: documents fetched over HTTP(S) may only reference other HTTP(S) documents |
| A workspace document referencing files outside webview resource roots | Webview resource controls apply | Host filesystem reads removed: local and virtual-workspace references remain for the webview; only HTTP(S) dependencies are bundled |
| Code execution while parsing untrusted YAML | The webview's parser did the parsing | New code path, verified inert (see below) |
| Supply chain (`@asyncapi/parser`, install scripts) | **Already present, unchanged**: the parser has always been reachable only inside the prebuilt react-component bundle | Unchanged surface, plus `ignore-scripts=true` and an exact version pin |

### Net result

- **Strictly better than before**: the CSP, the `position` coercion and the install hardening. These
  fix pre-existing exposure and are not required by the feature itself.
- **Genuinely new**: being able to read the response of a host that CORS used to block, and being
  able to send credentials. The second is the purpose of the change and is restricted to pinned
  hosts; the first is restricted to public hosts unless a private host is pinned.
- **New but bounded**: host side resource exhaustion, now capped.
- **New and closed**: the remote-to-local reference boundary.

## Controls in the resolution path

| Control | Where |
| --- | --- |
| Opt in: nothing is resolved in the host unless configured | `shouldResolveInHost` in `src/config.ts` |
| Credentials only to hosts pinned by a loader URL prefix or `asyncapi.allowedHosts`; hosts compared after URL parsing, never as string prefixes | `isHostPinned` in `src/remoteFetch.ts` |
| Loopback/private/link-local targets refused unless pinned | `assertPrivateTargetPinned`, `isPrivateNetworkHost` in `src/remoteFetch.ts` |
| Optional hard allow-list for every host | `assertAllowedHost` in `src/remoteFetch.ts` |
| Desktop redirects re-evaluated hop by hop, `http(s)` only, max 5; HTTPS-to-HTTP downgrades rejected. Browser host resolution rejects redirects | `createRemoteReader` in `src/remoteFetch.ts`, `webHttpGet` |
| 10 MB per reference, aborting the connection rather than buffering | `nodeHttpGet` / `webHttpGet` in `src/http/` |
| Max 100 external documents per preview | `MAX_EXTERNAL_DOCUMENTS` in `src/refBundler.ts` |
| Max 1,000,000 nodes in the resolved graph, checked iteratively before serializing | `assertExpansionWithinLimit` in `src/refBundler.ts` |
| Remote documents cannot reference local paths | `bundleExternalRefs` in `src/refBundler.ts` |
| CSP with a per render nonce; bundled previews restrict `connect-src` to VS Code resources, browser-resolved previews also allow HTTP(S) | `getWebviewContent` in `src/PreviewWebPanel.ts` |
| Untrusted workspaces cannot use host resolution, authentication or secret-management commands; security-sensitive workspace settings are restricted | `package.json`, `shouldResolveInHost`, `resolveHeaders`, `createRemoteReader`, secret command handlers |
| Credentials never rendered into the webview HTML; URLs and errors redacted in logs | `sanitizeUrl` / `sanitizeText` in `src/logger.ts` |

Two deliberate omissions:

- The `loaders[].module` escape hatch of the internal Spectral extension this feature is modelled on
  (`await import(modulePath)`, i.e. arbitrary local JavaScript execution) was **not** ported.
- `@asyncapi/parser` is **not** used in the extension host. The resolution path uses `js-yaml` plus a
  purpose written `$ref` bundler, so the parser's blast radius stays exactly where it was: inside the
  webview sandbox.

## What was verified, and how

Checked by running code, not by inspection:

- **`js-yaml` 4.1.0 is inert for this purpose.** `load()` rejects every code executing tag
  (`!!js/function`, `!!js/eval`, `!!js/regexp`, `!!js/undefined`, python tags) with `unknown tag`. A
  `__proto__` key becomes an own property of the parsed object; `Object.prototype` is not polluted.
- **The alias bomb is real and is now stopped.** 237 bytes of nested YAML anchors expand to 4.7 MB
  when serialized, an amplification of roughly 20,000x, because anchors are shared references that
  only multiply at serialization time. The node limit rejects it in 13 ms, and a 200,000 level deep
  document does not overflow the stack.
- **Resource limits fire**: a 12 MB response is refused, an endless chain of unique references stops
  after exactly 100 documents, a `Location: file:///etc/passwd` redirect is refused.
- **Credential pinning**: verified both at the decision level and on the wire, with a local server
  that records the `Authorization` header it receives. A look-alike host
  (`bitbucket.example.com.attacker.test`) is not pinned by a prefix for `bitbucket.example.com`.
- **Private targets**: 17 private forms detected (including `::ffff:127.0.0.1`, and decimal/octal/hex
  IPv4 such as `http://2130706433/`, which the URL parser normalizes to `127.0.0.1` before the check),
  9 public forms not flagged (including `172.32.0.1` and `localhost.attacker.test`).
- **Remote-to-local boundary**: a remote document referencing `file:///…/.ssh/id_rsa` is refused and
  the local read is never attempted, while relative references inside remote documents keep working.
- **Opt in**: with nothing configured, host side resolution stays off; it turns on for each of the
  configuration shapes and `"never"` overrides all of them.
- **End to end**: a document mixing a real HTTPS reference with a relative local one resolves and the
  AsyncAPI parser reports 0 errors on the result, for both AsyncAPI 2.6 and 3.0.

## Residual risks and open items

- **Explicit regex loader patterns can backtrack excessively.** HTTP(S) URL-prefix matches are now
  literal and checked against the same origin, with no regex fallback. Other patterns still use
  JavaScript regular expressions; eliminating their ReDoS risk requires changing that feature or
  using a matcher with bounded execution. Prefer literal URL prefixes.

- **`img-src https:` is still allowed** in the CSP so that images and badges in `description` fields
  keep rendering. It remains a possible low bandwidth outbound channel. Closing it is a one line
  change if the project prefers that trade-off.
- **Private network detection does not resolve DNS.** A hostname that resolves to a private address is
  not recognised as private. Covering it would mean a DNS lookup per request, desktop only (there is
  no `dns` module in the web bundle), and connecting to the resolved address with an explicit TLS
  `servername` to be airtight against DNS rebinding. Not implemented; in practice such hosts are the
  ones users pin anyway.
- **The renderer is not audited.** Markdown goes through DOMPurify, but a 2.9 MB minified bundle
  cannot be certified here. The CSP is the control that makes a sanitizer bypass non fatal.
- **The CSP needs a visual check.** It is the one change that cannot be validated without opening a
  preview: `'unsafe-eval'` is allowed because the AsyncAPI parser compiles JSON Schema validators with
  `new Function`, but if the bundle needs anything else that is not permitted, rendering would break.
- **The extension host changes on desktop.** The Node entry point and `extensionKind: ["ui"]` select
  the local Node extension host, including for Remote SSH/WSL/Containers. In browser-based VS Code,
  the web extension host is used instead of a remote workspace host. Workspace dependencies remain
  in webview resolution through VS Code resource URLs. Relative workspace references
  were already supported by the previous webview; host resolution is not needed to enable them.
- **HTTP(S) `$ref`s found only inside filesystem dependencies are not fetched once the root is
  bundled.** The host never reads those files, and bundled `connect-src` is VS Code resources only,
  so leftover browser HTTP(S) cannot bypass host auth and pinning. Without host resolution they
  still use webview/CORS. Relative dependencies inside HTTP(S) documents are bundled as usual.
- **Hot reload does not follow referenced files.** Saving the open document re-resolves, but changing
  a referenced document does not trigger a refresh. `AsyncAPI: Clear Remote Reference Cache` forces it.
