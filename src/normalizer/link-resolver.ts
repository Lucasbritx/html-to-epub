/**
 * Link resolver - converts relative URLs to absolute
 */

import * as cheerio from 'cheerio';
import { resolveUrl, isSameSite } from '../utils/url.js';
import { logDebug } from '../core/logger.js';

export interface LinkResolutionOptions {
  /** Base URL for resolving relative links */
  baseUrl: string;
  /** Whether to remove links to external sites */
  removeExternalLinks?: boolean;
  /** Convert external links to plain text */
  convertExternalToText?: boolean;
  /** Remove anchor links (href="#...") */
  removeAnchorLinks?: boolean;
}

const DEFAULT_OPTIONS: LinkResolutionOptions = {
  baseUrl: '',
  removeExternalLinks: false,
  convertExternalToText: true,
  removeAnchorLinks: false,
};

/**
 * Resolve all relative URLs in HTML content
 */
export function resolveLinks(html: string, options: LinkResolutionOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const $ = cheerio.load(html);

  let resolvedCount = 0;
  let removedCount = 0;

  $('a[href]').each(function () {
    const $a = $(this);
    const href = $a.attr('href');

    if (!href) {
      return;
    }

    // Handle anchor links
    if (href.startsWith('#')) {
      if (opts.removeAnchorLinks) {
        // Convert to span to preserve text
        const text = $a.text();
        $a.replaceWith(`<span>${text}</span>`);
        removedCount++;
      }
      return;
    }

    // Skip javascript: and other non-HTTP links
    if (/^(javascript|mailto|tel|data):/i.test(href)) {
      // Convert to span
      const text = $a.text();
      $a.replaceWith(`<span>${text}</span>`);
      removedCount++;
      return;
    }

    // Resolve the URL
    const resolvedUrl = resolveUrl(href, opts.baseUrl);

    if (!resolvedUrl) {
      return;
    }

    // Check if external
    const isExternal = !isSameSite(resolvedUrl, opts.baseUrl);

    if (isExternal) {
      if (opts.removeExternalLinks) {
        $a.remove();
        removedCount++;
        return;
      }

      if (opts.convertExternalToText) {
        const text = $a.text();
        $a.replaceWith(`<span>${text}</span>`);
        removedCount++;
        return;
      }
    }

    // Update the href to absolute URL
    $a.attr('href', resolvedUrl);
    resolvedCount++;
  });

  logDebug(`Resolved ${resolvedCount} links, removed/converted ${removedCount}`);

  return $.html();
}

/**
 * Resolve image source URLs
 */
export function resolveImageUrls(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  $('img[src]').each(function () {
    const $img = $(this);
    const src = $img.attr('src');

    if (!src) {
      return;
    }

    // Skip data URLs
    if (src.startsWith('data:')) {
      return;
    }

    // Resolve the URL
    const resolvedUrl = resolveUrl(src, baseUrl);

    if (resolvedUrl) {
      $img.attr('src', resolvedUrl);
    }
  });

  // Also resolve srcset if present
  $('img[srcset], source[srcset]').each(function () {
    const $el = $(this);
    const srcset = $el.attr('srcset');

    if (!srcset) {
      return;
    }

    // Parse srcset and resolve each URL
    const resolved = srcset
      .split(',')
      .map((entry) => {
        const parts = entry.trim().split(/\s+/);
        const url = parts[0];
        const descriptor = parts.slice(1).join(' ');

        if (url && !url.startsWith('data:')) {
          const resolvedUrl = resolveUrl(url, baseUrl);
          if (resolvedUrl) {
            return descriptor ? `${resolvedUrl} ${descriptor}` : resolvedUrl;
          }
        }

        return entry.trim();
      })
      .join(', ');

    $el.attr('srcset', resolved);
  });

  return $.html();
}

/**
 * Remove all links, converting them to plain text
 */
export function stripLinks(html: string): string {
  const $ = cheerio.load(html);

  $('a').each(function () {
    const $a = $(this);
    const content = $a.html();

    if (content) {
      $a.replaceWith(`<span>${content}</span>`);
    } else {
      $a.remove();
    }
  });

  return $.html();
}
