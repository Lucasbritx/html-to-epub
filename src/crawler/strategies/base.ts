/**
 * Base crawl strategy interface
 */

import type { CrawlResult, SiteConfig } from '../../core/types.js';
import type { PageFetcher } from '../page-fetcher.js';

export interface CrawlContext {
  baseUrl: string;
  fetcher: PageFetcher;
  config: SiteConfig;
  timeout: number;
  maxConcurrency: number;
  visited: Set<string>;
}

export interface ICrawlStrategy {
  /**
   * Name of the strategy for logging
   */
  readonly name: string;

  /**
   * Check if this strategy can handle the given page
   */
  canHandle(html: string, url: string): boolean;

  /**
   * Execute the crawl strategy
   */
  crawl(context: CrawlContext, initialHtml: string): Promise<CrawlResult[]>;
}
