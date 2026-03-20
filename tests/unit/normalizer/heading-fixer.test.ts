/**
 * Tests for heading fixer
 */

import { describe, it, expect } from 'vitest';
import {
  fixHeadingHierarchy,
  normalizeChapterHeadings,
  extractChapterTitle,
} from '../../../src/normalizer/heading-fixer.js';

describe('fixHeadingHierarchy', () => {
  it('should fix gaps in heading levels', () => {
    const html = `
      <div>
        <h1>Title</h1>
        <h3>Skipped H2</h3>
        <h5>Skipped more</h5>
      </div>
    `;

    const fixed = fixHeadingHierarchy(html);

    expect(fixed).toContain('<h1>');
    expect(fixed).toContain('<h2>');
    expect(fixed).toContain('<h3>');
    expect(fixed).not.toContain('<h5>');
    // Verify content preserved
    expect(fixed).toContain('Title');
    expect(fixed).toContain('Skipped H2');
    expect(fixed).toContain('Skipped more');
  });

  it('should preserve correct hierarchy', () => {
    const html = `
      <div>
        <h1>Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
      </div>
    `;

    const fixed = fixHeadingHierarchy(html);

    expect(fixed).toContain('<h1>');
    expect(fixed).toContain('<h2>');
    expect(fixed).toContain('<h3>');
  });

  it('should handle starting from h2', () => {
    const html = `
      <div>
        <h2>First Heading</h2>
        <h3>Second</h3>
        <h4>Third</h4>
      </div>
    `;

    const fixed = fixHeadingHierarchy(html);

    // Should normalize to h1, h2, h3
    expect(fixed).toContain('<h1>');
    expect(fixed).toContain('<h2>');
    expect(fixed).toContain('<h3>');
    expect(fixed).not.toContain('<h4>');
  });

  it('should handle empty content', () => {
    const html = '<div><p>No headings here</p></div>';
    const fixed = fixHeadingHierarchy(html);
    expect(fixed).toContain('No headings here');
  });

  it('should preserve heading attributes', () => {
    const html = `
      <div>
        <h2 id="intro" class="title">Introduction</h2>
        <h4>Details</h4>
      </div>
    `;

    const fixed = fixHeadingHierarchy(html);

    expect(fixed).toContain('id="intro"');
    expect(fixed).toContain('class="title"');
  });
});

describe('normalizeChapterHeadings', () => {
  it('should make first heading h1', () => {
    const html = `
      <div>
        <h3>Chapter Title</h3>
        <h4>Section</h4>
      </div>
    `;

    const normalized = normalizeChapterHeadings(html);

    // First heading should be h1
    expect(normalized).toMatch(/<h1[^>]*>Chapter Title/);
    // Second should be h2
    expect(normalized).toContain('<h2>');
    expect(normalized).not.toContain('<h3>');
    expect(normalized).not.toContain('<h4>');
  });

  it('should not change if first heading is already h1', () => {
    const html = `
      <div>
        <h1>Chapter Title</h1>
        <h2>Section</h2>
      </div>
    `;

    const normalized = normalizeChapterHeadings(html);

    expect(normalized).toContain('<h1>');
    expect(normalized).toContain('<h2>');
  });
});

describe('extractChapterTitle', () => {
  it('should extract first heading as title', () => {
    const html = `
      <div>
        <h1>Main Title</h1>
        <h2>Section</h2>
        <p>Content</p>
      </div>
    `;

    const title = extractChapterTitle(html);
    expect(title).toBe('Main Title');
  });

  it('should extract h2 if no h1', () => {
    const html = `
      <div>
        <h2>Section Title</h2>
        <p>Content</p>
      </div>
    `;

    const title = extractChapterTitle(html);
    expect(title).toBe('Section Title');
  });

  it('should return null if no headings', () => {
    const html = '<div><p>Just a paragraph</p></div>';
    const title = extractChapterTitle(html);
    expect(title).toBeNull();
  });

  it('should trim whitespace from title', () => {
    const html = '<h1>  Spaced Title   </h1>';
    const title = extractChapterTitle(html);
    expect(title).toBe('Spaced Title');
  });
});
