/**
 * CLI validators - input validation for command-line arguments
 */

import { statSync, accessSync, constants } from 'fs';
import { dirname } from 'path';
import { ValidationError } from '../core/errors.js';

/**
 * Validate that a URL is valid and uses HTTP(S) protocol
 */
export function validateUrl(url: string): string {
  if (!url) {
    throw new ValidationError('URL is required');
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError(
        `Invalid protocol: ${parsed.protocol}. Only HTTP and HTTPS are supported.`
      );
    }

    return parsed.href;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Invalid URL: ${url}`);
  }
}

/**
 * Validate and normalize the output path
 */
export function validateOutputPath(outputPath: string): string {
  if (!outputPath) {
    throw new ValidationError('Output path is required');
  }

  // Ensure .epub extension
  const normalizedPath = outputPath.endsWith('.epub')
    ? outputPath
    : `${outputPath}.epub`;

  // Check if parent directory exists and is writable
  const parentDir = dirname(normalizedPath);

  try {
    const stats = statSync(parentDir);
    if (!stats.isDirectory()) {
      throw new ValidationError(`Not a directory: ${parentDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Parent directory doesn't exist, we'll create it
      return normalizedPath;
    }
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Cannot access output directory: ${parentDir}`);
  }

  // Check write permission
  try {
    accessSync(parentDir, constants.W_OK);
  } catch {
    throw new ValidationError(`No write permission for directory: ${parentDir}`);
  }

  return normalizedPath;
}

/**
 * Validate a positive integer option
 */
export function validatePositiveInt(
  value: string | undefined,
  name: string,
  defaultValue: number
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || parsed <= 0) {
    throw new ValidationError(`${name} must be a positive integer, got: ${value}`);
  }

  return parsed;
}

/**
 * Validate concurrency option (1-20)
 */
export function validateConcurrency(value: string | undefined): number {
  const concurrency = validatePositiveInt(value, 'Concurrency', 5);

  if (concurrency > 20) {
    throw new ValidationError('Concurrency cannot exceed 20');
  }

  return concurrency;
}

/**
 * Validate timeout option (1000ms - 300000ms)
 */
export function validateTimeout(value: string | undefined): number {
  const timeout = validatePositiveInt(value, 'Timeout', 30000);

  if (timeout < 1000) {
    throw new ValidationError('Timeout must be at least 1000ms');
  }

  if (timeout > 300000) {
    throw new ValidationError('Timeout cannot exceed 300000ms (5 minutes)');
  }

  return timeout;
}

/**
 * Validate title (non-empty, reasonable length)
 */
export function validateTitle(title: string | undefined): string | undefined {
  if (!title) {
    return undefined;
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length > 500) {
    throw new ValidationError('Title cannot exceed 500 characters');
  }

  return trimmed;
}

/**
 * Validate author (non-empty, reasonable length)
 */
export function validateAuthor(author: string | undefined): string | undefined {
  if (!author) {
    return undefined;
  }

  const trimmed = author.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length > 200) {
    throw new ValidationError('Author cannot exceed 200 characters');
  }

  return trimmed;
}

/**
 * Validate config file path
 */
export function validateConfigFile(configPath: string | undefined): string | undefined {
  if (!configPath) {
    return undefined;
  }

  try {
    const stats = statSync(configPath);
    if (!stats.isFile()) {
      throw new ValidationError(`Not a file: ${configPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ValidationError(`Config file not found: ${configPath}`);
    }
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Cannot access config file: ${configPath}`);
  }

  // Check read permission
  try {
    accessSync(configPath, constants.R_OK);
  } catch {
    throw new ValidationError(`No read permission for config file: ${configPath}`);
  }

  return configPath;
}
