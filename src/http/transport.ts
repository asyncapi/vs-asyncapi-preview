/**
 * Minimal HTTP GET abstraction shared by both extension bundles.
 *
 * The Node bundle deliberately uses `https.request` instead of the global `fetch`:
 * VS Code patches `http(s).request` to honour the `http.proxy`, `http.proxySupport`
 * and `http.systemCertificates` settings, which is what makes corporate proxies and
 * corporate certificate authorities work out of the box. `globalThis.fetch` (undici)
 * does not inherit any of that.
 */
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export type HttpGet = (url: string, headers: Record<string, string>, maxBytes: number) => Promise<HttpResponse>;

/** A single reference is never allowed to be bigger than this. */
export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export function responseTooLargeError(url: string, maxBytes: number): Error {
  return new Error(`Reference ${url} is larger than the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`);
}
