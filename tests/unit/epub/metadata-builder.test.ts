/**
 * Tests for metadata-builder.ts
 */

import { describe, it, expect } from 'vitest';
import {
  buildEpubOptions,
  generateIdentifier,
  sanitizeMetadataField,
  inferMetadata,
  extractTitleFromUrl,
} from '../../../src/epub/metadata-builder.js';
import type { Book } from '../../../src/core/types.js';

describe('metadata-builder', () => {
  describe('buildEpubOptions', () => {
    it('should build options with required fields', () => {
      const book: Book = {
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        chapters: [],
        images: [],
        metadata: {},
      };

      const options = buildEpubOptions(book);

      expect(options.title).toBe('Test Book');
      expect(options.author).toBe('Test Author');
      expect(options.language).toBe('en');
      expect(options.tocTitle).toBe('Table of Contents');
      expect(options.version).toBe(3);
    });

    it('should use defaults for missing title and author', () => {
      const book: Book = {
        title: '',
        author: '',
        language: 'en',
        chapters: [],
        images: [],
        metadata: {},
      };

      const options = buildEpubOptions(book);

      expect(options.title).toBe('Untitled Book');
      expect(options.author).toBe('Unknown Author');
    });

    it('should include optional metadata when provided', () => {
      const book: Book = {
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        chapters: [],
        images: [],
        metadata: {
          publisher: 'Test Publisher',
          description: 'A test book',
          rights: 'CC-BY-4.0',
          identifier: 'urn:uuid:test-123',
        },
      };

      const options = buildEpubOptions(book);

      expect(options.publisher).toBe('Test Publisher');
      expect(options.description).toBe('A test book');
      expect(options.rights).toBe('CC-BY-4.0');
      expect(options.identifier).toBe('urn:uuid:test-123');
    });

    it('should include cover when provided', () => {
      const book: Book = {
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        chapters: [],
        images: [],
        cover: {
          id: 'cover',
          originalUrl: 'http://example.com/cover.jpg',
          data: Buffer.from('fake-image-data'),
          mimeType: 'image/jpeg',
          filename: 'cover.jpg',
        },
        metadata: {},
      };

      const options = buildEpubOptions(book);

      expect(options.cover).toBeDefined();
      // Cover is now a data URL
      expect(options.cover).toContain('data:image/jpeg;base64,');
    });

    it('should generate identifier when not provided', () => {
      const book: Book = {
        title: 'My Book Title',
        author: 'John Doe',
        language: 'en',
        chapters: [],
        images: [],
        metadata: {},
      };

      const options = buildEpubOptions(book);

      expect(options.identifier).toBeDefined();
      expect(options.identifier).toContain('my-book-title-john-doe');
    });
  });

  describe('generateIdentifier', () => {
    it('should generate a stable identifier', () => {
      const id1 = generateIdentifier('Test Book', 'Test Author');
      const id2 = generateIdentifier('Test Book', 'Test Author');

      // IDs should have the same prefix (slug)
      expect(id1.split('-').slice(0, -1).join('-')).toBe(
        id2.split('-').slice(0, -1).join('-')
      );
    });

    it('should sanitize special characters', () => {
      const id = generateIdentifier("Book's Title! (2024)", 'Author & Co.');

      expect(id).toContain('urn:uuid:');
      expect(id).not.toContain("'");
      expect(id).not.toContain('!');
      expect(id).not.toContain('&');
    });

    it('should limit identifier length', () => {
      const longTitle = 'A'.repeat(200);
      const id = generateIdentifier(longTitle, 'Author');

      // Should be limited to reasonable length
      expect(id.length).toBeLessThan(150);
    });
  });

  describe('sanitizeMetadataField', () => {
    it('should return undefined for empty values', () => {
      expect(sanitizeMetadataField('')).toBeUndefined();
      expect(sanitizeMetadataField(undefined)).toBeUndefined();
    });

    it('should remove HTML tags', () => {
      const result = sanitizeMetadataField('<b>Bold</b> and <i>italic</i>');
      expect(result).toBe('Bold and italic');
    });

    it('should normalize whitespace', () => {
      const result = sanitizeMetadataField('Multiple   spaces\nand\nnewlines');
      expect(result).toBe('Multiple spaces and newlines');
    });

    it('should remove control characters', () => {
      const result = sanitizeMetadataField('Text\x00with\x1Fcontrol\x7Fchars');
      expect(result).toBe('Textwithcontrolchars');
    });

    it('should trim whitespace', () => {
      const result = sanitizeMetadataField('  trimmed  ');
      expect(result).toBe('trimmed');
    });
  });

  describe('inferMetadata', () => {
    it('should infer publisher from github.io domain', () => {
      const metadata = inferMetadata('https://user.github.io/repo/docs', []);
      expect(metadata.publisher).toBe('user');
    });

    it('should infer publisher from gitbook.io domain', () => {
      const metadata = inferMetadata('https://mybook.gitbook.io/docs', []);
      expect(metadata.publisher).toBe('GitBook');
    });

    it('should infer publisher from readthedocs domain', () => {
      const metadata = inferMetadata('https://project.readthedocs.io/en/latest/', []);
      expect(metadata.publisher).toBe('Read the Docs');
    });

    it('should use domain as publisher for generic sites', () => {
      const metadata = inferMetadata('https://www.example.com/book/', []);
      expect(metadata.publisher).toBe('example.com');
    });

    it('should generate description from chapter titles', () => {
      const chapters = [
        { title: 'Introduction' },
        { title: 'Chapter 1' },
        { title: 'Chapter 2' },
      ];

      const metadata = inferMetadata('https://example.com', chapters);
      expect(metadata.description).toContain('Introduction');
      expect(metadata.description).toContain('Chapter 1');
    });

    it('should indicate more chapters when there are many', () => {
      const chapters = Array.from({ length: 10 }, (_, i) => ({
        title: `Chapter ${i + 1}`,
      }));

      const metadata = inferMetadata('https://example.com', chapters);
      expect(metadata.description).toContain('and 5 more');
    });
  });

  describe('extractTitleFromUrl', () => {
    it('should extract title from URL path', () => {
      const title = extractTitleFromUrl('https://example.com/my-book/');
      expect(title).toBe('My Book');
    });

    it('should convert kebab-case to title case', () => {
      const title = extractTitleFromUrl('https://example.com/docs/user-guide/');
      expect(title).toBe('User Guide');
    });

    it('should convert snake_case to title case', () => {
      const title = extractTitleFromUrl('https://example.com/docs/api_reference/');
      expect(title).toBe('Api Reference');
    });

    it('should ignore index.html', () => {
      const title = extractTitleFromUrl('https://example.com/book/index.html');
      expect(title).toBe('Book');
    });

    it('should fallback to hostname for root URLs', () => {
      const title = extractTitleFromUrl('https://mybook.com/');
      // Returns lowercase since no path segments have title case applied
      expect(title).toBe('mybook');
    });

    it('should return Untitled for invalid URLs', () => {
      const title = extractTitleFromUrl('not-a-valid-url');
      expect(title).toBe('Untitled');
    });
  });
});
