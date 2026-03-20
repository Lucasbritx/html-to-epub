/**
 * Default selector configurations for common site types
 */

import type { SelectorConfig } from '../../core/types.js';

/**
 * Default selectors that work for most generic sites
 */
export const defaultSelectors: SelectorConfig = {
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
    '.post',
    '.entry',
  ],
  title: [
    'h1',
    'article h1',
    'main h1',
    '.title',
    '.post-title',
    '.entry-title',
    '.page-title',
    'header h1',
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
    '.nav-menu a',
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
    '.advertisement',
    '.ad',
    '.social-share',
    '.share-buttons',
    '.related-posts',
    '.breadcrumb',
    '.pagination',
    '.edit-link',
  ],
};
