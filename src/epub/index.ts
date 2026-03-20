/**
 * EPUB Generator module - orchestrates EPUB generation from Book data
 */

import type { Book, IEpubGenerator, Chapter, ProcessedImage, BookMetadata } from '../core/types.js';
import { EpubGenerationError } from '../core/errors.js';
import { logStep, logDebug, logSuccess } from '../core/logger.js';
import { writeEpub, validateOutputPath, generateOutputFilename } from './epub-writer.js';
import type { EpubWriterOptions, EpubWriteResult } from './epub-writer.js';
import { inferMetadata, extractTitleFromUrl } from './metadata-builder.js';

export interface EpubGeneratorOptions extends EpubWriterOptions {
  /** Infer missing metadata from URL and content */
  inferMissingMetadata?: boolean;
}

const DEFAULT_OPTIONS: EpubGeneratorOptions = {
  includeImages: true,
  customToc: false,
  verbose: false,
  inferMissingMetadata: true,
};

export class EpubGenerator implements IEpubGenerator {
  private options: EpubGeneratorOptions;

  constructor(options: EpubGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate an EPUB file from a Book object
   */
  async generate(book: Book, outputPath: string): Promise<string> {
    logStep('Starting EPUB generation', book.title);

    // Validate inputs
    this.validateBook(book);
    validateOutputPath(outputPath);

    // Enrich metadata if needed
    const enrichedBook = this.options.inferMissingMetadata
      ? this.enrichMetadata(book)
      : book;

    // Write the EPUB
    const result = await writeEpub(enrichedBook, outputPath, this.options);

    logSuccess(`EPUB generated successfully: ${result.outputPath}`);
    return result.outputPath;
  }

  /**
   * Validate that a book has the minimum required data
   */
  private validateBook(book: Book): void {
    if (!book) {
      throw new EpubGenerationError('Book is required');
    }

    if (!book.chapters || book.chapters.length === 0) {
      throw new EpubGenerationError('Book must have at least one chapter');
    }

    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];
      if (!chapter) {
        throw new EpubGenerationError(`Chapter at index ${i} is undefined`);
      }
      if (!chapter.content) {
        throw new EpubGenerationError(`Chapter "${chapter.title}" has no content`);
      }
    }

    logDebug(`Book validation passed: ${book.chapters.length} chapters`);
  }

  /**
   * Enrich book metadata with inferred values
   */
  private enrichMetadata(book: Book): Book {
    const enriched = { ...book };

    // Infer title from first chapter's URL if missing
    if (!enriched.title && enriched.chapters.length > 0) {
      const firstChapter = enriched.chapters[0];
      if (firstChapter) {
        enriched.title = extractTitleFromUrl(firstChapter.sourceUrl);
        logDebug(`Inferred title: ${enriched.title}`);
      }
    }

    // Infer metadata from URL
    if (enriched.chapters.length > 0) {
      const firstChapter = enriched.chapters[0];
      if (firstChapter) {
        const inferred = inferMetadata(firstChapter.sourceUrl, enriched.chapters);

        enriched.metadata = {
          ...inferred,
          ...enriched.metadata, // User-provided metadata takes precedence
        };
      }
    }

    return enriched;
  }
}

/**
 * Create a new EPUB generator instance
 */
export function createEpubGenerator(options?: EpubGeneratorOptions): EpubGenerator {
  return new EpubGenerator(options);
}

/**
 * Create a Book object from chapters and optional metadata
 * 
 * This is a convenience function for building a Book from raw parts
 */
export function createBook(
  chapters: Chapter[],
  images: ProcessedImage[],
  options: {
    title?: string;
    author?: string;
    language?: string;
    cover?: ProcessedImage;
    metadata?: Partial<BookMetadata>;
  } = {}
): Book {
  return {
    title: options.title || 'Untitled',
    author: options.author || 'Unknown',
    language: options.language || 'en',
    chapters,
    images,
    cover: options.cover,
    metadata: {
      publisher: options.metadata?.publisher,
      description: options.metadata?.description,
      date: options.metadata?.date,
      rights: options.metadata?.rights,
      identifier: options.metadata?.identifier,
    },
  };
}

// Re-export for convenience
export * from './metadata-builder.js';
export * from './toc-generator.js';
export * from './epub-writer.js';
