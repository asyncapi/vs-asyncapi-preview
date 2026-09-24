import * as vscode from 'vscode';
import { hasAuthConfig, resolveHeaders, resolveUrlCredentialHeaders } from './auth';
import { AuthConfig, ExtensionConfig, LoaderConfig } from './config';
import { Logger, sanitizeText, sanitizeUrl } from './logger';
import { HttpGet, MAX_RESPONSE_BYTES } from './http/transport';
import { nodeHttpGet } from './http/nodeHttp';
import { webHttpGet } from './http/webHttp';
import { findLoader } from './loaderMatch';

export { findLoader } from './loaderMatch';

const MAX_REDIRECTS = 5;

const httpGet: HttpGet = __WEB_EXTENSION__ ? webHttpGet : nodeHttpGet;

/**
 * Creates a reader for `http(s)` references that applies the configured
 * authentication, enforces the host allow-list and produces actionable errors.
 */
export function createRemoteReader(
  context: vscode.ExtensionContext,
  getConfig: () => ExtensionConfig,
  logger: Logger,
  options?: { onAuthFailure?: (info: { url: string; status: number }) => Promise<boolean> }
): (url: string) => Promise<string> {
  const authRetried = new Set<string>();
  const authDeclinedHosts = new Set<string>();

  return async (requestedUrl: string) => {
    let currentUrl = requestedUrl;

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      if (!vscode.workspace.isTrusted) {
        throw new Error('AsyncAPI extension-host reference resolution requires a trusted workspace.');
      }

      const config = getConfig();
      const credentials = resolveUrlCredentialHeaders(currentUrl);
      assertAllowedHost(credentials.url, config);

      const loader = findLoader(credentials.url, config.loaders);
      const auth: AuthConfig | undefined = loader ?? config.remoteAuth;

      // The URL comes from the document being previewed, so configured credentials are
      // only ever sent to a host the user pinned explicitly. Otherwise a hostile
      // document could point a $ref at any server and collect the token.
      const pinned = isHostPinned(credentials.url, loader, config);
      assertPrivateTargetPinned(credentials.url, pinned);
      if (!pinned && hasAuthConfig(auth)) {
        logger.info(
          config.outputVerbosity,
          `Not sending credentials to ${new URL(credentials.url).host}: the host is not pinned by an asyncapi.loaders URL prefix nor listed in asyncapi.allowedHosts.`
        );
      }

      const urlCredentials = Boolean(credentials.headers.Authorization);
      const headers = {
        Accept: 'application/json, application/yaml, text/yaml, text/plain, */*',
        ...(pinned ? await resolveHeaders(context, auth) : {}),
        ...credentials.headers,
      };

      logger.debug(
        config.outputVerbosity,
        `Fetching remote $ref ${sanitizeUrl(credentials.url)}${loader ? ` (loader ${sanitizeText(loader.match ?? '')})` : ''}.`
      );

      const response = await httpGet(credentials.url, headers, MAX_RESPONSE_BYTES);
      const location = response.headers['location'];
      if (isRedirect(response.status) && location) {
        currentUrl = new URL(location, credentials.url).toString();
        // A redirect must not be able to switch the request to file: or any other scheme.
        if (!/^https?:$/i.test(new URL(currentUrl).protocol)) {
          throw new Error(`$ref ${sanitizeUrl(credentials.url)} redirected to a non HTTP(S) location, which is not followed.`);
        }
        if (new URL(credentials.url).protocol === 'https:' && new URL(currentUrl).protocol === 'http:') {
          throw new Error(`$ref ${sanitizeUrl(credentials.url)} redirected from HTTPS to HTTP, which is not followed to protect credentials and document integrity.`);
        }
        logger.debug(config.outputVerbosity, `Following redirect to ${sanitizeUrl(currentUrl)}.`);
        continue;
      }

      const host = new URL(credentials.url).host;
      if (
        isAuthFailure(response.status) &&
        pinned &&
        !urlCredentials &&
        options?.onAuthFailure &&
        !authRetried.has(credentials.url) &&
        !authDeclinedHosts.has(host)
      ) {
        authRetried.add(credentials.url);
        if (await options.onAuthFailure({ url: credentials.url, status: response.status })) {
          redirects--;
          continue;
        }
        authDeclinedHosts.add(host);
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `Failed to resolve $ref ${sanitizeUrl(credentials.url)}: HTTP ${response.status} ${response.statusText}.${authenticationHint(response.status)}`
        );
      }

      assertResolvableReferenceBody(credentials.url, response.headers['content-type'] ?? null, response.body);
      logger.info(config.outputVerbosity, `Resolved remote $ref ${sanitizeUrl(credentials.url)}.`);

      return response.body;
    }

    throw new Error(`Too many redirects while resolving $ref ${sanitizeUrl(requestedUrl)}.`);
  };
}

/**
 * `asyncapi.allowedHosts` is opt-in for *reading*: when empty every host is allowed
 * (the webview could already fetch any public reference), when set it behaves like the
 * `ALLOWED_HOSTS` guard used in the CI parser setup. Sending credentials is a
 * different matter, see `isHostPinned`.
 */
function assertAllowedHost(url: string, config: ExtensionConfig): void {
  if (config.allowedHosts.length === 0) {
    return;
  }

  if (!isAllowListed(url, config)) {
    throw new Error(`$ref outside of the asyncapi.allowedHosts allow-list: ${new URL(url).host}`);
  }
}

