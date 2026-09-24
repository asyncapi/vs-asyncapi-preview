import type { LoaderConfig } from './config';

/**
 * Returns the first loader whose `match` is either a URL prefix or a regular
 * expression matching the requested URL.
 */
export function findLoader(url: string, loaders: LoaderConfig[]): LoaderConfig | undefined {
  return loaders.find(loader => loaderMatchesUrl(url, loader));
}

export function loaderMatchesUrl(url: string, loader: LoaderConfig): boolean {
  if (!loader.match) {
    return false;
  }

  if (/^https?:\/\//i.test(loader.match)) {
    try {
      // URL prefixes are literal and must never fall back to regex matching.
      return new URL(url).origin === new URL(loader.match).origin && url.startsWith(loader.match);
    } catch (e) {
      return false;
    }
  }

  try {
    return new RegExp(loader.match).test(url);
  } catch (e) {
    return false;
  }
}

export function hostOfUrl(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch (e) {
    return undefined;
  }
}
