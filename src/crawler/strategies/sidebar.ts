/**
 * Sidebar-based crawl strategy
 * Used for documentation sites with a sidebar navigation (docsify, gitbook, etc.)
 */

import type { CrawlResult } from '../../core/types.js';
import type { ICrawlStrategy, CrawlContext } from './base.js';
import { extractNavigationLinks, filterChapterLinks } from '../link-extractor.js';
import { logDebug, logProgress } from '../../core/logger.js';
import { normalizeUrl } from '../../utils/url.js';

export class SidebarStrategy implements ICrawlStrategy {
  readonly name = 'sidebar';

  private sidebarSelector: string;

  constructor(selector?: string) {
    this.sidebarSelector = selector || '.sidebar-nav a, .sidebar a, #sidebar a, nav a';
  }

  canHandle(html: string, _url: string): boolean {
    // Check for common sidebar patterns
    const sidebarPatterns = [
      'sidebar-nav',
      'sidebar',
      'book-summary',
      'toc',
      'table-of-contents',
      'nav-list',
    ];

    const htmlLower = html.toLowerCase();
    return sidebarPatterns.some(
      (pattern) => htmlLower.includes(`class="${pattern}"`) || htmlLower.includes(`id="${pattern}"`)
    );
  }

  async crawl(context: CrawlContext, initialHtml: string): Promise<CrawlResult[]> {
    const { baseUrl, fetcher, config, timeout, maxConcurrency, visited } = context;

    // Extract links from the sidebar
    const selectorString =
      config.crawlStrategy.type === 'sidebar'
        ? config.crawlStrategy.selector
        : this.sidebarSelector;

    const selectors = selectorString.split(',').map((s) => s.trim());

    const links = extractNavigationLinks(initialHtml, {
      navigationSelectors: selectors,
      baseUrl,
      sameSiteOnly: true,
    });

    const filteredLinks = filterChapterLinks(links);

    logDebug(`Sidebar strategy found ${filteredLinks.length} chapter links`);

    // Always include the base URL as the first page if not already in links
    const normalizedBase = normalizeUrl(baseUrl);
    const hasBasePage = filteredLinks.some((l) => normalizeUrl(l.href) === normalizedBase);

    const results: CrawlResult[] = [];
    let order = 0;

    // Fetch the initial page first if it's content
    if (!hasBasePage) {
      results.push({
        url: baseUrl,
        html: initialHtml,
        title: extractTitle(initialHtml),
        discoveredLinks: filteredLinks.map((l) => l.href),
        order: order++,
        fetchedAt: new Date(),
      });
      visited.add(normalizedBase);
    }

    // Fetch all linked pages
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
          logProgress(index + 1, filteredLinks.length, link.text);

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
          // Re-throw to fail the entire process
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

    // Sort by order to maintain reading sequence
    results.sort((a, b) => a.order - b.order);

    return results;
  }
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? '';
}
