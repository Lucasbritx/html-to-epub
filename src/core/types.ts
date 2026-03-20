/**
 * Core type definitions for the HTML-to-EPUB converter
 */

// ============================================
// CLI & CONFIGURATION TYPES
// ============================================

export interface CLIOptions {
  url: string;
  output: string;
  title?: string;
  author?: string;
  configFile?: string;
  maxConcurrency?: number;
  timeout?: number;
  verbose?: boolean;
}

export interface SiteConfig {
  selectors: SelectorConfig;
  crawlStrategy: CrawlStrategy;
  imageOptions: ImageOptions;
}

export interface SelectorConfig {
  /** CSS selectors for main content (tried in order) */
  content: string[];
  /** CSS selectors for chapter/page title */
  title: string[];
  /** CSS selectors for navigation/TOC links */
  navigation: string[];
  /** CSS selectors for elements to remove */
  exclude: string[];
  /** Optional: selector for links within navigation */
  chapterLink?: string;
}

export type CrawlStrategy =
  | { type: 'sidebar'; selector: string }
  | { type: 'pagination'; nextSelector: string; prevSelector?: string }
  | { type: 'links'; selector: string }
  | { type: 'auto' };

export interface ImageOptions {
  /** Maximum width in pixels (Kindle: 1200) */
  maxWidth: number;
  /** Maximum height in pixels (Kindle: 1600) */
  maxHeight: number;
  /** JPEG quality 0-100 */
  quality: number;
  /** Output format */
  format: 'jpeg' | 'png' | 'webp';
  /** Timeout for downloading each image (ms) */
  downloadTimeout: number;
}

// ============================================
// PIPELINE DATA TYPES
// ============================================

/** Raw result from crawling a single page */
export interface CrawlResult {
  url: string;
  html: string;
  title: string;
  discoveredLinks: string[];
  order: number;
  fetchedAt: Date;
}

/** Extracted and partially cleaned page content */
export interface ParsedPage {
  url: string;
  title: string;
  content: string;
  images: ImageReference[];
  order: number;
}

/** Reference to an image found in the content */
export interface ImageReference {
  originalUrl: string;
  altText: string;
  /** The original <img> HTML for replacement */
  originalHtml: string;
}

/** Fully normalized page ready for chapter building */
export interface NormalizedPage {
  url: string;
  title: string;
  content: string;
  images: ProcessedImage[];
  order: number;
}

/** Downloaded and compressed image */
export interface ProcessedImage {
  id: string;
  originalUrl: string;
  data: Buffer;
  mimeType: string;
  filename: string;
}

/** Final chapter for EPUB generation */
export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  sourceUrl: string;
}

/** Complete book structure */
export interface Book {
  title: string;
  author: string;
  language: string;
  chapters: Chapter[];
  images: ProcessedImage[];
  cover?: ProcessedImage;
  metadata: BookMetadata;
}

export interface BookMetadata {
  publisher?: string;
  description?: string;
  date?: string;
  rights?: string;
  identifier?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export type ErrorCode =
  | 'CRAWL_FAILED'
  | 'CRAWL_TIMEOUT'
  | 'PARSE_FAILED'
  | 'NORMALIZE_FAILED'
  | 'IMAGE_DOWNLOAD_FAILED'
  | 'EPUB_GENERATION_FAILED'
  | 'INVALID_URL'
  | 'INVALID_CONFIG'
  | 'NO_CHAPTERS_FOUND'
  | 'NO_CONTENT_FOUND'
  | 'BROWSER_ERROR';

// ============================================
// SERVICE INTERFACES
// ============================================

export interface ICrawler {
  crawl(baseUrl: string, config: SiteConfig): Promise<CrawlResult[]>;
  close(): Promise<void>;
}

export interface IParser {
  parse(pages: CrawlResult[], config: SelectorConfig): ParsedPage[];
}

export interface INormalizer {
  normalize(
    pages: ParsedPage[],
    baseUrl: string,
    options: ImageOptions
  ): Promise<NormalizedPage[]>;
}

export interface IChapterBuilder {
  build(pages: NormalizedPage[]): Chapter[];
}

export interface IEpubGenerator {
  generate(book: Book, outputPath: string): Promise<string>;
}

// ============================================
// CONVERSION PIPELINE
// ============================================

export interface ConversionOptions {
  url: string;
  output: string;
  title?: string;
  author?: string;
  siteConfig?: Partial<SiteConfig>;
  maxConcurrency?: number;
  timeout?: number;
}

export interface ConversionResult {
  success: boolean;
  outputPath: string;
  chaptersCount: number;
  imagesCount: number;
  totalSize: number;
  duration: number;
}
