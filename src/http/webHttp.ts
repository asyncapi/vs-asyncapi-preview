import { HttpResponse, responseTooLargeError } from './transport';

/**
 * Web extension (vscode.dev) transport. Subject to the browser CORS policy, so it
 * only works against servers that send `Access-Control-Allow-Origin`.
 */
export async function webHttpGet(
  url: string,
  headers: Record<string, string>,
  maxBytes: number
): Promise<HttpResponse> {
  // Browsers hide manual redirect destinations, preventing validation before
  // credentials are sent. Require a direct URL for host-resolved references.
  const response = await fetch(url, { method: 'GET', headers, redirect: 'error' });
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value: string, key: string) => {
    responseHeaders[key.toLowerCase()] = value;
  });

  const declaredLength = Number(responseHeaders['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw responseTooLargeError(url, maxBytes);
  }

  const body = await response.text();
  if (body.length > maxBytes) {
    throw responseTooLargeError(url, maxBytes);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body,
  };
}
