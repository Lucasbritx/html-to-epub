/**
 * Noise remover - strips unwanted elements from HTML
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element as CheerioElement, AnyNode } from 'domhandler';
import { logDebug } from '../core/logger.js';

/**
 * Default selectors for elements to remove
 */
export const DEFAULT_EXCLUDE_SELECTORS = [
  // Scripts and styles
  'script',
  'style',
  'noscript',
  'link[rel="stylesheet"]',

  // Iframes and embeds
  'iframe',
  'embed',
  'object',

  // Navigation
  'nav',
  'header',
  'footer',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',

  // Common noise classes
  '.navigation',
  '.nav',
  '.navbar',
  '.sidebar',
  '.toc',
  '.table-of-contents',
  '.menu',

  // Comments and social
  '.comments',
  '.comment',
  '.disqus',
  '#disqus_thread',

  // Ads and promotions
  '.advertisement',
  '.ad',
  '.ads',
  '.adsbygoogle',
  '[class*="sponsor"]',

  // Social sharing
  '.social-share',
  '.share-buttons',
  '.social',
  '.share',

  // Related content
  '.related-posts',
  '.related',
  '.recommended',
  '.suggestions',

  // Breadcrumbs
  '.breadcrumb',
  '.breadcrumbs',

  // Edit/action links
  '.edit-link',
  '.edit-page',
  '.edit-on-github',
  '.github-corner',

  // Pagination (within content)
  '.page-nav',
  '.pagination',
  '.pager',
  '.prev-next',

  // Cookie/GDPR notices
  '.cookie-notice',
  '.gdpr',
  '[class*="cookie"]',
  '[class*="consent"]',

  // Search
  '.search',
  '.search-box',
  '#search',

  // Progress indicators
  '.progress',
  '.reading-progress',

  // Docsify specific
  '.docsify-copy-code-button',
  '.anchor',

  // GitBook specific
  '.gitbook-link',
  '.book-header',
  '.book-summary',
  '.page-footer',

  // Hidden elements
  '[hidden]',
  '[aria-hidden="true"]',
  '.hidden',
  '.invisible',
  '.sr-only',
];

export interface NoiseRemovalOptions {
  /** Custom selectors to exclude */
  excludeSelectors?: string[];
  /** Whether to merge with defaults or replace */
  mergeWithDefaults?: boolean;
  /** Remove empty paragraphs and divs */
  removeEmptyElements?: boolean;
  /** Remove HTML comments */
  removeComments?: boolean;
}

const DEFAULT_OPTIONS: NoiseRemovalOptions = {
  mergeWithDefaults: true,
  removeEmptyElements: true,
  removeComments: true,
};

/**
 * Remove noise elements from HTML
 */
export function removeNoise(
  html: string,
  options: NoiseRemovalOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const $ = cheerio.load(html);

  // Determine which selectors to use
  let selectors: string[];
  if (opts.mergeWithDefaults) {
    selectors = [...DEFAULT_EXCLUDE_SELECTORS, ...(opts.excludeSelectors || [])];
  } else {
    selectors = opts.excludeSelectors || DEFAULT_EXCLUDE_SELECTORS;
  }

  // Remove elements matching exclude selectors
  let removedCount = 0;
  for (const selector of selectors) {
    try {
      const elements = $(selector);
      removedCount += elements.length;
      elements.remove();
    } catch {
      // Invalid selector, skip
    }
  }

  logDebug(`Removed ${removedCount} noise elements`);

  // Remove HTML comments
  if (opts.removeComments) {
    removeHtmlComments($);
  }

  // Remove empty elements
  if (opts.removeEmptyElements) {
    removeEmptyElements($);
  }

  return $.html();
}

/**
 * Remove HTML comments from the document
 */
function removeHtmlComments($: CheerioAPI): void {
  $('*')
    .contents()
    .filter(function () {
      return this.type === 'comment';
    })
    .remove();
}

/**
 * Remove empty paragraphs, divs, and spans
 */
function removeEmptyElements($: CheerioAPI): void {
  const emptySelectors = ['p', 'div', 'span', 'section', 'article'];

  let removed = true;
  let iterations = 0;
  const maxIterations = 10;

  // Keep removing until no more empty elements (nested empties)
  while (removed && iterations < maxIterations) {
    removed = false;
    iterations++;

    for (const tag of emptySelectors) {
      $(tag).each(function () {
        const $el = $(this);
        const text = $el.text().trim();
        const hasChildren = $el.children().length > 0;
        const hasImages = $el.find('img').length > 0;

        if (!text && !hasChildren && !hasImages) {
          $el.remove();
          removed = true;
        }
      });
    }
  }
}

/**
 * Remove inline event handlers (onclick, onmouseover, etc.)
 */
export function removeEventHandlers($: CheerioAPI): void {
  const eventAttributes = [
    'onclick',
    'ondblclick',
    'onmousedown',
    'onmouseup',
    'onmouseover',
    'onmousemove',
    'onmouseout',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'onreset',
    'onload',
    'onunload',
    'onerror',
  ];

  $('*').each(function () {
    const $el = $(this);
    for (const attr of eventAttributes) {
      $el.removeAttr(attr);
    }
  });
}

/**
 * Remove data-* attributes
 */
export function removeDataAttributes($: CheerioAPI): void {
  $('*').each(function (this: AnyNode) {
    const el = this as CheerioElement;
    const $el = $(this);
    const attrs = el.attribs || {};
    
    for (const attr of Object.keys(attrs)) {
      if (attr.startsWith('data-')) {
        $el.removeAttr(attr);
      }
    }
  });
}
