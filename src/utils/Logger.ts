import * as vscode from 'vscode';

/**
 * Log levels for the AsyncAPI extension
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

/**
 * Logger utility for the AsyncAPI extension
 * Allows consistent logging with configurable log levels
 */
export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel;

  /**
   * Creates a new logger instance
   * @param channelName The name of the output channel
   */
  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    // Default to INFO level, can be modified via extension settings
    this.logLevel = LogLevel.INFO;
  }

  /**
   * Set the log level
   * @param level The new log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log an error message
   * @param message The error message
   */
  public error(message: string): void {
    this.log(LogLevel.ERROR, `[ERROR] ${message}`);
  }

  /**
   * Log a warning message
   * @param message The warning message
   */
  public warn(message: string): void {
    this.log(LogLevel.WARN, `[WARN] ${message}`);
  }

  /**
   * Log an info message
   * @param message The info message
   */
  public info(message: string): void {
    this.log(LogLevel.INFO, `[INFO] ${message}`);
  }

  /**
   * Log a debug message
   * @param message The debug message
   */
  public debug(message: string): void {
    this.log(LogLevel.DEBUG, `[DEBUG] ${message}`);
  }

  /**
   * Internal log method
   * @param level The log level
   * @param message The message to log
   */
  private log(level: LogLevel, message: string): void {
    if (level <= this.logLevel) {
      const dateTime = new Date().toISOString();
      this.outputChannel.appendLine(`${dateTime} ${message}`);
    }
  }

  /**
   * Show the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }
} 