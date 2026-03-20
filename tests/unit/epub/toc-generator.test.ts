/**
 * Tests for toc-generator.ts
 */

import { describe, it, expect } from 'vitest';
import {
  chaptersToContent,
  buildFlatToc,
  buildHierarchicalToc,
  inferTocLevel,
  generateTocHtml,
  flattenToc,
  createTocContent,
} from '../../../src/epub/toc-generator.js';
import type { Chapter } from '../../../src/core/types.js';

describe('toc-generator', () => {
  const createChapter = (
    id: string,
    title: string,
    order: number
  ): Chapter => ({
    id,
    title,
    content: `<p>Content for ${title}</p>`,
    order,
    sourceUrl: `https://example.com/${id}`,
  });

  describe('chaptersToContent', () => {
    it('should convert chapters to EPUB content format', () => {
      const chapters: Chapter[] = [
        createChapter('ch-1', 'Introduction', 0),
        createChapter('ch-2', 'Chapter 1', 1),
      ];

      const content = chaptersToContent(chapters);

      expect(content).toHaveLength(2);
      expect(content[0]!.title).toBe('Introduction');
      expect(content[0]!.filename).toBe('ch-1.xhtml');
      expect(content[0]!.excludeFromToc).toBe(false);
      expect(content[1]!.title).toBe('Chapter 1');
    });

    it('should preserve chapter content', () => {
      const chapters: Chapter[] = [createChapter('ch-1', 'Test', 0)];
      const content = chaptersToContent(chapters);

      expect(content[0]!.data).toContain('Content for Test');
    });

    it('should handle empty chapters array', () => {
      const content = chaptersToContent([]);
      expect(content).toHaveLength(0);
    });
  });

  describe('buildFlatToc', () => {
    it('should create flat TOC entries from chapters', () => {
      const chapters: Chapter[] = [
        createChapter('ch-1', 'Intro', 0),
        createChapter('ch-2', 'Main', 1),
        createChapter('ch-3', 'Conclusion', 2),
      ];

      const toc = buildFlatToc(chapters);

      expect(toc).toHaveLength(3);
      expect(toc[0]!.id).toBe('ch-1');
      expect(toc[0]!.title).toBe('Intro');
      expect(toc[0]!.level).toBe(0);
      expect(toc[0]!.children).toEqual([]);
    });

    it('should preserve order from chapters', () => {
      const chapters: Chapter[] = [
        createChapter('ch-2', 'Second', 1),
        createChapter('ch-1', 'First', 0),
      ];

      const toc = buildFlatToc(chapters);

      expect(toc[0]!.order).toBe(1);
      expect(toc[1]!.order).toBe(0);
    });
  });

  describe('inferTocLevel', () => {
    it('should detect numbered sections', () => {
      // Level is determined by counting dots in the numbered prefix
      // "1." has 1 dot = level 1, "1.1" has 1 dot = level 1, "1.2.3" has 2 dots = level 2
      expect(inferTocLevel('1. Introduction')).toBe(1);
      expect(inferTocLevel('1.1 Overview')).toBe(1);
      expect(inferTocLevel('1.2.3 Details')).toBe(2);
    });

    it('should detect Part markers as level 0', () => {
      expect(inferTocLevel('Part I')).toBe(0);
      expect(inferTocLevel('Part 2')).toBe(0);
      expect(inferTocLevel('Part IV: Advanced Topics')).toBe(0);
    });

    it('should detect Chapter markers as level 0', () => {
      expect(inferTocLevel('Chapter 1')).toBe(0);
      expect(inferTocLevel('Chapter 10: Getting Started')).toBe(0);
      expect(inferTocLevel('CHAPTER IV')).toBe(0);
    });

    it('should detect Section markers as level 1', () => {
      expect(inferTocLevel('Section 1.1')).toBe(1);
      expect(inferTocLevel('Section 2.3.4')).toBe(1);
    });

    it('should detect Appendix markers as level 0', () => {
      expect(inferTocLevel('Appendix A')).toBe(0);
      expect(inferTocLevel('Appendix B: References')).toBe(0);
    });

    it('should default to level 0 for plain titles', () => {
      expect(inferTocLevel('Some Random Title')).toBe(0);
      expect(inferTocLevel('Another Chapter')).toBe(0);
    });

    it('should detect introduction and conclusion as top-level', () => {
      expect(inferTocLevel('Introduction')).toBe(0);
      expect(inferTocLevel('Conclusion')).toBe(0);
      expect(inferTocLevel('Overview')).toBe(0);
      expect(inferTocLevel('Summary')).toBe(0);
    });
  });

  describe('buildHierarchicalToc', () => {
    it('should build nested structure from numbered sections', () => {
      // Use sections with different dot counts to test hierarchy
      // Level 0 = plain text, Level 1 = one dot (1.1), Level 2 = two dots (1.1.1)
      const chapters: Chapter[] = [
        createChapter('ch-1', 'Introduction', 0),
        createChapter('ch-1-1', '1.1 Overview', 1),
        createChapter('ch-1-2', '1.2 Background', 2),
        createChapter('ch-2', 'Conclusion', 3),
      ];

      const toc = buildHierarchicalToc(chapters);

      expect(toc).toHaveLength(2); // Two top-level items (Introduction and Conclusion)
      expect(toc[0]!.title).toBe('Introduction');
      expect(toc[0]!.children).toHaveLength(2);
      expect(toc[0]!.children[0]!.title).toBe('1.1 Overview');
      expect(toc[1]!.title).toBe('Conclusion');
    });

    it('should handle flat structure', () => {
      const chapters: Chapter[] = [
        createChapter('ch-1', 'Introduction', 0),
        createChapter('ch-2', 'Body', 1),
        createChapter('ch-3', 'Conclusion', 2),
      ];

      const toc = buildHierarchicalToc(chapters);

      expect(toc).toHaveLength(3);
      expect(toc[0]!.children).toHaveLength(0);
    });

    it('should handle empty chapters', () => {
      const toc = buildHierarchicalToc([]);
      expect(toc).toHaveLength(0);
    });
  });

  describe('generateTocHtml', () => {
    it('should generate valid XHTML structure', () => {
      const toc = [
        { id: 'ch-1', title: 'Chapter 1', order: 0, level: 0, children: [] },
      ];

      const html = generateTocHtml(toc);

      expect(html).toContain('<?xml version="1.0"');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('xmlns="http://www.w3.org/1999/xhtml"');
      expect(html).toContain('epub:type="toc"');
    });

    it('should include links to chapters', () => {
      const toc = [
        { id: 'ch-intro', title: 'Introduction', order: 0, level: 0, children: [] },
      ];

      const html = generateTocHtml(toc);

      expect(html).toContain('href="ch-intro.xhtml"');
      expect(html).toContain('Introduction');
    });

    it('should use custom title', () => {
      const toc = [
        { id: 'ch-1', title: 'Test', order: 0, level: 0, children: [] },
      ];

      const html = generateTocHtml(toc, 'Contents');

      expect(html).toContain('<h1>Contents</h1>');
    });

    it('should escape HTML in titles', () => {
      const toc = [
        { id: 'ch-1', title: '<script>alert("xss")</script>', order: 0, level: 0, children: [] },
      ];

      const html = generateTocHtml(toc);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should render nested children', () => {
      const toc = [
        {
          id: 'ch-1',
          title: 'Chapter 1',
          order: 0,
          level: 0,
          children: [
            { id: 'ch-1-1', title: 'Section 1.1', order: 1, level: 1, children: [] },
          ],
        },
      ];

      const html = generateTocHtml(toc);

      expect(html).toContain('Chapter 1');
      expect(html).toContain('Section 1.1');
      expect(html).toMatch(/<ol>[\s\S]*<ol>/); // Nested ol
    });
  });

  describe('createTocContent', () => {
    it('should create TOC content entry', () => {
      const chapters: Chapter[] = [
        createChapter('ch-1', 'Introduction', 0),
      ];

      const content = createTocContent(chapters);

      expect(content).not.toBeNull();
      expect(content!.title).toBe('Table of Contents');
      expect(content!.filename).toBe('toc.xhtml');
      expect(content!.excludeFromToc).toBe(true);
      expect(content!.beforeToc).toBe(true);
    });

    it('should return null for empty chapters', () => {
      const content = createTocContent([]);
      expect(content).toBeNull();
    });
  });

  describe('flattenToc', () => {
    it('should flatten nested TOC to flat list', () => {
      const toc = [
        {
          id: 'ch-1',
          title: 'Chapter 1',
          order: 0,
          level: 0,
          children: [
            { id: 'ch-1-1', title: 'Section 1.1', order: 1, level: 1, children: [] },
            { id: 'ch-1-2', title: 'Section 1.2', order: 2, level: 1, children: [] },
          ],
        },
        { id: 'ch-2', title: 'Chapter 2', order: 3, level: 0, children: [] },
      ];

      const flat = flattenToc(toc);

      expect(flat).toHaveLength(4);
      expect(flat.map((e) => e.id)).toEqual(['ch-1', 'ch-1-1', 'ch-1-2', 'ch-2']);
      expect(flat.every((e) => e.children.length === 0)).toBe(true);
    });

    it('should handle already flat TOC', () => {
      const toc = [
        { id: 'ch-1', title: 'Chapter 1', order: 0, level: 0, children: [] },
        { id: 'ch-2', title: 'Chapter 2', order: 1, level: 0, children: [] },
      ];

      const flat = flattenToc(toc);

      expect(flat).toHaveLength(2);
    });

    it('should handle empty TOC', () => {
      const flat = flattenToc([]);
      expect(flat).toHaveLength(0);
    });
  });
});
