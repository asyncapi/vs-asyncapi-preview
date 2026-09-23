import * as vscode from 'vscode';
import { OutputVerbosity } from './config';

const levels: Record<Exclude<OutputVerbosity, 'off'>, number> = {
  error: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  constructor(private readonly output: vscode.OutputChannel) {}

  error(verbosity: OutputVerbosity, message: string, error?: unknown): void {
    if (!this.enabled(verbosity, 'error')) {
      return;
    }

    this.output.appendLine(`[error] ${message}`);
    if (error) {
      this.output.appendLine(formatError(error));
    }
  }

  /** Logs a failure regardless of the configured verbosity. */
  failure(message: string, error?: unknown): void {
    this.output.appendLine(`[error] ${message}`);
    if (error) {
      this.output.appendLine(formatError(error));
    }
  }

  info(verbosity: OutputVerbosity, message: string): void {
    if (this.enabled(verbosity, 'info')) {
      this.output.appendLine(`[info] ${message}`);
    }
  }

  debug(verbosity: OutputVerbosity, message: string): void {
    if (this.enabled(verbosity, 'debug')) {
      this.output.appendLine(`[debug] ${message}`);
    }
  }

  private enabled(verbosity: OutputVerbosity, level: Exclude<OutputVerbosity, 'off'>): boolean {
    return verbosity !== 'off' && levels[verbosity] >= levels[level];
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeText(error.stack ?? error.message);
  }

  return sanitizeText(String(error));
}

/** Removes `user:password@` credentials embedded in a URL. */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username) {
      parsed.username = '***';
      parsed.password = parsed.password ? '***' : '';
    }

    return parsed.toString();
  } catch (e) {
    return sanitizeText(url);
  }
}

/** Removes credentials from any URL found inside a free text message. */
export function sanitizeText(value: string): string {
  return value.replace(/(https?:\/\/)([^/@\s:]+)(?::([^/@\s]*))?@/gi, '$1***:***@');
}
