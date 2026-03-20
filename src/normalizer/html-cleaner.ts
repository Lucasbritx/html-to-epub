/**
 * HTML cleaner - sanitizes HTML for EPUB compatibility
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { logDebug } from '../core/logger.js';

/**
 * HTML attributes that are safe to keep in EPUB
 */
const SAFE_ATTRIBUTES = new Set([
  'href',
  'src',
  'alt',
  'title',
  'id',
  'class',
  'width',
  'height',
  'colspan',
  'rowspan',
  'scope',
  'headers',
  'lang',
  'dir',
]);

/**
 * HTML tags that are valid in EPUB 3
 */
const VALID_EPUB_TAGS = new Set([
  // Document structure
  'html',
  'head',
  'body',
  'section',
  'article',
  'aside',
  'nav',
  'header',
  'footer',
  'main',
  'div',
  'span',

  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',

  // Text content
  'p',
  'blockquote',
  'pre',
  'code',
  'em',
  'strong',
  'i',
  'b',
  'u',
  's',
  'sub',
  'sup',
  'small',
  'mark',
  'del',
  'ins',
  'abbr',
  'cite',
  'q',
  'dfn',
  'kbd',
  'samp',
  'var',
  'br',
  'hr',

  // Lists
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',

  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',

  // Media
  'img',
  'figure',
  'figcaption',
  'picture',
  'source',
  'audio',
  'video',

  // Links
  'a',

  // Ruby (for East Asian text)
  'ruby',
  'rt',
  'rp',

  // Other
  'details',
  'summary',
  'time',
  'address',
  'wbr',
]);

/**
 * Clean HTML for EPUB compatibility
 */
export function cleanHtml(html: string): string {
  const $ = cheerio.load(html, {
    xml: false,
  });

  // Remove all inline styles
  removeInlineStyles($);

  // Remove data-* attributes
  removeDataAttributes($);

  // Remove event handlers
  removeEventHandlers($);

  // Remove invalid attributes
  removeInvalidAttributes($);

  // Convert invalid tags to div/span
  convertInvalidTags($);

  // Remove empty class attributes
  cleanClassAttributes($);

  // Ensure proper entity encoding
  // (cheerio handles this automatically)

  return $.html();
}

/**
 * Remove all inline style attributes
 */
function removeInlineStyles($: CheerioAPI): void {
  $('[style]').removeAttr('style');
}

/**
 * Remove data-* attributes
 */
function removeDataAttributes($: CheerioAPI): void {
  $('*').each(function () {
    const el = this;
    if (el.type === 'tag' && el.attribs) {
      for (const attr of Object.keys(el.attribs)) {
        if (attr.startsWith('data-')) {
          $(el).removeAttr(attr);
        }
      }
    }
  });
}

/**
 * Remove event handler attributes (onclick, etc.)
 */
function removeEventHandlers($: CheerioAPI): void {
  $('*').each(function () {
    const el = this;
    if (el.type === 'tag' && el.attribs) {
      for (const attr of Object.keys(el.attribs)) {
        if (attr.startsWith('on')) {
          $(el).removeAttr(attr);
        }
      }
    }
  });
}

/**
 * Remove attributes that are not in the safe list
 */
function removeInvalidAttributes($: CheerioAPI): void {
  $('*').each(function () {
    const el = this;
    if (el.type === 'tag' && el.attribs) {
      for (const attr of Object.keys(el.attribs)) {
        if (!SAFE_ATTRIBUTES.has(attr) && !attr.startsWith('aria-')) {
          $(el).removeAttr(attr);
        }
      }
    }
  });
}

/**
 * Convert invalid tags to div/span
 */
function convertInvalidTags($: CheerioAPI): void {
  $('*').each(function () {
    const el = this;
    if (el.type === 'tag') {
      const tagName = el.tagName.toLowerCase();
      if (!VALID_EPUB_TAGS.has(tagName)) {
        // Decide whether to convert to div or span based on display type
        const inlineTags = ['font', 'tt', 'blink', 'marquee', 'center'];
        const newTag = inlineTags.includes(tagName) ? 'span' : 'div';

        const $el = $(el);
        const content = $el.html();
        const attrs = el.attribs;

        if (content !== null) {
          const $new = $(`<${newTag}>`);
          $new.html(content);

          // Copy safe attributes
          for (const [key, value] of Object.entries(attrs)) {
            if (SAFE_ATTRIBUTES.has(key)) {
              $new.attr(key, value);
            }
          }

          $el.replaceWith($new);
        }
      }
    }
  });
}

/**
 * Clean up empty or redundant class attributes
 */
function cleanClassAttributes($: CheerioAPI): void {
  $('[class]').each(function () {
    const $el = $(this);
    const classes = $el.attr('class');

    if (!classes || classes.trim() === '') {
      $el.removeAttr('class');
    }
  });
}

/**
 * Minify HTML by removing unnecessary whitespace
 */
export function minifyHtml(html: string): string {
  return html
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Prettify HTML with basic indentation
 */
export function prettifyHtml(html: string): string {
  const $ = cheerio.load(html);
  return $.html();
}
