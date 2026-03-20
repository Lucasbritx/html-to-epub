/**
 * Tests for link extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractNavigationLinks,
  extractAllLinks,
  filterChapterLinks,
} from '../../../src/crawler/link-extractor.js';

describe('extractNavigationLinks', () => {
  it('should extract links from sidebar navigation', () => {
    const html = `
      <html>
        <body>
          <nav class="sidebar-nav">
            <a href="/chapter1.html">Chapter 1: Introduction</a>
            <a href="/chapter2.html">Chapter 2: Getting Started</a>
            <a href="/chapter3.html">Chapter 3: Advanced Topics</a>
          </nav>
          <main>Content here</main>
        </body>
      </html>
    `;

    const links = extractNavigationLinks(html, {
      navigationSelectors: ['.sidebar-nav a'],
      baseUrl: 'https://example.com/',
      sameSiteOnly: true,
    });

    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({
      href: 'https://example.com/chapter1.html',
      text: 'Chapter 1: Introduction',
      order: 0,
    });
  });

  it('should resolve relative URLs', () => {
    const html = `
      <nav>
        <a href="./intro.html">Intro</a>
        <a href="./chapter2.html">Chapter 2</a>
        <a href="/book/advanced.html">Advanced</a>
      </nav>
    `;

    const links = extractNavigationLinks(html, {
      navigationSelectors: ['nav a'],
      baseUrl: 'https://example.com/book/index.html',
      sameSiteOnly: true,
    });

    expect(links).toHaveLength(3);
    expect(links[0]?.href).toBe('https://example.com/book/intro.html');
    expect(links[1]?.href).toBe('https://example.com/book/chapter2.html');
    expect(links[2]?.href).toBe('https://example.com/book/advanced.html');
  });

  it('should skip external links when sameSiteOnly is true', () => {
    const html = `
      <nav>
        <a href="/internal.html">Internal</a>
        <a href="https://other-site.com/page.html">External</a>
      </nav>
    `;

    const links = extractNavigationLinks(html, {
      navigationSelectors: ['nav a'],
      baseUrl: 'https://example.com/',
      sameSiteOnly: true,
    });

    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe('https://example.com/internal.html');
  });

  it('should skip javascript: and mailto: links', () => {
    const html = `
      <nav>
        <a href="javascript:void(0)">JS Link</a>
        <a href="mailto:test@example.com">Email</a>
        <a href="/valid.html">Valid</a>
      </nav>
    `;

    const links = extractNavigationLinks(html, {
      navigationSelectors: ['nav a'],
      baseUrl: 'https://example.com/',
      sameSiteOnly: true,
    });

    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe('https://example.com/valid.html');
  });

  it('should skip links without text', () => {
    const html = `
      <nav>
        <a href="/icon-only.html"><img src="icon.png" /></a>
        <a href="/with-text.html">With Text</a>
      </nav>
    `;

    const links = extractNavigationLinks(html, {
      navigationSelectors: ['nav a'],
      baseUrl: 'https://example.com/',
      sameSiteOnly: true,
    });

    expect(links).toHaveLength(1);
    expect(links[0]?.text).toBe('With Text');
  });

  it('should deduplicate links', () => {
    const html = `
      <nav>
        <a href="/chapter1.html">Chapter 1</a>
        <a href="/chapter1.html">Chapter 1 (duplicate)</a>
        <a href="/chapter1.html#section">Chapter 1 with hash</a>
      </nav>
    `;

    const links = extractNavigationLinks(html, {
      navigationSelectors: ['nav a'],
      baseUrl: 'https://example.com/',
      sameSiteOnly: true,
    });

    // Should have 2: one without hash, one with hash gets normalized to same
    expect(links).toHaveLength(1);
  });

  it('should try multiple selectors in order', () => {
    const html = `
      <div class="main-nav">
        <a href="/nav1.html">Nav 1</a>
      </div>
      <div class="sidebar">
        <a href="/sidebar1.html">Sidebar 1</a>
      </div>
    `;

    // First selector doesn't match
    const links = extractNavigationLinks(html, {
      navigationSelectors: ['.not-exist a', '.sidebar a'],
      baseUrl: 'https://example.com/',
      sameSiteOnly: true,
    });

    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe('https://example.com/sidebar1.html');
  });
});

describe('extractAllLinks', () => {
  it('should extract all links from the page', () => {
    const html = `
      <html>
        <body>
          <header><a href="/home">Home</a></header>
          <main>
            <a href="/page1.html">Page 1</a>
            <a href="/page2.html">Page 2</a>
          </main>
          <footer><a href="/contact">Contact</a></footer>
        </body>
      </html>
    `;

    const links = extractAllLinks(html, 'https://example.com/');

    expect(links).toHaveLength(4);
  });

  it('should skip non-content URLs', () => {
    const html = `
      <a href="/page.html">Page</a>
      <a href="/styles.css">CSS</a>
      <a href="/script.js">JS</a>
      <a href="/image.png">Image</a>
    `;

    const links = extractAllLinks(html, 'https://example.com/');

    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe('https://example.com/page.html');
  });
});

describe('filterChapterLinks', () => {
  it('should filter out common non-chapter links', () => {
    const links = [
      { href: 'https://example.com/chapter1.html', text: 'Chapter 1', order: 0 },
      { href: 'https://example.com/home', text: 'Home', order: 1 },
      { href: 'https://example.com/about', text: 'About', order: 2 },
      { href: 'https://example.com/chapter2.html', text: 'Chapter 2', order: 3 },
      { href: 'https://example.com/contact', text: 'Contact', order: 4 },
      { href: 'https://example.com/twitter', text: 'Twitter', order: 5 },
    ];

    const filtered = filterChapterLinks(links);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((l) => l.text)).toEqual(['Chapter 1', 'Chapter 2']);
  });

  it('should filter out links with very short text', () => {
    const links = [
      { href: 'https://example.com/a', text: 'A', order: 0 },
      { href: 'https://example.com/chapter', text: 'Chapter One', order: 1 },
    ];

    const filtered = filterChapterLinks(links);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.text).toBe('Chapter One');
  });
});
