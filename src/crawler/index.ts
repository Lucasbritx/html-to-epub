/**
 * Crawler orchestrator
 * Coordinates page fetching and link discovery
 */

import type { CrawlResult, SiteConfig, ICrawler } from '../core/types.js';
import { NoChaptersFoundError, CrawlError } from '../core/errors.js';
import { logStep, logDebug, logSuccess } from '../core/logger.js';
import { getDefaultConfig, detectSiteType } from '../core/config.js';
import { normalizeUrl } from '../utils/url.js';
import { PageFetcher, getPageFetcher, closePageFetcher } from './page-fetcher.js';
import { SidebarStrategy, PaginationStrategy, AutoStrategy } from './strategies/index.js';
import type { ICrawlStrategy, CrawlContext } from './strategies/base.js';

export interface CrawlerOptions {
  /** Maximum concurrent page fetches */
  maxConcurrency: number;
  /** Page load timeout in ms */
  timeout: number;
  /** Site-specific configuration */
  siteConfig?: SiteConfig;
}

const DEFAULT_CRAWLER_OPTIONS: CrawlerOptions = {
  maxConcurrency: 3,
  timeout: 30000,
};

export class Crawler implements ICrawler {
  private fetcher: PageFetcher;
  private options: CrawlerOptions;
  private strategies: ICrawlStrategy[];

  constructor(options: Partial<CrawlerOptions> = {}) {
    this.options = { ...DEFAULT_CRAWLER_OPTIONS, ...options };
    this.fetcher = getPageFetcher();
    this.strategies = [
      new SidebarStrategy(),
      new PaginationStrategy(),
      new AutoStrategy(),
    ];
  }

  /**
   * Crawl a website starting from the base URL
   */
  async crawl(baseUrl: string, config?: SiteConfig): Promise<CrawlResult[]> {
    logStep('Starting crawl', baseUrl);

    const visited = new Set<string>();
    const normalizedBase = normalizeUrl(baseUrl);

    try {
      // Initialize browser
      await this.fetcher.initialize();

      // Fetch the initial page
      logDebug('Fetching initial page...');
      const initialPage = await this.fetcher.fetch(baseUrl, {
        timeout: this.options.timeout,
      });

      // Auto-detect site configuration if not provided
      const siteConfig = config || this.options.siteConfig || detectSiteType(baseUrl, initialPage.html);
      logDebug(`Using site config: ${JSON.stringify(siteConfig.crawlStrategy)}`);

      // Select the appropriate strategy
      const strategy = this.selectStrategy(siteConfig, initialPage.html, baseUrl);
      logStep('Using crawl strategy', strategy.name);

      // Create crawl context
      const context: CrawlContext = {
        baseUrl,
        fetcher: this.fetcher,
        config: siteConfig,
        timeout: this.options.timeout,
        maxConcurrency: this.options.maxConcurrency,
        visited,
      };

      // Execute the crawl
      const results = await strategy.crawl(context, initialPage.html);

      if (results.length === 0) {
        throw new NoChaptersFoundError(baseUrl);
      }

      logSuccess(`Crawled ${results.length} pages`);
      return results;
    } catch (error) {
      if (error instanceof NoChaptersFoundError) {
        throw error;
      }
      throw new CrawlError(
        `Crawl failed: ${error instanceof Error ? error.message : error}`,
        { url: baseUrl, cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Select the appropriate crawl strategy based on configuration and page content
   */
  private selectStrategy(
    config: SiteConfig,
    html: string,
    url: string
  ): ICrawlStrategy {
    // If strategy is explicitly configured, use it
    switch (config.crawlStrategy.type) {
      case 'sidebar':
        return new SidebarStrategy(config.crawlStrategy.selector);
      case 'pagination':
        return new PaginationStrategy(
          config.crawlStrategy.nextSelector,
          config.crawlStrategy.prevSelector
        );
      case 'links':
        // Use sidebar strategy with the provided selector
        return new SidebarStrategy(config.crawlStrategy.selector);
      case 'auto':
      default:
        // Try each strategy to find one that can handle the page
        for (const strategy of this.strategies) {
          if (strategy.name !== 'auto' && strategy.canHandle(html, url)) {
            return strategy;
          }
        }
        // Fall back to auto strategy
        return new AutoStrategy();
    }
  }

  /**
   * Close the browser and clean up resources
   */
  async close(): Promise<void> {
    await closePageFetcher();
  }
}

/**
 * Create a new crawler instance
 */
export function createCrawler(options?: Partial<CrawlerOptions>): Crawler {
  return new Crawler(options);
}
