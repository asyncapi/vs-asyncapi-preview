import * as http from 'http';
import * as https from 'https';
import { HttpResponse, responseTooLargeError } from './transport';

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Desktop transport. Uses `http(s).request` on purpose so that the VS Code proxy
 * support (`http.proxy`, `http.proxySupport`) and the system certificate store
 * (`http.systemCertificates`) apply, which `fetch`/undici would bypass.
 *
 * Redirects are NOT followed here: the caller re-evaluates the allow-list and the
 * authentication configuration for every hop.
 */
export async function nodeHttpGet(
  url: string,
  headers: Record<string, string>,
  maxBytes: number
): Promise<HttpResponse> {
  return new Promise<HttpResponse>((resolve, reject) => {
    const requestModule = new URL(url).protocol === 'http:' ? http : https;
    const request = requestModule.request(url, { method: 'GET', headers }, response => {
      const chunks: Buffer[] = [];
      let received = 0;
      let oversized = false;
      response.on('data', (chunk: Buffer) => {
        if (oversized) {
          return;
        }
        received += chunk.length;
        if (received > maxBytes) {
          oversized = true;
          const error = responseTooLargeError(url, maxBytes);
          // Reject before destroying: destruction may emit 'error' after 'end'.
          reject(error);
          chunks.length = 0;
          request.destroy(error);
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        if (oversized) {
          return;
        }
        resolve({
          status: response.statusCode ?? 0,
          statusText: response.statusMessage ?? '',
          headers: flattenHeaders(response.headers),
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
      response.on('error', reject);
    });

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    request.on('error', reject);
    request.end();
  });
}

function flattenHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
  const flattened: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }
    flattened[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }

  return flattened;
}
