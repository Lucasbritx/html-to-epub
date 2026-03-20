/**
 * Configuration management and default site configurations
 */

import type { SiteConfig, SelectorConfig, CrawlStrategy, ImageOptions } from './types.js';

// ============================================
// DEFAULT IMAGE OPTIONS (Kindle-optimized)
// ============================================

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  maxWidth: 1200,
  maxHeight: 1600,
  quality: 70,
  format: 'jpeg',
  downloadTimeout: 10000,
};

// ============================================
// DEFAULT SELECTORS
// ============================================

export const DEFAULT_SELECTORS: SelectorConfig = {
  content: [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.markdown-body',
    '#content',
    '.page-content',
  ],
  title: [
    'h1',
    'article h1',
    '.title',
    '.post-title',
    '.entry-title',
    'header h1',
    '.page-title',
  ],
  navigation: [
    'nav a',
    '.sidebar a',
    '.sidebar-nav a',
    '.toc a',
    '.table-of-contents a',
    '#sidebar a',
    '.book-summary a',
    '.menu a',
  ],
  exclude: [
    'script',
    'style',
    'noscript',
    'iframe',
    'nav',
    'header',
    'footer',
    '.navigation',
    '.nav',
    '.sidebar',
    '.toc',
    '.table-of-contents',
    '.comments',
    '.comment',
    '.advertisement',
    '.ad',
    '.ads',
    '.social-share',
    '.share-buttons',
    '.related-posts',
    '.breadcrumb',
    '.breadcrumbs',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '.edit-link',
    '.edit-page',
    '.page-nav',
    '.pagination',
  ],
};

// ============================================
// GITHUB PAGES / DOCSIFY CONFIG
// ============================================

export const GITHUB_PAGES_SELECTORS: SelectorConfig = {
  content: [
    '.markdown-body',
    'article.markdown-body',
    '#main',
    'main',
    '.content',
    'section.content',
    'article',
  ],
  title: [
    'h1',
    '.markdown-body h1',
    'article h1',
    '#main h1',
  ],
  navigation: [
    '.sidebar-nav a',
    '.sidebar a',
    'nav.sidebar a',
    '#sidebar a',
    '.book-summary a',
    '.summary a',
    'aside a',
  ],
  exclude: [
    ...DEFAULT_SELECTORS.exclude,
    '.docsify-copy-code-button',
    '.anchor',
    '.edit-link',
    '.gitbook-link',
    '.github-corner',
    '.progress',
    '.search',
    '#search',
  ],
  chapterLink: 'a[href$=".md"], a[href$=".html"], a[href^="#/"]',
};

// ============================================
// JEKYLL / STATIC SITE CONFIG
// ============================================

export const JEKYLL_SELECTORS: SelectorConfig = {
  content: [
    '.post-content',
    '.page-content',
    'article',
    '.content',
    'main',
  ],
  title: [
    '.post-title',
    '.page-title',
    'h1.title',
    'article h1',
    'h1',
  ],
  navigation: [
    '.site-nav a',
    'nav a',
    '.nav-list a',
    '.toc a',
  ],
  exclude: [
    ...DEFAULT_SELECTORS.exclude,
    '.site-header',
    '.site-footer',
    '.post-meta',
    '.post-nav',
  ],
};

// ============================================
// GITBOOK CONFIG
// ============================================

export const GITBOOK_SELECTORS: SelectorConfig = {
  content: [
    '.page-inner section.normal',
    '.page-inner',
    '.book-body .body-inner',
    '.markdown-section',
    'section.markdown-section',
  ],
  title: [
    'h1',
    '.page-inner h1',
    'section h1',
  ],
  navigation: [
    '.book-summary a',
    '.summary a',
    'nav.summary a',
    '.chapter a',
  ],
  exclude: [
    ...DEFAULT_SELECTORS.exclude,
    '.book-header',
    '.book-summary',
    '.navigation',
    '.page-footer',
    '.gitbook-link',
  ],
  chapterLink: 'a.chapter-link, .chapter a',
};

