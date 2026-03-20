/**
 * Page fetcher using Playwright
 * Handles browser lifecycle and page loading
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { BrowserError, CrawlTimeoutError } from '../core/errors.js';
import { logDebug, logWarn } from '../core/logger.js';
import { withRetry, isNetworkError } from '../utils/retry.js';

export interface PageFetchResult {
  html: string;
  title: string;
  url: string;
}

export interface FetchOptions {
  timeout: number;
  waitForSelector?: string;
  waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
}

const DEFAULT_FETCH_OPTIONS: FetchOptions = {
  timeout: 30000,
  waitForLoadState: 'domcontentloaded',
};

export class PageFetcher {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private isInitialized = false;

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logDebug('Launching browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-gpu',
        ],
      });

      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        javaScriptEnabled: true,
      });

      this.isInitialized = true;
      logDebug('Browser initialized');
    } catch (error) {
      throw new BrowserError(
        'Failed to initialize browser',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fetch a single page
   */
  async fetch(url: string, options: Partial<FetchOptions> = {}): Promise<PageFetchResult> {
    const opts = { ...DEFAULT_FETCH_OPTIONS, ...options };

    if (!this.context) {
      await this.initialize();
    }

    return withRetry(
      async () => {
        const page = await this.context!.newPage();

        try {
          logDebug(`Fetching: ${url}`);

          // Navigate to the page
          const response = await page.goto(url, {
            timeout: opts.timeout,
            waitUntil: opts.waitForLoadState,
          });

          if (!response) {
            throw new Error(`No response from ${url}`);
          }

          if (!response.ok()) {
            throw new Error(`HTTP ${response.status()} for ${url}`);
          }

          // Wait for additional selector if specified
          if (opts.waitForSelector) {
            await page.waitForSelector(opts.waitForSelector, {
              timeout: opts.timeout / 2,
            }).catch(() => {
              logWarn(`Selector "${opts.waitForSelector}" not found on ${url}`);
            });
          }

          // Get page content
          const html = await page.content();
          const title = await page.title();

          return {
            html,
            title,
            url: page.url(), // Use final URL in case of redirects
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes('Timeout')) {
            throw new CrawlTimeoutError(url, opts.timeout);
          }
          throw error;
        } finally {
          await page.close();
        }
      },
      {
        maxAttempts: 3,
        isRetryable: (error) => isNetworkError(error),
        onRetry: (attempt, error) => {
          logWarn(`Retry ${attempt} for ${url}: ${error.message}`);
        },
      }
    );
  }

  /**
   * Fetch multiple pages concurrently
   */
  async fetchMany(
    urls: string[],
    options: Partial<FetchOptions> = {},
    concurrency = 3
  ): Promise<Map<string, PageFetchResult>> {
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(concurrency);

    const results = new Map<string, PageFetchResult>();

    const tasks = urls.map((url) =>
      limit(async () => {
        try {
          const result = await this.fetch(url, options);
          results.set(url, result);
        } catch (error) {
          logWarn(`Failed to fetch ${url}: ${error instanceof Error ? error.message : error}`);
          throw error;
        }
      })
    );

    await Promise.all(tasks);
    return results;
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.isInitialized = false;
    logDebug('Browser closed');
  }
}

// Singleton instance for reuse
let fetcherInstance: PageFetcher | null = null;

export function getPageFetcher(): PageFetcher {
  if (!fetcherInstance) {
    fetcherInstance = new PageFetcher();
  }
  return fetcherInstance;
}

export async function closePageFetcher(): Promise<void> {
  if (fetcherInstance) {
    await fetcherInstance.close();
    fetcherInstance = null;
  }
}
