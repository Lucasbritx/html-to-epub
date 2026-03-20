/**
 * Tests for HTML cleaner
 */

import { describe, it, expect } from 'vitest';
import { cleanHtml } from '../../../src/normalizer/html-cleaner.js';

describe('cleanHtml', () => {
  it('should remove inline styles', () => {
    const html = `
      <div style="color: red; font-size: 12px;">
        <p style="margin: 0;">Content</p>
      </div>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).not.toContain('style=');
    expect(cleaned).toContain('Content');
  });

  it('should remove data-* attributes', () => {
    const html = `
      <div data-id="123" data-tracking="abc">
        <span data-tooltip="info">Text</span>
      </div>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).not.toContain('data-id');
    expect(cleaned).not.toContain('data-tracking');
    expect(cleaned).not.toContain('data-tooltip');
    expect(cleaned).toContain('Text');
  });

  it('should remove event handlers', () => {
    const html = `
      <button onclick="doSomething()" onmouseover="hover()">
        Click me
      </button>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('onmouseover');
    expect(cleaned).toContain('Click me');
  });

  it('should preserve safe attributes', () => {
    const html = `
      <a href="/page" title="Link title" class="link" id="my-link">
        <img src="image.jpg" alt="Description" width="100" height="50" />
      </a>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).toContain('href="/page"');
    expect(cleaned).toContain('title="Link title"');
    expect(cleaned).toContain('class="link"');
    expect(cleaned).toContain('id="my-link"');
    expect(cleaned).toContain('src="image.jpg"');
    expect(cleaned).toContain('alt="Description"');
    expect(cleaned).toContain('width="100"');
    expect(cleaned).toContain('height="50"');
  });

  it('should remove non-safe attributes', () => {
    const html = `
      <div role="button" tabindex="0" draggable="true" contenteditable="true">
        Content
      </div>
    `;

    const cleaned = cleanHtml(html);

    // These are not in the safe list
    expect(cleaned).not.toContain('tabindex');
    expect(cleaned).not.toContain('draggable');
    expect(cleaned).not.toContain('contenteditable');
    expect(cleaned).toContain('Content');
  });

  it('should preserve aria-* attributes', () => {
    const html = `
      <div aria-label="Description" aria-hidden="false">
        Content
      </div>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).toContain('aria-label');
    expect(cleaned).toContain('aria-hidden');
  });

  it('should convert invalid tags to div/span', () => {
    const html = `
      <div>
        <font color="red">Red text</font>
        <center>Centered</center>
        <custom-element>Custom</custom-element>
      </div>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).not.toContain('<font');
    expect(cleaned).not.toContain('<center');
    expect(cleaned).not.toContain('<custom-element');
    // Content should be preserved
    expect(cleaned).toContain('Red text');
    expect(cleaned).toContain('Centered');
    expect(cleaned).toContain('Custom');
  });

  it('should preserve valid EPUB tags', () => {
    const html = `
      <article>
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <table>
          <tr>
            <td>Cell</td>
          </tr>
        </table>
        <blockquote>Quote</blockquote>
        <pre><code>code block</code></pre>
      </article>
    `;

    const cleaned = cleanHtml(html);

    expect(cleaned).toContain('<article>');
    expect(cleaned).toContain('<h1>');
    expect(cleaned).toContain('<p>');
    expect(cleaned).toContain('<strong>');
    expect(cleaned).toContain('<em>');
    expect(cleaned).toContain('<ul>');
    expect(cleaned).toContain('<li>');
    expect(cleaned).toContain('<table>');
    expect(cleaned).toContain('<blockquote>');
    expect(cleaned).toContain('<pre>');
    expect(cleaned).toContain('<code>');
  });

  it('should remove empty class attributes', () => {
    const html = '<div class="">Content</div>';

    const cleaned = cleanHtml(html);

    // Empty class should be removed
    expect(cleaned).not.toContain('class=""');
    expect(cleaned).toContain('Content');
  });
});
