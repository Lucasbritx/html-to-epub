/**
 * Logger utility using consola
 */

import { createConsola, type ConsolaInstance, type LogLevel } from 'consola';

let loggerInstance: ConsolaInstance | null = null;

export interface LoggerOptions {
  verbose?: boolean;
}

export function createLogger(options: LoggerOptions = {}): ConsolaInstance {
  const level: LogLevel = options.verbose ? 4 : 3; // 4 = debug, 3 = info

  loggerInstance = createConsola({
    level,
    formatOptions: {
      date: false,
      colors: true,
      compact: false,
    },
  });

  return loggerInstance;
}

export function getLogger(): ConsolaInstance {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

/**
 * Log a step in the conversion process
 */
export function logStep(step: string, detail?: string): void {
  const logger = getLogger();
  if (detail) {
    logger.info(`${step}: ${detail}`);
  } else {
    logger.info(step);
  }
}

/**
 * Log progress (e.g., "Processing page 3/10")
 */
export function logProgress(current: number, total: number, label: string): void {
  const logger = getLogger();
  const percentage = Math.round((current / total) * 100);
  logger.info(`[${current}/${total}] ${percentage}% - ${label}`);
}

/**
 * Log debug information (only shown in verbose mode)
 */
export function logDebug(message: string, data?: unknown): void {
  const logger = getLogger();
  if (data) {
    logger.debug(message, data);
  } else {
    logger.debug(message);
  }
}

/**
 * Log a warning
 */
export function logWarn(message: string): void {
  const logger = getLogger();
  logger.warn(message);
}

/**
 * Log an error
 */
export function logError(message: string, error?: Error): void {
  const logger = getLogger();
  if (error) {
    logger.error(message, error);
  } else {
    logger.error(message);
  }
}

/**
 * Log success message
 */
export function logSuccess(message: string): void {
  const logger = getLogger();
  logger.success(message);
}

/**
 * Create a boxed title for major sections
 */
export function logBox(title: string): void {
  const logger = getLogger();
  logger.box(title);
}

/**
 * Log info message
 */
export function logInfo(message: string): void {
  const logger = getLogger();
  logger.info(message);
}

/**
 * Set verbose mode
 */
export function setVerbose(verbose: boolean): void {
  loggerInstance = createLogger({ verbose });
}
