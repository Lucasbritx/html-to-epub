/**
 * GitHub Pages / Docsify / Jekyll selector configurations
 */

import type { SelectorConfig } from '../../core/types.js';

/**
 * Selectors for Docsify-based documentation
 */
export const docsifySelectors: SelectorConfig = {
  content: [
    '.markdown-body',
    'article.markdown-body',
    '#main',
    'main',
    '.content',
    'section.content',
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
  ],
  exclude: [
    'script',
    'style',
    'noscript',
    '.docsify-copy-code-button',
    '.anchor',
    '.edit-link',
    '.github-corner',
    '.progress',
    '.search',
    '#search',
    '.sidebar',
    '.sidebar-nav',
    'nav',
    'footer',
  ],
  chapterLink: 'a[href$=".md"], a[href$=".html"], a[href^="#/"]',
};

/**
 * Selectors for GitBook-based documentation
 */
export const gitbookSelectors: SelectorConfig = {
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
    'script',
    'style',
    'noscript',
    '.book-header',
    '.book-summary',
    '.navigation',
    '.page-footer',
    '.gitbook-link',
    '.search-wrapper',
    '.search-results',
  ],
  chapterLink: 'a.chapter-link, .chapter a',
};

/**
 * Selectors for Jekyll-based sites
 */
export const jekyllSelectors: SelectorConfig = {
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
    'script',
    'style',
    'noscript',
    '.site-header',
    '.site-footer',
    '.site-nav',
    '.post-meta',
    '.post-nav',
    '.social-media-list',
    '.pagination',
  ],
};

/**
 * Selectors for GitHub README-style pages
 */
export const githubSelectors: SelectorConfig = {
  content: [
    '.markdown-body',
    'article.markdown-body',
    '#readme',
    '.entry-content',
  ],
  title: [
    'h1',
    '.markdown-body h1',
    '#readme h1',
  ],
  navigation: [
    '.toc a',
    '.markdown-body a[href^="#"]',
  ],
  exclude: [
    'script',
    'style',
    'noscript',
    '.anchor',
    '.octicon',
    '.task-list-item-checkbox',
  ],
};