function isAllowListed(url: string, config: ExtensionConfig): boolean {
  const parsed = new URL(url);

  return config.allowedHosts.some(entry => matchesHostEntry(entry, parsed));
}

/**
 * An entry with a port (`host:8443`) matches that port only, an entry without one
 * matches the host on any port.
 */
function matchesHostEntry(entry: string, url: URL): boolean {
  const normalized = entry.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  return normalized === url.host.toLowerCase() || normalized === hostname || normalized === stripBrackets(hostname);
}

function stripBrackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

/**
 * References that target the machine itself or a private network are only fetched when
 * the user pinned that host. The URL is chosen by the document, so without this an
 * untrusted document could make the extension host walk the intranet, the loopback
 * interface or the cloud metadata endpoint — none of which the browser would have
 * allowed the webview to reach.
 */
function assertPrivateTargetPinned(url: string, pinned: boolean): void {
  if (pinned) {
    return;
  }

  const hostname = stripBrackets(new URL(url).hostname.toLowerCase());
  if (!isPrivateNetworkHost(hostname)) {
    return;
  }

  throw new Error(
    `$ref ${sanitizeUrl(url)} targets a private network address (${hostname}), which is not fetched unless you pin it. Add the host to asyncapi.allowedHosts or to an asyncapi.loaders entry.`
  );
}

export function isPrivateNetworkHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return true;
  }

  const ipv4 = parseIPv4(hostname) ?? parseIPv4MappedIPv6(hostname);
  if (ipv4) {
    return isPrivateIPv4(ipv4);
  }

  return isPrivateIPv6(hostname);
}

function parseIPv4(hostname: string): number[] | undefined {
  const parts = hostname.split('.');
  if (parts.length !== 4) {
    return undefined;
  }

  const octets = parts.map(part => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));

  return octets.every(octet => octet >= 0 && octet <= 255) ? octets : undefined;
}

/** Catches `::ffff:127.0.0.1` style addresses. */
function parseIPv4MappedIPv6(hostname: string): number[] | undefined {
  const match = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(hostname);

  return match ? parseIPv4(match[1]) : undefined;
}

function isPrivateIPv4([a, b]: number[]): boolean {
  return (
    a === 0 || // 0.0.0.0/8, "this host"
    a === 10 || // 10.0.0.0/8
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10, carrier grade NAT
    (a === 169 && b === 254) || // link local, includes the cloud metadata endpoint
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) // 192.168.0.0/16
  );
}

function isPrivateIPv6(hostname: string): boolean {
  if (hostname === '::1' || hostname === '::') {
    return true;
  }

  // Unique local (fc00::/7) and link local (fe80::/10).
  return /^f[cd][0-9a-f]{0,2}:/i.test(hostname) || /^fe[89ab][0-9a-f]?:/i.test(hostname);
}

/**
 * A host is pinned when the user named it explicitly, either in `asyncapi.allowedHosts`
 * or through a loader whose `match` is a URL prefix for that same host. Hosts are
 * compared after parsing, never as a string prefix, so a look-alike such as
 * `https://bitbucket.example.com.attacker.test/` never matches
 * `https://bitbucket.example.com`.
 *
 * Regular expression loaders cannot be verified this way, so they need the host in
 * `asyncapi.allowedHosts` before any credential is sent.
 */
export function isHostPinned(url: string, loader: LoaderConfig | undefined, config: ExtensionConfig): boolean {
  if (isAllowListed(url, config)) {
    return true;
  }

  return loader?.match ? matchPinsHost(loader.match, url) : false;
}

function matchPinsHost(match: string, url: string): boolean {
  if (!/^https?:\/\//i.test(match)) {
    return false; // regular expression or partial pattern: the host cannot be derived
  }

  try {
    return new URL(match).host.toLowerCase() === new URL(url).host.toLowerCase();
  } catch (e) {
    return false;
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isAuthFailure(status: number): boolean {
  return status === 401 || status === 403;
}

function authenticationHint(status: number): string {
  if (status === 401 || status === 403) {
    return (
      ' Check the asyncapi.remoteAuth / asyncapi.loaders settings and, if you use passwordSecret or bearerTokenSecret,' +
      ' the "AsyncAPI: Set Secret" command. Credentials are only sent to hosts pinned by an asyncapi.loaders URL prefix' +
      ' or listed in asyncapi.allowedHosts.'
    );
  }

  return '';
}

/**
 * Servers behind an SSO login (Bitbucket, for instance) answer with a 200 and an
 * HTML login page instead of a 401. Detecting it here turns an obscure
 * "YAMLException: unexpected <" into an actionable message.
 */
export function assertResolvableReferenceBody(url: string, contentType: string | null, text: string): void {
  if (!isHtmlResponse(contentType, text)) {
    return;
  }

  const title = extractHtmlTitle(text);
  const detail = title ? ` Page title: "${title}".` : '';

  throw new Error(
    `$ref ${sanitizeUrl(url)} returned HTML instead of YAML/JSON.${detail} The server is probably answering with a login page: check the matching asyncapi.loaders entry and its credentials.`
  );
}

function isHtmlResponse(contentType: string | null, text: string): boolean {
  if (contentType?.toLowerCase().includes('text/html')) {
    return true;
  }

  return /^\s*<!doctype\s+html\b/i.test(text) || /^\s*<html[\s>]/i.test(text);
}

function extractHtmlTitle(text: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  const title = match?.[1].replace(/\s+/g, ' ').trim();

  return title ? sanitizeText(title) : undefined;
}
