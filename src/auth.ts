import * as vscode from 'vscode';
import { AuthConfig } from './config';

/**
 * Builds the HTTP headers for an authentication configuration.
 * Passwords and tokens can either be inlined in the settings or stored in the
 * VS Code SecretStorage (see the `asyncapi.setSecret` command).
 */
export async function resolveHeaders(
  context: vscode.ExtensionContext,
  auth: AuthConfig | undefined
): Promise<Record<string, string>> {
  if (!vscode.workspace.isTrusted) {
    throw new Error('AsyncAPI authentication requires a trusted workspace.');
  }

  const headers: Record<string, string> = { ...(auth?.headers ?? {}) };
  const bearerToken = auth?.bearerToken || (await readSecret(context, auth?.bearerTokenSecret));

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const basic = auth?.basic;
  if (basic?.username) {
    const password = basic.password || (await readSecret(context, basic.passwordSecret));
    if (password !== undefined) {
      headers.Authorization = basicAuthHeader(basic.username, password);
    }
  }

  return headers;
}

/**
 * Extracts `https://user:password@host/...` credentials from a URL, returning the
 * cleaned URL plus the matching `Authorization` header.
 */
export function resolveUrlCredentialHeaders(url: string): { url: string; headers: Record<string, string> } {
  try {
    const parsed = new URL(url);
    if (!parsed.username) {
      return { url, headers: {} };
    }

    const username = decodeURIComponent(parsed.username);
    const password = decodeURIComponent(parsed.password);
    parsed.username = '';
    parsed.password = '';

    return {
      url: parsed.toString(),
      headers: {
        Authorization: basicAuthHeader(username, password),
      },
    };
  } catch (e) {
    return { url, headers: {} };
  }
}

export function hasAuthConfig(auth: AuthConfig | undefined): boolean {
  if (!auth) {
    return false;
  }

  return Boolean(
    auth.bearerToken ||
      auth.bearerTokenSecret ||
      auth.basic?.username ||
      (auth.headers && Object.keys(auth.headers).length > 0)
  );
}

async function readSecret(context: vscode.ExtensionContext, key: string | undefined): Promise<string | undefined> {
  if (!key) {
    return undefined;
  }

  return context.secrets.get(key);
}

function base64(value: string): string {
  const globalBuffer = globalThis as typeof globalThis & {
    Buffer?: { from(value: string, encoding: string): { toString(encoding: string): string } };
  };

  if (globalBuffer.Buffer) {
    return globalBuffer.Buffer.from(value, 'utf8').toString('base64');
  }

  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
  }

  return value;
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${base64(`${username}:${password}`)}`;
}
