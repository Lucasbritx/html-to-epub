/**
 * Tests for chapter factory
 */

import { describe, it, expect } from 'vitest';
import {
  createChapter,
  createChapters,
  generateChapterId,
  sanitizeTitle,
  filterValidChapters,
} from '../../../src/chapter-builder/chapter-factory.js';
import type { NormalizedPage } from '../../../src/core/types.js';

describe('createChapter', () => {
  it('should create a chapter from a normalized page', () => {
    const page: NormalizedPage = {
      url: 'https://example.com/chapter-1.html',
      title: 'Introduction',
      content: '<h1>Introduction</h1><p>Welcome to the book. This is the introduction chapter with enough content.</p>',
      images: [],
      order: 0,
    };

    const chapter = createChapter(page, 0);

    expect(chapter.title).toBe('Introduction');
    expect(chapter.order).toBe(0);
    expect(chapter.sourceUrl).toBe('https://example.com/chapter-1.html');
    expect(chapter.content).toContain('Welcome to the book');
    expect(chapter.content).toContain('<?xml version="1.0"');
    expect(chapter.content).toContain('<html xmlns');
  });

  it('should generate a unique chapter ID', () => {
    const page: NormalizedPage = {
      url: 'https://example.com/getting-started.html',
      title: 'Getting Started',
      content: '<p>Content here with sufficient length for testing purposes.</p>',
      images: [],
      order: 1,
    };

    const chapter = createChapter(page, 1);

    expect(chapter.id).toMatch(/^chapter-/);
    expect(chapter.id).toContain('getting-started');
  });
});

describe('createChapters', () => {
  it('should create multiple chapters', () => {
    const pages: NormalizedPage[] = [
      {
        url: 'https://example.com/ch1.html',
        title: 'Chapter 1',
        content: '<p>First chapter content that is long enough for testing.</p>',
        images: [],
        order: 0,
      },
      {
        url: 'https://example.com/ch2.html',
        title: 'Chapter 2',
        content: '<p>Second chapter content that is long enough for testing.</p>',
        images: [],
        order: 1,
      },
    ];

    const chapters = createChapters(pages);

    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.title).toBe('Chapter 1');
    expect(chapters[1]?.title).toBe('Chapter 2');
  });

  it('should handle duplicate titles', () => {
    const pages: NormalizedPage[] = [
      {
        url: 'https://example.com/intro1.html',
        title: 'Introduction',
        content: '<p>First introduction content.</p>',
        images: [],
        order: 0,
      },
      {
        url: 'https://example.com/intro2.html',
        title: 'Introduction',
        content: '<p>Second introduction content.</p>',
        images: [],
        order: 1,
      },
    ];

    const chapters = createChapters(pages);

    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.title).toBe('Introduction');
    expect(chapters[1]?.title).toBe('Introduction (2)');
  });
});

describe('generateChapterId', () => {
  it('should generate ID from URL path', () => {
    const id = generateChapterId('https://example.com/book/chapter-one.html', 0);
    expect(id).toBe('chapter-chapter-one');
  });

  it('should generate fallback ID for index pages', () => {
    const id = generateChapterId('https://example.com/book/index.html', 0);
    expect(id).toMatch(/^chapter-1-[a-f0-9]+$/);
  });

  it('should handle special characters in URL', () => {
    const id = generateChapterId('https://example.com/Book%20Chapter.html', 0);
    expect(id).toMatch(/^chapter-/);
  });
});

describe('sanitizeTitle', () => {
  it('should remove HTML tags', () => {
    const title = sanitizeTitle('<b>Bold</b> Title');
    expect(title).toBe('Bold Title');
  });

  it('should normalize whitespace', () => {
    const title = sanitizeTitle('Title   with    spaces');
    expect(title).toBe('Title with spaces');
  });

  it('should remove problematic characters', () => {
    // <with> is treated as an HTML tag and removed/replaced with space
    const title = sanitizeTitle('Title <with> "special" \'chars\' & more');
    // After removing the tag <with>, quotes, and &, then normalizing whitespace
    expect(title).toBe('Title special chars more');
  });

  it('should limit length', () => {
    const longTitle = 'A'.repeat(300);
    const title = sanitizeTitle(longTitle);
    expect(title.length).toBeLessThanOrEqual(200);
  });

  it('should return Untitled for empty strings', () => {
    expect(sanitizeTitle('')).toBe('Untitled');
    expect(sanitizeTitle('   ')).toBe('Untitled');
  });
});

describe('filterValidChapters', () => {
  it('should filter out empty chapters', () => {
    const chapters = [
      {
        id: 'ch1',
        title: 'Valid Chapter',
        content: '<p>This is a valid chapter with enough content to pass the filter.</p>',
        order: 0,
        sourceUrl: 'https://example.com/ch1.html',
      },
      {
        id: 'ch2',
        title: 'Empty Chapter',
        content: '<p></p>',
        order: 1,
        sourceUrl: 'https://example.com/ch2.html',
      },
    ];

    const filtered = filterValidChapters(chapters);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe('Valid Chapter');
  });

  it('should keep chapters with sufficient content', () => {
    const chapters = [
      {
        id: 'ch1',
        title: 'Chapter 1',
        content: '<p>This chapter has more than fifty characters of text content.</p>',
        order: 0,
        sourceUrl: 'https://example.com/ch1.html',
      },
    ];

    const filtered = filterValidChapters(chapters);
    expect(filtered).toHaveLength(1);
  });
});
