/**
 * Chapter Builder module - creates chapters from normalized pages
 */

import type { NormalizedPage, Chapter, IChapterBuilder } from '../core/types.js';
import { logStep, logDebug, logSuccess } from '../core/logger.js';
import {
  createChapters,
  filterValidChapters,
  sanitizeTitle,
  generateChapterId,
  wrapChapterContent,
} from './chapter-factory.js';
import {
  sortByOrder,
  normalizeOrder,
  resolveDuplicateOrders,
  detectOrderAnomalies,
} from './order-resolver.js';

export interface ChapterBuilderOptions {
  /** Filter out empty chapters */
  filterEmpty?: boolean;
  /** Detect and warn about ordering anomalies */
  detectAnomalies?: boolean;
}

const DEFAULT_OPTIONS: ChapterBuilderOptions = {
  filterEmpty: true,
  detectAnomalies: true,
};

export class ChapterBuilder implements IChapterBuilder {
  private options: ChapterBuilderOptions;

  constructor(options: ChapterBuilderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build chapters from normalized pages
   */
  build(pages: NormalizedPage[]): Chapter[] {
    logStep('Building chapters', `${pages.length} pages`);

    // Sort pages by order
    const sortedPages = sortByOrder(pages);

    // Resolve any duplicate orders
    const resolvedPages = resolveDuplicateOrders(sortedPages);

    // Create chapters
    let chapters = createChapters(resolvedPages);

    // Filter empty chapters
    if (this.options.filterEmpty) {
      const beforeCount = chapters.length;
      chapters = filterValidChapters(chapters);
      
      if (chapters.length < beforeCount) {
        logDebug(`Filtered ${beforeCount - chapters.length} empty chapters`);
      }
    }

    // Normalize order (ensure sequential 0, 1, 2, ...)
    chapters = normalizeOrder(chapters);

    // Detect anomalies
    if (this.options.detectAnomalies) {
      detectOrderAnomalies(chapters);
    }

    logSuccess(`Built ${chapters.length} chapters`);
    return chapters;
  }
}

/**
 * Create a new chapter builder instance
 */
export function createChapterBuilder(options?: ChapterBuilderOptions): ChapterBuilder {
  return new ChapterBuilder(options);
}

// Re-export for convenience
export * from './chapter-factory.js';
export * from './order-resolver.js';
