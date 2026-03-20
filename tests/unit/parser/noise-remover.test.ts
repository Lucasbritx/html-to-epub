/**
 * Tests for noise remover
 */

import { describe, it, expect } from 'vitest';
import { removeNoise, DEFAULT_EXCLUDE_SELECTORS } from '../../../src/parser/noise-remover.js';

describe('removeNoise', () => {
  it('should remove script and style tags', () => {
    const html = `
      <html>
        <head>
          <script>console.log('test');</script>
          <style>.test { color: red; }</style>
        </head>
        <body>
          <p>Content</p>
          <script>alert('inline');</script>
        </body>
      </html>
    `;

    const cleaned = removeNoise(html);

    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('<style');
    expect(cleaned).toContain('Content');
  });

  it('should remove navigation elements', () => {
    const html = `
      <body>
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
        <main>
          <p>Main content here</p>
        </main>
        <footer>
          <p>Copyright 2024</p>
        </footer>
      </body>
    `;

    const cleaned = removeNoise(html);

    expect(cleaned).not.toContain('<nav');
    expect(cleaned).not.toContain('Home');
    expect(cleaned).not.toContain('<footer');
    expect(cleaned).not.toContain('Copyright');
    expect(cleaned).toContain('Main content here');
  });

  it('should remove social share elements', () => {
    const html = `
      <article>
        <p>Article content</p>
        <div class="social-share">
          <a href="https://twitter.com/share">Tweet</a>
          <a href="https://facebook.com/share">Share</a>
        </div>
        <div class="share-buttons">
          <button>Share</button>
        </div>
      </article>
    `;

    const cleaned = removeNoise(html);

    expect(cleaned).toContain('Article content');
    expect(cleaned).not.toContain('social-share');
    expect(cleaned).not.toContain('share-buttons');
    expect(cleaned).not.toContain('Tweet');
  });

  it('should remove advertisement elements', () => {
    const html = `
      <body>
        <div class="ad">Buy our product!</div>
        <div class="advertisement">Special offer</div>
        <p>Real content</p>
        <aside class="ads">More ads here</aside>
      </body>
    `;

    const cleaned = removeNoise(html);

    expect(cleaned).not.toContain('Buy our product');
    expect(cleaned).not.toContain('Special offer');
    expect(cleaned).not.toContain('More ads here');
    expect(cleaned).toContain('Real content');
  });

  it('should remove comments and related elements', () => {
    const html = `
      <body>
        <article>
          <p>Main article</p>
        </article>
        <div class="comments">
          <p>User comment 1</p>
          <p>User comment 2</p>
        </div>
        <div id="disqus_thread"></div>
      </body>
    `;

    const cleaned = removeNoise(html);

    expect(cleaned).toContain('Main article');
    expect(cleaned).not.toContain('User comment');
    expect(cleaned).not.toContain('disqus_thread');
  });

  it('should accept custom exclude selectors', () => {
    const html = `
      <body>
        <div class="my-custom-element">Remove this</div>
        <div class="keep-this">Keep this</div>
        <p>Normal content</p>
      </body>
    `;

    const cleaned = removeNoise(html, {
      excludeSelectors: ['.my-custom-element'],
      mergeWithDefaults: true,
    });

    expect(cleaned).not.toContain('Remove this');
    expect(cleaned).toContain('Keep this');
    expect(cleaned).toContain('Normal content');
  });

  it('should remove empty elements when enabled', () => {
    const html = `
      <body>
        <p>Real content</p>
        <p></p>
        <div>   </div>
        <span></span>
        <p>More content</p>
      </body>
    `;

    const cleaned = removeNoise(html, {
      removeEmptyElements: true,
    });

    expect(cleaned).toContain('Real content');
    expect(cleaned).toContain('More content');
    // Count p tags - should only have 2 (the ones with content)
    const pMatches = cleaned.match(/<p[^>]*>/g) || [];
    expect(pMatches.length).toBe(2);
  });

  it('should preserve elements with images even if no text', () => {
    const html = `
      <body>
        <p><img src="image.jpg" alt="test" /></p>
        <div></div>
        <p>Text content</p>
      </body>
    `;

    const cleaned = removeNoise(html, {
      removeEmptyElements: true,
    });

    expect(cleaned).toContain('<img');
    expect(cleaned).toContain('Text content');
  });

  it('should remove HTML comments when enabled', () => {
    const html = `
      <body>
        <!-- This is a comment -->
        <p>Content</p>
        <!-- Another comment -->
      </body>
    `;

    const cleaned = removeNoise(html, {
      removeComments: true,
    });

    expect(cleaned).not.toContain('This is a comment');
    expect(cleaned).not.toContain('Another comment');
    expect(cleaned).toContain('Content');
  });

  it('should have sensible default exclude selectors', () => {
    // Check that default selectors include common noise elements
    expect(DEFAULT_EXCLUDE_SELECTORS).toContain('script');
    expect(DEFAULT_EXCLUDE_SELECTORS).toContain('style');
    expect(DEFAULT_EXCLUDE_SELECTORS).toContain('nav');
    expect(DEFAULT_EXCLUDE_SELECTORS).toContain('footer');
    expect(DEFAULT_EXCLUDE_SELECTORS).toContain('.sidebar');
    expect(DEFAULT_EXCLUDE_SELECTORS).toContain('.advertisement');
  });
});
