/**
 * Tests for content extractor
 */

import { describe, it, expect } from 'vitest';
import { extractContent, cleanContent } from '../../../src/parser/content-extractor.js';
import { defaultSelectors } from '../../../src/parser/selectors/default.js';

describe('extractContent', () => {
  it('should extract content from article element', () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <nav>Navigation here</nav>
          <article>
            <h1>Chapter Title</h1>
            <p>This is the main content of the chapter. It contains important information that should be extracted.</p>
          </article>
          <footer>Footer content</footer>
        </body>
      </html>
    `;

    const result = extractContent(html, 'https://example.com/page.html', defaultSelectors);

    expect(result.title).toBe('Chapter Title');
    expect(result.content).toContain('main content of the chapter');
    expect(result.content).not.toContain('Navigation here');
    expect(result.content).not.toContain('Footer content');
  });

  it('should extract content from main element', () => {
    const html = `
      <html>
        <body>
          <header>Header</header>
          <main>
            <h1>Main Content Title</h1>
            <p>This is the content inside the main element. It should be extracted properly.</p>
          </main>
          <aside>Sidebar</aside>
        </body>
      </html>
    `;

    const result = extractContent(html, 'https://example.com/page.html', defaultSelectors);

    expect(result.title).toBe('Main Content Title');
    expect(result.content).toContain('content inside the main element');
    expect(result.content).not.toContain('Header');
    expect(result.content).not.toContain('Sidebar');
  });

  it('should extract images from content', () => {
    const html = `
      <article>
        <h1>Image Test</h1>
        <p>Here is an image:</p>
        <img src="/images/photo.jpg" alt="A test photo" />
        <img src="https://example.com/external.png" alt="External image" />
      </article>
    `;

    const result = extractContent(html, 'https://example.com/page.html', defaultSelectors);

    expect(result.images).toHaveLength(2);
    expect(result.images[0]).toMatchObject({
      originalUrl: '/images/photo.jpg',
      altText: 'A test photo',
    });
    expect(result.images[1]).toMatchObject({
      originalUrl: 'https://example.com/external.png',
      altText: 'External image',
    });
  });

  it('should skip data URLs for images', () => {
    const html = `
      <article>
        <h1>Data URL Test</h1>
        <img src="data:image/png;base64,iVBORw0KGgo=" alt="Embedded" />
        <img src="/real-image.jpg" alt="Real" />
      </article>
    `;

    const result = extractContent(html, 'https://example.com/', defaultSelectors);

    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.originalUrl).toBe('/real-image.jpg');
  });

  it('should extract title from page title if no h1 found', () => {
    const html = `
      <html>
        <head><title>Page Title | My Site</title></head>
        <body>
          <article>
            <p>Content without a heading but enough text to be considered valid content for extraction.</p>
          </article>
        </body>
      </html>
    `;

    const result = extractContent(html, 'https://example.com/', defaultSelectors);

    expect(result.title).toBe('Page Title');
  });

  it('should remove noise elements before extraction', () => {
    const html = `
      <article>
        <h1>Clean Content</h1>
        <p>Main text here.</p>
        <div class="advertisement">Buy our stuff!</div>
        <div class="social-share">Share on Twitter</div>
        <script>console.log('evil');</script>
        <p>More content that should remain.</p>
      </article>
    `;

    const result = extractContent(html, 'https://example.com/', defaultSelectors);

    expect(result.content).toContain('Main text here');
    expect(result.content).toContain('More content');
    expect(result.content).not.toContain('Buy our stuff');
    expect(result.content).not.toContain('Share on Twitter');
    expect(result.content).not.toContain('console.log');
  });
});

describe('cleanContent', () => {
  it('should remove scripts and styles', () => {
    const html = `
      <div>
        <p>Content</p>
        <script>alert('bad');</script>
        <style>.bad { color: red; }</style>
      </div>
    `;

    const cleaned = cleanContent(html);

    expect(cleaned).toContain('Content');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).not.toContain('.bad');
  });

  it('should remove empty links', () => {
    const html = `
      <div>
        <a href="/link">Valid Link</a>
        <a href="/empty"></a>
        <a href="/img-link"><img src="icon.png" alt="icon" /></a>
      </div>
    `;

    const cleaned = cleanContent(html);

    expect(cleaned).toContain('Valid Link');
    expect(cleaned).toContain('img-link'); // Link with image should remain
    // Empty link should be removed
    expect((cleaned.match(/<a /g) || []).length).toBe(2);
  });

  it('should normalize whitespace', () => {
    const html = `
      <div>
        <p>First paragraph</p>



        <p>Second paragraph</p>
      </div>
    `;

    const cleaned = cleanContent(html);

    // Should not have more than 2 consecutive newlines
    expect(cleaned).not.toMatch(/\n\s*\n\s*\n\s*\n/);
  });
});
