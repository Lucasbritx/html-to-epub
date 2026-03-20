/**
 * Parser module - orchestrates content extraction from crawled pages
 */

import type {
  CrawlResult,
  ParsedPage,
  SelectorConfig,
  IParser,
} from '../core/types.js';
import { ParseError } from '../core/errors.js';
import { logStep, logProgress, logDebug, logWarn } from '../core/logger.js';
import { extractContent, cleanContent } from './content-extractor.js';
import { defaultSelectors } from './selectors/default.js';

export interface ParserOptions {
  /** Custom selector configuration */
  selectors?: Partial<SelectorConfig>;
}

export class Parser implements IParser {
  private selectors: SelectorConfig;

  constructor(options: ParserOptions = {}) {
    this.selectors = {
      ...defaultSelectors,
      ...options.selectors,
    };
  }

  /**
   * Parse multiple crawled pages
   */
  parse(pages: CrawlResult[], config?: SelectorConfig): ParsedPage[] {
    const selectors = config || this.selectors;

    logStep('Parsing pages', `${pages.length} pages`);

    const results: ParsedPage[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!page) continue;

      logProgress(i + 1, pages.length, page.title || page.url);

      try {
        const parsed = this.parsePage(page, selectors);
        results.push(parsed);
      } catch (error) {
        // Re-throw to fail the entire process
        if (error instanceof ParseError) {
          throw error;
        }
        throw new ParseError(
          `Failed to parse page: ${error instanceof Error ? error.message : error}`,
          { url: page.url, cause: error instanceof Error ? error : undefined }
        );
      }
    }

    logDebug(`Successfully parsed ${results.length} pages`);
    return results;
  }

  /**
   * Parse a single page
   */
  private parsePage(page: CrawlResult, selectors: SelectorConfig): ParsedPage {
    const extraction = extractContent(page.html, page.url, selectors);

    // Clean the extracted content
    const cleanedContent = cleanContent(extraction.content);

    return {
      url: page.url,
      title: extraction.title || page.title || 'Untitled',
      content: cleanedContent,
      images: extraction.images,
      order: page.order,
    };
  }
}

/**
 * Create a new parser instance
 */
export function createParser(options?: ParserOptions): Parser {
  return new Parser(options);
}

// Re-export for convenience
export * from './content-extractor.js';
export * from './noise-remover.js';
export * from './selectors/index.js';
