/**
 * Auto-detection crawl strategy
 * Tries to detect the best strategy for the given site
 */

import type { CrawlResult, SiteConfig } from '../../core/types.js';
import type { ICrawlStrategy, CrawlContext } from './base.js';
import { SidebarStrategy } from './sidebar.js';
import { PaginationStrategy } from './pagination.js';
import { extractAllLinks, filterChapterLinks } from '../link-extractor.js';
import { logDebug, logProgress } from '../../core/logger.js';
import { normalizeUrl } from '../../utils/url.js';
import { detectSiteType } from '../../core/config.js';

export class AutoStrategy implements ICrawlStrategy {
  readonly name = 'auto';

  private sidebarStrategy: SidebarStrategy;
  private paginationStrategy: PaginationStrategy;

  constructor() {
    this.sidebarStrategy = new SidebarStrategy();
    this.paginationStrategy = new PaginationStrategy();
  }

  canHandle(_html: string, _url: string): boolean {
    // Auto strategy can always attempt to handle
    return true;
  }

  async crawl(context: CrawlContext, initialHtml: string): Promise<CrawlResult[]> {
    const { baseUrl, fetcher, timeout, maxConcurrency, visited } = context;

    // First, try to detect site type and get appropriate config
    const detectedConfig = detectSiteType(baseUrl, initialHtml);
    logDebug(`Detected site type config`);

    // Create an updated context with detected config
    const updatedContext: CrawlContext = {
      ...context,
      config: detectedConfig,
    };

    // Try sidebar strategy first (most common for documentation)
    if (this.sidebarStrategy.canHandle(initialHtml, baseUrl)) {
      logDebug('Auto-detected: sidebar navigation');
      return this.sidebarStrategy.crawl(updatedContext, initialHtml);
    }

    // Try pagination strategy
    if (this.paginationStrategy.canHandle(initialHtml, baseUrl)) {
      logDebug('Auto-detected: pagination navigation');
      return this.paginationStrategy.crawl(updatedContext, initialHtml);
    }

    // Fallback: extract all links and crawl them
    logDebug('Fallback: extracting all links');
    return this.crawlAllLinks(updatedContext, initialHtml);
  }

  private async crawlAllLinks(
    context: CrawlContext,
    initialHtml: string
  ): Promise<CrawlResult[]> {
    const { baseUrl, fetcher, timeout, maxConcurrency, visited } = context;

    // Extract all links from the page
    const allLinks = extractAllLinks(initialHtml, baseUrl);
    const filteredLinks = filterChapterLinks(allLinks);

    logDebug(`Found ${filteredLinks.length} potential chapter links`);

    const results: CrawlResult[] = [];
    let order = 0;

    // Add the initial page
    const normalizedBase = normalizeUrl(baseUrl);
    results.push({
      url: baseUrl,
      html: initialHtml,
      title: extractTitle(initialHtml),
      discoveredLinks: filteredLinks.map((l) => l.href),
      order: order++,
      fetchedAt: new Date(),
    });
    visited.add(normalizedBase);

    // Fetch linked pages
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(maxConcurrency);

    const tasks = filteredLinks.map((link, index) =>
      limit(async () => {
        const normalizedHref = normalizeUrl(link.href);

        if (visited.has(normalizedHref)) {
          return null;
        }

        visited.add(normalizedHref);

        try {
          logProgress(index + 1, filteredLinks.length, link.text || link.href);

          const result = await fetcher.fetch(link.href, { timeout });

          return {
            url: result.url,
            html: result.html,
            title: result.title || link.text,
            discoveredLinks: [],
            order: order++,
            fetchedAt: new Date(),
          } as CrawlResult;
        } catch (error) {
          throw error;
        }
      })
    );

    const fetched = await Promise.all(tasks);

    for (const result of fetched) {
      if (result) {
        results.push(result);
      }
    }

    // Sort by order
    results.sort((a, b) => a.order - b.order);

    return results;
  }
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? '';
}
