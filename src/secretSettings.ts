import type { AuthConfig, ExtensionConfig } from './config';
import { findLoader } from './loaderMatch';

export function referencedSecretKeys(config: ExtensionConfig): string[] {
  const keys = new Set<string>();
  addSecretKeys(keys, config.remoteAuth);
  for (const loader of config.loaders) {
    addSecretKeys(keys, loader);
  }

  return [...keys];
}

/**
 * Named secrets that `resolveHeaders` would actually read for this URL.
 * Inline `password` / `bearerToken` take precedence, so a shadowed `*Secret` is omitted.
 */
export function secretKeysForUrl(url: string, config: ExtensionConfig): string[] {
  const loader = findLoader(url, config.loaders);
  const keys = new Set<string>();
  addUsableSecretKeys(keys, loader ?? config.remoteAuth);

  return [...keys];
}

export function plaintextCredentialFields(config: ExtensionConfig): string[] {
  const fields: string[] = [];
  if (nonEmpty(config.remoteAuth.bearerToken)) {
    fields.push('asyncapi.remoteAuth.bearerToken');
  }
  if (nonEmpty(config.remoteAuth.basic?.password)) {
    fields.push('asyncapi.remoteAuth.basic.password');
  }

  config.loaders.forEach((loader, index) => {
    if (nonEmpty(loader.bearerToken)) {
      fields.push(`asyncapi.loaders[${index}].bearerToken`);
    }
    if (nonEmpty(loader.basic?.password)) {
      fields.push(`asyncapi.loaders[${index}].basic.password`);
    }
  });

  return fields;
}

function addSecretKeys(keys: Set<string>, auth: AuthConfig | undefined): void {
  if (auth?.bearerTokenSecret) {
    keys.add(auth.bearerTokenSecret);
  }
  if (auth?.basic?.passwordSecret) {
    keys.add(auth.basic.passwordSecret);
  }
}

/** Mirrors `resolveHeaders`: inline values win, and Basic overwrites Bearer. */
function addUsableSecretKeys(keys: Set<string>, auth: AuthConfig | undefined): void {
  if (!auth) {
    return;
  }

  const username = Boolean(auth.basic?.username);
  const inlinePassword = Boolean(auth.basic?.password);
  const inlineBearer = Boolean(auth.bearerToken);

  if (username && inlinePassword) {
    return;
  }

  if (username && auth.basic?.passwordSecret) {
    keys.add(auth.basic.passwordSecret);
    return;
  }

  if (!inlineBearer && auth.bearerTokenSecret) {
    keys.add(auth.bearerTokenSecret);
  }
}

function nonEmpty(value: string | undefined): boolean {
  return Boolean(value);
}
