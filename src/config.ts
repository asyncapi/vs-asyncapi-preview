import * as vscode from 'vscode';
import { hasAuthConfig } from './auth';

export type OutputVerbosity = 'off' | 'error' | 'info' | 'debug';

/**
 * `auto` only resolves references in the extension host when the user configured the
 * feature, so an extension that nobody configured behaves exactly as it did before:
 * the webview loads the document and the browser CORS policy applies.
 */
export type RemoteRefsMode = 'auto' | 'always' | 'never';

export interface BasicAuthConfig {
  username?: string;
  password?: string;
  passwordSecret?: string;
}

export interface AuthConfig {
  headers?: Record<string, string>;
  bearerToken?: string;
  bearerTokenSecret?: string;
  basic?: BasicAuthConfig;
}

export interface LoaderConfig extends AuthConfig {
  match?: string;
}

export interface ExtensionConfig {
  remoteRefsMode: RemoteRefsMode;
  remoteAuth: AuthConfig;
  loaders: LoaderConfig[];
  allowedHosts: string[];
  outputVerbosity: OutputVerbosity;
}

export function getConfig(resource?: vscode.Uri): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('asyncapi', resource);

  return {
    remoteRefsMode: config.get('remoteRefs.resolve', 'auto'),
    remoteAuth: config.get('remoteAuth', {}),
    loaders: config.get('loaders', []),
    allowedHosts: config.get('allowedHosts', []),
    outputVerbosity: config.get('outputVerbosity', 'off'),
  };
}

/**
 * Whether external references must be resolved by the extension host. Opting in is
 * what enables authentication, host side requests and the `x-remote-refs` bundling,
 * so it never happens behind the back of a user who did not ask for it.
 */
export function shouldResolveInHost(config: ExtensionConfig): boolean {
  if (!vscode.workspace.isTrusted) {
    return false;
  }

  switch (config.remoteRefsMode) {
    case 'never':
      return false;
    case 'always':
      return true;
    default:
      return isRemoteRefsConfigured(config);
  }
}

export function isRemoteRefsConfigured(config: ExtensionConfig): boolean {
  return config.loaders.length > 0 || config.allowedHosts.length > 0 || hasAuthConfig(config.remoteAuth);
}

/**
 * Everything that changes how a document is resolved. Used to invalidate caches
 * when the user edits the authentication settings.
 */
export function configCacheKey(config: ExtensionConfig): string {
  return JSON.stringify({
    remoteRefsMode: config.remoteRefsMode,
    remoteAuth: config.remoteAuth,
    loaders: config.loaders,
    allowedHosts: config.allowedHosts,
  });
}
