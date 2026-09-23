import * as yml from 'js-yaml';

/** Root level extension where the external documents are inlined. */
export const REMOTE_REFS_KEY = 'x-remote-refs';

/** A document can only pull in this many external documents. */
export const MAX_EXTERNAL_DOCUMENTS = 100;

/**
 * Upper bound for the size of the resolved object graph. YAML anchors are shared
 * references, so a few hundred bytes of aliases can expand into hundreds of megabytes
 * once serialized (a "billion laughs" bomb). Counting nodes before serializing keeps
 * that from hanging the extension host.
 */
export const MAX_EXPANDED_NODES = 1000000;

export type ReadDocument = (url: string) => Promise<string>;

export interface BundleResult {
  /** HTTP(S) references are bundled; filesystem references remain for the webview. */
  document: Record<string, unknown>;
  /** Absolute URLs of every inlined document, in resolution order. */
  sources: string[];
}

/** Cheap check used to decide whether a document needs host side resolution at all. */
export function hasRemoteRefs(text: string): boolean {
  return /["']?\$ref["']?\s*:\s*["']?https?:\/\//i.test(text);
}

/**
 * Inlines HTTP(S) `$ref`s under the root `x-remote-refs` extension. Relative
 * references in HTTP(S) documents are remote too; workspace references stay intact.
 *
 * Unlike a full dereference this keeps internal references intact, so recursive
 * schemas stay serializable and the document does not blow up in size.
 */
export async function bundleExternalRefs(
  rootUrl: string,
  rootText: string,
  read: ReadDocument
): Promise<BundleResult> {
  const root = parseDocument(rootText, rootUrl);
  const bucket: Record<string, unknown> = {};
  const slugs = new Map<string, string>();
  const usedSlugs = new Set<string>();

  const ensureDocument = async (url: string): Promise<string> => {
    const known = slugs.get(url);
    if (known) {
      return known;
    }

    if (slugs.size >= MAX_EXTERNAL_DOCUMENTS) {
      throw new Error(
        `This document pulls in more than ${MAX_EXTERNAL_DOCUMENTS} external references, which is not resolved to avoid an unbounded chain of requests.`
      );
    }

    const slug = createSlug(url, usedSlugs);
    slugs.set(url, slug);
    usedSlugs.add(slug);

    const document = parseDocument(await read(url), url);
    // Registered before rewriting so that reference cycles terminate.
    bucket[slug] = document;
    await rewriteNode(document, url, slug, new WeakSet());

    return slug;
  };

  const rewriteRef = async (ref: string, baseUrl: string, ownSlug?: string): Promise<string> => {
    const hashIndex = ref.indexOf('#');
    const target = hashIndex === -1 ? ref : ref.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? '' : ref.slice(hashIndex + 1);

    if (!target) {
      // Internal reference: only needs rebasing when it lives inside an inlined document.
      return ownSlug ? localPointer(ownSlug, fragment, ref) : ref;
    }

    // Filesystem and virtual-workspace references must stay behind the webview's
    // resource access controls. Never read them through privileged host APIs.
    if (!isRemoteUrl(baseUrl) && !isRemoteUrl(target)) {
      return ref;
    }

    const absolute = resolveUrl(target, baseUrl);

    // A document downloaded over HTTP(S) must not be able to pull local files into the
    // preview. Only the workspace side of the graph may reference the file system.
    if (isRemoteUrl(baseUrl) && !isRemoteUrl(absolute)) {
      throw new Error(
        `The remote document ${baseUrl} references the local path "${ref}", which is not resolved: remote documents can only reference other HTTP(S) documents.`
      );
    }

    const slug = await ensureDocument(absolute);

    return localPointer(slug, fragment, ref);
  };

  const rewriteNode = async (node: unknown, baseUrl: string, ownSlug: string | undefined, seen: WeakSet<object>): Promise<void> => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (seen.has(node)) {
      return;
    }
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        await rewriteNode(item, baseUrl, ownSlug, seen);
      }
      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.$ref === 'string') {
      record.$ref = await rewriteRef(record.$ref, baseUrl, ownSlug);
    }

    for (const [key, value] of Object.entries(record)) {
      if (key === '$ref') {
        continue;
      }
      await rewriteNode(value, baseUrl, ownSlug, seen);
    }
  };

  await rewriteNode(root, rootUrl, undefined, new WeakSet());

  if (Object.keys(bucket).length > 0) {
    const existing = root[REMOTE_REFS_KEY];
    root[REMOTE_REFS_KEY] = typeof existing === 'object' && existing !== null ? { ...existing, ...bucket } : bucket;
  }

  return { document: root, sources: Array.from(slugs.keys()) };
}

/**
 * Walks the object graph *without* de-duplicating shared references, which is what
 * serialization does, and fails before the expansion gets out of hand. Iterative on
 * purpose: a deeply nested document must not overflow the stack.
 */
export function assertExpansionWithinLimit(document: unknown, maxNodes = MAX_EXPANDED_NODES): void {
  const pending: unknown[] = [document];
  let nodes = 0;

  while (pending.length > 0) {
    if (++nodes > maxNodes || pending.length > maxNodes) {
      throw new Error(
        `The resolved document expands to more than ${maxNodes} nodes. This usually means a reference or a YAML anchor expands exponentially, so it is not rendered.`
      );
    }

    const node = pending.pop();
    if (!node || typeof node !== 'object') {
      continue;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        pending.push(item);
      }
      continue;
    }

    for (const value of Object.values(node)) {
      pending.push(value);
    }
  }
}

function localPointer(slug: string, fragment: string, originalRef: string): string {
  if (fragment && !fragment.startsWith('/')) {
    throw new Error(`Only JSON pointer fragments are supported in external references, received "${originalRef}".`);
  }

  return `#/${REMOTE_REFS_KEY}/${slug}${fragment}`;
}

export function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function resolveUrl(target: string, baseUrl: string): string {
  try {
    return new URL(target, baseUrl).toString();
  } catch (e) {
    throw new Error(`Cannot resolve reference "${target}" relative to ${baseUrl}.`);
  }
}

function parseDocument(text: string, url: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = yml.load(text);
  } catch (e) {
    throw new Error(`Cannot parse ${url} as YAML/JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected ${url} to contain a YAML/JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

/** JSON pointer safe, stable and readable key for an inlined document. */
function createSlug(url: string, used: Set<string>): string {
  const withoutFragment = url.split(/[?#]/)[0];
  const fileName = withoutFragment.substring(withoutFragment.lastIndexOf('/') + 1);
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^[-._]+/, '') || 'document';
  const base = `${safeName}_${hash(url)}`;

  let slug = base;
  let attempt = 1;
  while (used.has(slug)) {
    slug = `${base}_${attempt++}`;
  }

  return slug;
}

function hash(value: string): string {
  let hashed = 5381;
  for (let i = 0; i < value.length; i++) {
    hashed = ((hashed << 5) + hashed + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hashed).toString(36);
}
