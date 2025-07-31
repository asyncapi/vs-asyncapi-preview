/**
 * Local path utilities to replace Node.js path module
 * Provides cross-platform path manipulation functions
 */

/**
 * Extracts the filename from a path (everything after the last slash)
 * @param filePath - The file path to extract the basename from
 * @returns The filename portion of the path
 */
export function basename(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  return lastSlashIndex === -1 ? normalizedPath : normalizedPath.substring(lastSlashIndex + 1);
}

/**
 * Extracts the directory path (everything before the last slash)
 * @param filePath - The file path to extract the directory from
 * @returns The directory portion of the path, or '.' for relative paths with no directory
 */
export function dirname(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  return lastSlashIndex === -1 ? '.' : normalizedPath.substring(0, lastSlashIndex);
}

/**
 * Joins path segments together with forward slashes
 * @param segments - Path segments to join
 * @returns The joined path
 */
export function join(...segments: string[]): string {
  return segments
    .filter(segment => segment && segment.length > 0)
    .map(segment => segment.replace(/\\/g, '/'))
    .join('/')
    .replace(/\/+/g, '/'); // Remove duplicate slashes
}