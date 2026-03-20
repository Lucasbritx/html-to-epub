/**
 * Metadata builder - constructs EPUB metadata from book information
 */

import type { Book, BookMetadata } from '../core/types.js';
import { logDebug } from '../core/logger.js';

/**
 * Options for epub-gen-memory library
 */
export interface EpubOptions {
  title: string;
  author: string | string[];
  language?: string;
  lang?: string;
  identifier?: string;
  publisher?: string;
  description?: string;
  date?: string;
  rights?: string;
  cover?: string; // URL or data URL
  tocTitle?: string;
  appendChapterTitles?: boolean;
  prependChapterTitles?: boolean;
  customOpfTemplatePath?: string;
  customNcxTocTemplatePath?: string;
  customHtmlTocTemplatePath?: string;
  version?: number;
  verbose?: boolean;
}

/**
 * Content entry for epub-gen-memory
 */
export interface EpubContent {
  title: string;
  data: string;
  filename?: string;
  excludeFromToc?: boolean;
  beforeToc?: boolean;
}

/**
 * Build EPUB options from a Book object
 */
export function buildEpubOptions(book: Book): EpubOptions {
  logDebug(`Building EPUB metadata for: ${book.title}`);

  const options: EpubOptions = {
    title: sanitizeMetadataField(book.title) || 'Untitled Book',
    author: sanitizeMetadataField(book.author) || 'Unknown Author',
    language: book.language || 'en',
    tocTitle: 'Table of Contents',
    appendChapterTitles: false, // We handle titles in chapter content
    version: 3,
  };

  // Add optional metadata
  if (book.metadata.identifier) {
    options.identifier = book.metadata.identifier;
  } else {
    // Generate a stable identifier from title and author
    options.identifier = generateIdentifier(book.title, book.author);
  }

  if (book.metadata.publisher) {
    options.publisher = sanitizeMetadataField(book.metadata.publisher);
  }

  if (book.metadata.description) {
    options.description = sanitizeMetadataField(book.metadata.description);
  }

  if (book.metadata.date) {
    options.date = book.metadata.date;
  } else {
    // Use current date
    options.date = new Date().toISOString().split('T')[0];
  }

  if (book.metadata.rights) {
    options.rights = sanitizeMetadataField(book.metadata.rights);
  }

  // Add cover if available (convert to data URL)
  if (book.cover) {
    const base64Data = book.cover.data.toString('base64');
    options.cover = `data:${book.cover.mimeType};base64,${base64Data}`;
    logDebug('Cover image included');
  }

  // Use 'lang' instead of 'language' for epub-gen-memory
  options.lang = options.language;

  return options;
}

/**
 * Generate a stable unique identifier for the book
 */
export function generateIdentifier(title: string, author: string): string {
  const slug = `${title}-${author}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  const timestamp = Date.now().toString(36);
  return `urn:uuid:${slug}-${timestamp}`;
}

/**
 * Sanitize a metadata field for EPUB compatibility
 */
export function sanitizeMetadataField(value: string | undefined): string | undefined {
  if (!value) return undefined;

  return value
    .trim()
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Infer book metadata from URL and content when not explicitly provided
 */
export function inferMetadata(
  url: string,
  chapters: { title: string }[]
): Partial<BookMetadata> {
  const metadata: Partial<BookMetadata> = {};

  // Try to extract publisher from domain
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    // Common patterns
    if (domain.includes('github.io')) {
      const parts = domain.split('.github.io');
      if (parts[0]) {
        metadata.publisher = parts[0];
      }
    } else if (domain.includes('gitbook.io')) {
      metadata.publisher = 'GitBook';
    } else if (domain.includes('readthedocs.')) {
      metadata.publisher = 'Read the Docs';
    } else {
      // Use domain as publisher
      metadata.publisher = domain;
    }
  } catch {
    // Invalid URL, skip
  }

  // Generate description from chapter titles
  if (chapters.length > 0) {
    const chapterList = chapters
      .slice(0, 5)
      .map((c) => c.title)
      .join(', ');

    metadata.description =
      chapters.length <= 5
        ? `Chapters: ${chapterList}`
        : `Chapters: ${chapterList}, and ${chapters.length - 5} more`;
  }

  return metadata;
}

/**
 * Extract title from URL path when no title is provided
 */
export function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split('/')
      .filter((part) => part && part !== 'index.html' && !part.includes('.'));

    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        // Convert kebab-case or snake_case to title case
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }
    }

    // Fall back to hostname
    return urlObj.hostname.replace(/^www\./, '').split('.')[0] || 'Untitled';
  } catch {
    return 'Untitled';
  }
}
