/**
 * Pagination-based crawl strategy
 * Used for sites with "Next" / "Previous" navigation
 */

import type { CrawlResult } from '../../core/types.js';
import type { ICrawlStrategy, CrawlContext } from './base.js';
import { logDebug, logProgress } from '../../core/logger.js';
import { normalizeUrl, resolveUrl } from '../../utils/url.js';
import * as cheerio from 'cheerio';

export class PaginationStrategy implements ICrawlStrategy {
  readonly name = 'pagination';

  private nextSelectors: string[];
  private prevSelectors: string[];

  constructor(nextSelector?: string, prevSelector?: string) {
    this.nextSelectors = nextSelector
      ? [nextSelector]
      : [
          'a[rel="next"]',
          '.next a',
          'a.next',
          '.pagination-next a',
          'a:contains("Next")',
          'a:contains("→")',
          'a:contains("»")',
          '.nav-next a',
          '[aria-label="Next"]',
        ];

    this.prevSelectors = prevSelector
      ? [prevSelector]
      : [
          'a[rel="prev"]',
          '.prev a',
          'a.prev',
          '.pagination-prev a',
          'a:contains("Previous")',
          'a:contains("←")',
          'a:contains("«")',
          '.nav-prev a',
          '[aria-label="Previous"]',
        ];
  }

  canHandle(html: string, _url: string): boolean {
    const $ = cheerio.load(html);

    // Check if any next selectors match
    for (const selector of this.nextSelectors) {
      try {
        if ($(selector).length > 0) {
          return true;
        }
      } catch {
        // Invalid selector, skip
      }
    }

    return false;
  }

  async crawl(context: CrawlContext, initialHtml: string): Promise<CrawlResult[]> {
    const { baseUrl, fetcher, timeout, visited } = context;

    const results: CrawlResult[] = [];
    let currentUrl = baseUrl;
    let currentHtml = initialHtml;
    let order = 0;
    const maxPages = 500; // Safety limit

    while (order < maxPages) {
      const normalizedCurrent = normalizeUrl(currentUrl);

      if (visited.has(normalizedCurrent) && order > 0) {
        break;
      }

      visited.add(normalizedCurrent);

      logProgress(order + 1, maxPages, `Page ${order + 1}`);

      results.push({
        url: currentUrl,
        html: currentHtml,
        title: extractTitle(currentHtml),
        discoveredLinks: [],
        order: order++,
        fetchedAt: new Date(),
      });

      // Find the next page link
      const nextUrl = this.findNextLink(currentHtml, currentUrl);

      if (!nextUrl) {
        logDebug('No more pages found');
        break;
      }

      const normalizedNext = normalizeUrl(nextUrl);

      if (visited.has(normalizedNext)) {
        logDebug('Next page already visited');
        break;
      }

      try {
        const result = await fetcher.fetch(nextUrl, { timeout });
        currentUrl = result.url;
        currentHtml = result.html;
      } catch (error) {
        // Re-throw to fail the entire process
        throw error;
      }
    }

    return results;
  }

  private findNextLink(html: string, baseUrl: string): string | null {
    const $ = cheerio.load(html);

    for (const selector of this.nextSelectors) {
      try {
        const $next = $(selector).first();

        if ($next.length > 0) {
          const href = $next.attr('href');

          if (href) {
            const resolved = resolveUrl(href, baseUrl);

            if (resolved) {
              logDebug(`Found next link: ${resolved}`);
              return resolved;
            }
          }
        }
      } catch {
        // Invalid selector, skip
      }
    }

    return null;
  }
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? '';
}
