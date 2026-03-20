/**
 * Image handler - downloads, compresses, and embeds images
 */

import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { createHash } from 'crypto';
import type { ImageReference, ProcessedImage, ImageOptions } from '../core/types.js';
import { ImageDownloadError } from '../core/errors.js';
import { logDebug, logWarn, logProgress } from '../core/logger.js';
import { resolveUrl } from '../utils/url.js';
import { withTimeout } from '../utils/retry.js';

/**
 * Default image options optimized for Kindle
 */
export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  maxWidth: 1200,
  maxHeight: 1600,
  quality: 70,
  format: 'jpeg',
  downloadTimeout: 10000,
};

/**
 * Process images from parsed pages
 */
export async function processImages(
  images: ImageReference[],
  baseUrl: string,
  options: Partial<ImageOptions> = {}
): Promise<ProcessedImage[]> {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const processed: ProcessedImage[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img) continue;

    // Resolve the image URL
    const absoluteUrl = resolveUrl(img.originalUrl, baseUrl);

    if (!absoluteUrl) {
      logWarn(`Could not resolve image URL: ${img.originalUrl}`);
      continue;
    }

    // Skip duplicates
    if (seen.has(absoluteUrl)) {
      continue;
    }
    seen.add(absoluteUrl);

    logProgress(i + 1, images.length, `Processing image`);

    try {
      const result = await downloadAndProcessImage(absoluteUrl, opts);
      processed.push(result);
    } catch (error) {
      // Fail fast on image download errors
      throw new ImageDownloadError(
        absoluteUrl,
        error instanceof Error ? error : undefined
      );
    }
  }

  logDebug(`Processed ${processed.length} images`);
  return processed;
}

/**
 * Download and process a single image
 */
async function downloadAndProcessImage(
  url: string,
  options: ImageOptions
): Promise<ProcessedImage> {
  // Generate a unique ID for this image
  const id = generateImageId(url);
  const extension = options.format === 'jpeg' ? 'jpg' : options.format;
  const filename = `${id}.${extension}`;

  // Download the image
  const imageBuffer = await downloadImage(url, options.downloadTimeout);

  // Process with sharp
  let processor = sharp(imageBuffer);

  // Get metadata
  const metadata = await processor.metadata();

  // Resize if needed
  if (
    (metadata.width && metadata.width > options.maxWidth) ||
    (metadata.height && metadata.height > options.maxHeight)
  ) {
    processor = processor.resize(options.maxWidth, options.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to target format
  let data: Buffer;
  let mimeType: string;

  switch (options.format) {
    case 'png':
      data = await processor.png({ quality: options.quality }).toBuffer();
      mimeType = 'image/png';
      break;
    case 'webp':
      data = await processor.webp({ quality: options.quality }).toBuffer();
      mimeType = 'image/webp';
      break;
    case 'jpeg':
    default:
      data = await processor
        .jpeg({
          quality: options.quality,
          mozjpeg: true, // Better compression
        })
        .toBuffer();
      mimeType = 'image/jpeg';
      break;
  }

  logDebug(
    `Processed ${url}: ${metadata.width}x${metadata.height} -> ${data.length} bytes`
  );

  return {
    id,
    originalUrl: url,
    data,
    mimeType,
    filename,
  };
}

/**
 * Download an image from a URL
 */
async function downloadImage(url: string, timeout: number): Promise<Buffer> {
  return withTimeout(
    async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
    timeout,
    `Image download timed out: ${url}`
  );
}

/**
 * Generate a unique ID for an image based on its URL
 */
function generateImageId(url: string): string {
  const hash = createHash('md5').update(url).digest('hex').substring(0, 12);
  return `img-${hash}`;
}

/**
 * Update image references in HTML to use processed images
 */
export function updateImageReferences(
  html: string,
  images: ProcessedImage[],
  baseUrl: string
): string {
  const $ = cheerio.load(html);

  // Create a map from original URLs to processed images
  const imageMap = new Map<string, ProcessedImage>();
  for (const img of images) {
    imageMap.set(img.originalUrl, img);
  }

  $('img').each(function () {
    const $img = $(this);
    const src = $img.attr('src');

    if (!src || src.startsWith('data:')) {
      return;
    }

    // Resolve the URL to find in our map
    const absoluteUrl = resolveUrl(src, baseUrl);

    if (absoluteUrl && imageMap.has(absoluteUrl)) {
      const processed = imageMap.get(absoluteUrl)!;
      // Update src to reference the processed image
      $img.attr('src', `images/${processed.filename}`);
      // Remove srcset as we're providing a single optimized image
      $img.removeAttr('srcset');
    }
  });

  return $.html();
}

/**
 * Remove all images from HTML
 */
export function removeImages(html: string): string {
  const $ = cheerio.load(html);
  $('img').remove();
  $('picture').remove();
  $('figure:empty').remove();
  return $.html();
}

/**
 * Extract unique image URLs from HTML
 */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $('img[src]').each(function () {
    const src = $(this).attr('src');
    if (src && !src.startsWith('data:')) {
      const absoluteUrl = resolveUrl(src, baseUrl);
      if (absoluteUrl) {
        urls.add(absoluteUrl);
      }
    }
  });

  return Array.from(urls);
}
