/**
 * Tests for epub-writer.ts
 */

import { describe, it, expect } from 'vitest';
import {
  validateOutputPath,
  generateOutputFilename,
} from '../../../src/epub/epub-writer.js';

describe('epub-writer', () => {
  describe('validateOutputPath', () => {
    it('should accept valid .epub path', () => {
      expect(() => validateOutputPath('/path/to/book.epub')).not.toThrow();
    });

    it('should accept relative .epub path', () => {
      expect(() => validateOutputPath('./output/book.epub')).not.toThrow();
    });

    it('should reject empty path', () => {
      expect(() => validateOutputPath('')).toThrow('Output path is required');
    });

    it('should reject non-.epub extension', () => {
      expect(() => validateOutputPath('/path/to/book.pdf')).toThrow(
        'Output path must end with .epub'
      );
    });

    it('should reject path without extension', () => {
      expect(() => validateOutputPath('/path/to/book')).toThrow(
        'Output path must end with .epub'
      );
    });
  });

  describe('generateOutputFilename', () => {
    it('should generate filename from title', () => {
      const filename = generateOutputFilename('My Book Title');
      expect(filename).toBe('my-book-title.epub');
    });

    it('should handle special characters', () => {
      const filename = generateOutputFilename("Book's Title! (2024)");
      expect(filename).toBe('book-s-title-2024.epub');
    });

    it('should handle multiple spaces and hyphens', () => {
      const filename = generateOutputFilename('Book  --  Title');
      expect(filename).toBe('book-title.epub');
    });

    it('should trim leading and trailing hyphens', () => {
      const filename = generateOutputFilename('---Book Title---');
      expect(filename).toBe('book-title.epub');
    });

    it('should limit filename length', () => {
      const longTitle = 'A'.repeat(200);
      const filename = generateOutputFilename(longTitle);
      expect(filename.length).toBeLessThanOrEqual(105); // 100 + ".epub"
    });

    it('should use default for empty title', () => {
      const filename = generateOutputFilename('');
      expect(filename).toBe('book.epub');
    });

    it('should use default for special-characters-only title', () => {
      const filename = generateOutputFilename('!!!@@@###');
      expect(filename).toBe('book.epub');
    });
  });

  // Note: writeEpub() is not tested here as it requires mocking epub-gen-memory
  // and file system operations. Integration tests would cover this.
});