// ============================================
// CRAWL STRATEGIES
// ============================================

export const DEFAULT_CRAWL_STRATEGY: CrawlStrategy = { type: 'auto' };

// ============================================
// SITE DETECTION
// ============================================

export interface SitePattern {
  name: string;
  patterns: RegExp[];
  htmlPatterns: string[];
  config: SiteConfig;
}

export const SITE_PATTERNS: SitePattern[] = [
  {
    name: 'docsify',
    patterns: [/github\.io/i, /docsify/i],
    htmlPatterns: ['window.$docsify', 'docsify.min.js', 'docsify.js', 'data-docsify'],
    config: {
      selectors: GITHUB_PAGES_SELECTORS,
      crawlStrategy: { type: 'sidebar', selector: '.sidebar a, .sidebar-nav a, .chapter a, .chapter-link a, [class*="chapter"] a, nav a' },
      imageOptions: DEFAULT_IMAGE_OPTIONS,
    },
  },
  {
    name: 'gitbook',
    patterns: [/gitbook/i],
    htmlPatterns: ['gitbook.js', 'gitbook.min.js', 'book-summary', 'GitBook'],
    config: {
      selectors: GITBOOK_SELECTORS,
      crawlStrategy: { type: 'sidebar', selector: '.book-summary a, .summary a, .chapter a, [class*="chapter"] a' },
      imageOptions: DEFAULT_IMAGE_OPTIONS,
    },
  },
  {
    name: 'jekyll',
    patterns: [/jekyll/i, /\.github\.io/i],
    htmlPatterns: ['jekyll', 'site.baseurl', '_site'],
    config: {
      selectors: JEKYLL_SELECTORS,
      crawlStrategy: { type: 'auto' },
      imageOptions: DEFAULT_IMAGE_OPTIONS,
    },
  },
  {
    name: 'github-pages',
    patterns: [/github\.io/i, /githubusercontent/i],
    htmlPatterns: [],
    config: {
      selectors: GITHUB_PAGES_SELECTORS,
      crawlStrategy: { type: 'sidebar', selector: '.sidebar a, .sidebar-nav a, .chapter a, .chapter-link a, [class*="chapter"] a, nav a' },
      imageOptions: DEFAULT_IMAGE_OPTIONS,
    },
  },
];

// ============================================
// CONFIG FUNCTIONS
// ============================================

/**
 * Detect site type from URL and HTML content
 */
export function detectSiteType(url: string, html: string): SiteConfig {
  for (const pattern of SITE_PATTERNS) {
    // Check URL patterns
    const urlMatches = pattern.patterns.some((p) => p.test(url));
    
    // Check HTML patterns
    const htmlMatches = pattern.htmlPatterns.some((p) => html.includes(p));

    if (urlMatches || htmlMatches) {
      return pattern.config;
    }
  }

  // Return default config
  return getDefaultConfig();
}

/**
 * Get default site configuration
 */
export function getDefaultConfig(): SiteConfig {
  return {
    selectors: DEFAULT_SELECTORS,
    crawlStrategy: DEFAULT_CRAWL_STRATEGY,
    imageOptions: DEFAULT_IMAGE_OPTIONS,
  };
}

/**
 * Merge partial config with defaults
 */
export function mergeConfig(partial: Partial<SiteConfig>): SiteConfig {
  const defaults = getDefaultConfig();

  return {
    selectors: {
      ...defaults.selectors,
      ...partial.selectors,
    },
    crawlStrategy: partial.crawlStrategy ?? defaults.crawlStrategy,
    imageOptions: {
      ...defaults.imageOptions,
      ...partial.imageOptions,
    },
  };
}

/**
 * Load config from JSON file
 */
export async function loadConfigFromFile(filePath: string): Promise<Partial<SiteConfig>> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as Partial<SiteConfig>;
}
