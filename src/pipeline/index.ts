/**
 * Pipeline orchestrator - coordinates the entire HTML-to-EPUB conversion process
 */

import type {
  ConversionOptions,
  ConversionResult,
  SiteConfig,
  Book,
} from '../core/types.js';
import { ConversionError, CrawlError } from '../core/errors.js';
import { logStep, logSuccess, logInfo, logDebug } from '../core/logger.js';
import { getDefaultConfig, detectSiteType } from '../core/config.js';
import { createCrawler } from '../crawler/index.js';
import { createParser } from '../parser/index.js';
import { createNormalizer } from '../normalizer/index.js';
import { createChapterBuilder } from '../chapter-builder/index.js';
import { createEpubGenerator, createBook } from '../epub/index.js';

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS = {
  maxConcurrency: 5,
  timeout: 30000,
};

/**
 * Convert a website to EPUB
 */
export async function convert(options: ConversionOptions): Promise<ConversionResult> {
  const startTime = Date.now();

  logStep('Starting conversion pipeline', options.url);

  const config: ConversionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const crawler = createCrawler({
    maxConcurrency: config.maxConcurrency,
    timeout: config.timeout,
  });

  try {
    // Step 1: Crawl the website
    logStep('Step 1/5', 'Crawling website');
    const crawlResults = await crawler.crawl(config.url, config.siteConfig as SiteConfig);
    logInfo(`Found ${crawlResults.length} pages`);

    // Detect site config from first page if not provided
    const siteConfig = config.siteConfig as SiteConfig || 
      detectSiteType(config.url, crawlResults[0]?.html || '');

    // Step 2: Parse pages
    logStep('Step 2/5', 'Parsing content');
    const parser = createParser();
    const parsedPages = parser.parse(crawlResults, siteConfig.selectors);
    logInfo(`Parsed ${parsedPages.length} pages`);

    // Step 3: Normalize content
    logStep('Step 3/5', 'Normalizing content');
    const normalizer = createNormalizer();
    const normalizedPages = await normalizer.normalize(
      parsedPages,
      config.url,
      siteConfig.imageOptions
    );
    logInfo(`Normalized ${normalizedPages.length} pages`);

    // Collect all images from normalized pages
    const allImages = new Map();
    for (const page of normalizedPages) {
      for (const img of page.images) {
        if (!allImages.has(img.originalUrl)) {
          allImages.set(img.originalUrl, img);
        }
      }
    }
    const uniqueImages = Array.from(allImages.values());
    logDebug(`Total unique images: ${uniqueImages.length}`);

    // Step 4: Build chapters
    logStep('Step 4/5', 'Building chapters');
    const chapterBuilder = createChapterBuilder();
    const chapters = chapterBuilder.build(normalizedPages);
    logInfo(`Built ${chapters.length} chapters`);

    // Step 5: Generate EPUB
    logStep('Step 5/5', 'Generating EPUB');

    // Infer title from first page if not provided
    const title = config.title || 
      (crawlResults[0]?.title) || 
      extractTitleFromUrl(config.url);

    const book: Book = createBook(chapters, uniqueImages, {
      title,
      author: config.author,
      language: 'en',
    });

    const epubGenerator = createEpubGenerator();
    const outputPath = await epubGenerator.generate(book, config.output);

    // Calculate results
    const duration = Date.now() - startTime;
    const stats = await import('fs/promises').then((fs) => fs.stat(outputPath));

    const result: ConversionResult = {
      success: true,
      outputPath,
      chaptersCount: chapters.length,
      imagesCount: uniqueImages.length,
      totalSize: stats.size,
      duration,
    };

    logSuccess('Conversion completed successfully!');
    return result;
  } catch (error) {
    // Re-throw if already a ConversionError
    if (error instanceof ConversionError) {
      throw error;
    }
    throw new CrawlError(
      `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      { url: config.url, cause: error instanceof Error ? error : undefined }
    );
  } finally {
    // Always close the crawler to release browser resources
    await crawler.close();
  }
}

/**
 * Extract a title from URL path
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split('/')
      .filter((part) => part && part !== 'index.html' && !part.includes('.'));

    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }
    }

    return urlObj.hostname.replace(/^www\./, '').split('.')[0] || 'Book';
  } catch {
    return 'Book';
  }
}

// Export the main conversion function
export default convert;
