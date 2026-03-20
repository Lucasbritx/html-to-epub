/**
 * Custom error classes for the HTML-to-EPUB converter
 */

import type { ErrorCode } from './types.js';

export class ConversionError extends Error {
  public readonly code: ErrorCode;
  public readonly url?: string;
  public readonly cause?: Error;

  constructor(code: ErrorCode, message: string, options?: { url?: string; cause?: Error }) {
    super(message);
    this.name = 'ConversionError';
    this.code = code;
    this.url = options?.url;
    this.cause = options?.cause;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, ConversionError);
  }

  toString(): string {
    let result = `[${this.code}] ${this.message}`;
    if (this.url) {
      result += ` (URL: ${this.url})`;
    }
    return result;
  }
}

export class CrawlError extends ConversionError {
  constructor(message: string, options?: { url?: string; cause?: Error }) {
    super('CRAWL_FAILED', message, options);
    this.name = 'CrawlError';
  }
}

export class CrawlTimeoutError extends ConversionError {
  constructor(url: string, timeout: number) {
    super('CRAWL_TIMEOUT', `Page load timed out after ${timeout}ms`, { url });
    this.name = 'CrawlTimeoutError';
  }
}

export class ParseError extends ConversionError {
  constructor(message: string, options?: { url?: string; cause?: Error }) {
    super('PARSE_FAILED', message, options);
    this.name = 'ParseError';
  }
}

export class NormalizeError extends ConversionError {
  constructor(message: string, options?: { url?: string; cause?: Error }) {
    super('NORMALIZE_FAILED', message, options);
    this.name = 'NormalizeError';
  }
}

export class ImageDownloadError extends ConversionError {
  constructor(imageUrl: string, cause?: Error) {
    super('IMAGE_DOWNLOAD_FAILED', `Failed to download image: ${imageUrl}`, {
      url: imageUrl,
      cause,
    });
    this.name = 'ImageDownloadError';
  }
}

export class EpubGenerationError extends ConversionError {
  constructor(message: string, options?: { cause?: Error }) {
    super('EPUB_GENERATION_FAILED', message, { cause: options?.cause });
    this.name = 'EpubGenerationError';
  }
}

export class InvalidUrlError extends ConversionError {
  constructor(url: string) {
    super('INVALID_URL', `Invalid URL provided: ${url}`, { url });
    this.name = 'InvalidUrlError';
  }
}

export class InvalidConfigError extends ConversionError {
  constructor(message: string) {
    super('INVALID_CONFIG', message);
    this.name = 'InvalidConfigError';
  }
}

export class NoChaptersFoundError extends ConversionError {
  constructor(url: string) {
    super('NO_CHAPTERS_FOUND', 'No chapters or pages were discovered', { url });
    this.name = 'NoChaptersFoundError';
  }
}

export class NoContentFoundError extends ConversionError {
  constructor(url: string) {
    super('NO_CONTENT_FOUND', 'Could not extract content from page', { url });
    this.name = 'NoContentFoundError';
  }
}

export class BrowserError extends ConversionError {
  constructor(message: string, cause?: Error) {
    super('BROWSER_ERROR', message, { cause });
    this.name = 'BrowserError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
