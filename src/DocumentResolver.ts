import * as vscode from 'vscode';
import { configCacheKey, ExtensionConfig, shouldResolveInHost } from './config';
import { Logger, sanitizeUrl } from './logger';
import { assertExpansionWithinLimit, bundleExternalRefs, hasRemoteRefs, isRemoteUrl, ReadDocument } from './refBundler';
import { createRemoteReader } from './remoteFetch';

/**
 * Resolves AsyncAPI documents that contain remote references in the extension host,
 * where authentication headers, corporate proxies and certificates are available,
 * and leaves filesystem references for the webview to resolve.
 */
export class DocumentResolver {
  private readonly cache = new Map<string, { key: string; document: string }>();

  constructor(private readonly context: vscode.ExtensionContext, private readonly logger: Logger) {}

  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the bundled document as a JSON string, or `undefined` when the document
   * has no remote references and can keep being loaded by the webview itself.
   */
  async resolve(uri: vscode.Uri, text: string, config: ExtensionConfig): Promise<string | undefined> {
    if (!shouldResolveInHost(config) || !hasRemoteRefs(text)) {
      return undefined;
    }

    const cacheKey = `${configCacheKey(config)}::${text.length}::${hash(text)}`;
    const cached = this.cache.get(uri.toString());
    if (cached?.key === cacheKey) {
      this.logger.debug(config.outputVerbosity, `Using cached resolved document for ${uri.toString(true)}.`);
      return cached.document;
    }

    const { document, sources } = await bundleExternalRefs(uri.toString(), text, this.createReader(config));
    assertExpansionWithinLimit(document);
    const serialized = JSON.stringify(document);

    this.logger.info(
      config.outputVerbosity,
      `Resolved ${sources.length} external reference(s) for ${uri.toString(true)}: ${sources.map(sanitizeUrl).join(', ')}`
    );
    this.cache.set(uri.toString(), { key: cacheKey, document: serialized });

    return serialized;
  }

  private createReader(config: ExtensionConfig): ReadDocument {
    const readRemote = createRemoteReader(this.context, config, this.logger);

    return async (url: string) => {
      if (!isRemoteUrl(url)) {
        throw new Error('AsyncAPI extension-host resolution only accepts HTTP(S) references.');
      }
      return readRemote(url);
    };
  }
}

function hash(value: string): string {
  let hashed = 5381;
  for (let i = 0; i < value.length; i++) {
    hashed = ((hashed << 5) + hashed + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hashed).toString(36);
}
