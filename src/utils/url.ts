/**
 * URL manipulation utilities
 */

import { InvalidUrlError } from '../core/errors.js';

/**
 * Validate and parse a URL
 */
export function parseUrl(urlString: string): URL {
  try {
    return new URL(urlString);
  } catch {
    throw new InvalidUrlError(urlString);
  }
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a potentially relative URL against a base URL
 */
export function resolveUrl(href: string, baseUrl: string): string {
  // Handle empty or invalid href
  if (!href || href.trim() === '') {
    return baseUrl;
  }

  // Remove leading/trailing whitespace
  href = href.trim();

  // Skip javascript:, mailto:, tel:, etc.
  if (/^(javascript|mailto|tel|data|#):/i.test(href)) {
    return '';
  }

  // Skip pure anchors
  if (href.startsWith('#')) {
    return '';
  }

  try {
    // URL constructor handles both absolute and relative URLs
    const resolved = new URL(href, baseUrl);
    return resolved.href;
  } catch {
    return '';
  }
}

/**
 * Check if two URLs have the same origin
 */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    return parsed1.origin === parsed2.origin;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is within the same site (same origin + similar path prefix)
 */
export function isSameSite(url: string, baseUrl: string): boolean {
  if (!isSameOrigin(url, baseUrl)) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const parsedBase = new URL(baseUrl);

    // Get the base path (directory part)
    const basePath = parsedBase.pathname.split('/').slice(0, -1).join('/');
    
    // Check if URL path starts with base path
    // This allows /book/chapter1 to match /book/ but not /other-book/
    if (basePath && basePath !== '/') {
      return parsedUrl.pathname.startsWith(basePath);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a URL by removing trailing slashes, fragments, and sorting query params
 */
export function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    
    // Remove fragment
    url.hash = '';
    
    // Remove trailing slash from pathname (except for root)
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Sort query parameters for consistency
    url.searchParams.sort();

    return url.href;
  } catch {
    return urlString;
  }
}

/**
 * Extract the path segment that could be used as an ID
 * e.g., "https://example.com/book/chapter-1.html" -> "chapter-1"
 */
export function extractPathId(urlString: string): string {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname;

    // Get last segment of path
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'index';

    // Remove file extension
    const withoutExt = lastSegment.replace(/\.(html?|md|php|asp)$/i, '');

    // Convert to kebab-case and remove special chars
    return withoutExt
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  } catch {
    return 'page';
  }
}

/**
 * Get the base URL (origin + base path) from a full URL
 */
export function getBaseUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Keep origin and path up to the last slash
    const pathParts = url.pathname.split('/');
    pathParts.pop(); // Remove last segment (file)
    url.pathname = pathParts.join('/') + '/';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return urlString;
  }
}

/**
 * Check if a URL points to an image
 */
export function isImageUrl(urlString: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  try {
    const url = new URL(urlString);
    return imageExtensions.test(url.pathname);
  } catch {
    return imageExtensions.test(urlString);
  }
}

/**
 * Check if a URL should be crawled (is likely a content page)
 */
export function isContentUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname.toLowerCase();

    // Skip static assets
    const skipExtensions = /\.(css|js|json|xml|rss|atom|txt|pdf|zip|tar|gz|mp3|mp4|wav|avi|jpg|jpeg|png|gif|webp|svg|bmp|ico|woff|woff2|ttf|eot)$/i;
    if (skipExtensions.test(pathname)) {
      return false;
    }

    // Skip common non-content paths
    const skipPaths = [
      '/api/',
      '/admin/',
      '/wp-admin/',
      '/wp-includes/',
      '/assets/',
      '/static/',
      '/fonts/',
      '/images/',
      '/img/',
      '/css/',
      '/js/',
    ];
    if (skipPaths.some((p) => pathname.includes(p))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
