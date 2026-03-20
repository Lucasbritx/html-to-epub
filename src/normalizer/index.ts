/**
 * Normalizer module - orchestrates HTML normalization
 */

import type {
  ParsedPage,
  NormalizedPage,
  ProcessedImage,
  ImageOptions,
  INormalizer,
} from '../core/types.js';
import { NormalizeError } from '../core/errors.js';
import { logStep, logProgress, logDebug, logSuccess } from '../core/logger.js';
import { DEFAULT_IMAGE_OPTIONS } from '../core/config.js';
import { cleanHtml } from './html-cleaner.js';
import { fixHeadingHierarchy } from './heading-fixer.js';
import { resolveLinks, resolveImageUrls } from './link-resolver.js';
import { processImages, updateImageReferences } from './image-handler.js';

export interface NormalizerOptions {
  /** Image processing options */
  imageOptions?: Partial<ImageOptions>;
  /** Whether to download and embed images */
  processImages?: boolean;
  /** Remove external links */
  removeExternalLinks?: boolean;
}

const DEFAULT_OPTIONS: NormalizerOptions = {
  processImages: false, // Let epub-gen-memory handle image downloading
  removeExternalLinks: false,
};

export class Normalizer implements INormalizer {
  private options: NormalizerOptions;

  constructor(options: NormalizerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Normalize multiple parsed pages
   */
  async normalize(
    pages: ParsedPage[],
    baseUrl: string,
    imageOptions?: ImageOptions
  ): Promise<NormalizedPage[]> {
    const imgOpts = imageOptions || {
      ...DEFAULT_IMAGE_OPTIONS,
      ...this.options.imageOptions,
    };

    logStep('Normalizing pages', `${pages.length} pages`);

    const results: NormalizedPage[] = [];

    // First, collect all images from all pages
    const allImages = pages.flatMap((p) => p.images);
    logDebug(`Found ${allImages.length} total images across all pages`);

    // Process all images at once (deduplication happens inside)
    let processedImages: ProcessedImage[] = [];

    if (this.options.processImages && allImages.length > 0) {
      logStep('Processing images', `${allImages.length} images`);
      try {
        processedImages = await processImages(allImages, baseUrl, imgOpts);
        logSuccess(`Processed ${processedImages.length} unique images`);
      } catch (error) {
        throw new NormalizeError(
          `Image processing failed: ${error instanceof Error ? error.message : error}`,
          { cause: error instanceof Error ? error : undefined }
        );
      }
    }

    // Normalize each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (!page) continue;

      logProgress(i + 1, pages.length, page.title);

      try {
        const normalized = this.normalizePage(page, baseUrl, processedImages);
        results.push(normalized);
      } catch (error) {
        throw new NormalizeError(
          `Failed to normalize page: ${error instanceof Error ? error.message : error}`,
          { url: page.url, cause: error instanceof Error ? error : undefined }
        );
      }
    }

    logDebug(`Normalized ${results.length} pages`);
    return results;
  }

  /**
   * Normalize a single page
   */
  private normalizePage(
    page: ParsedPage,
    baseUrl: string,
    processedImages: ProcessedImage[]
  ): NormalizedPage {
    let content = page.content;

    // 1. Clean HTML for EPUB compatibility
    content = cleanHtml(content);

    // 2. Fix heading hierarchy
    content = fixHeadingHierarchy(content);

    // 3. Resolve relative links
    content = resolveLinks(content, {
      baseUrl: page.url,
      removeExternalLinks: this.options.removeExternalLinks,
      convertExternalToText: true,
    });

    // 4. Resolve image URLs (keep original URLs - epub-gen-memory downloads them)
    content = resolveImageUrls(content, page.url);

    // 5. Do NOT update image references - epub-gen-memory expects original URLs
    // The processed images are stored for reference but we keep the absolute URLs
    // so epub-gen-memory can download them. If we replaced them with relative paths,
    // epub-gen-memory would try to download from non-existent URLs.

    return {
      url: page.url,
      title: page.title,
      content,
      images: processedImages,
      order: page.order,
    };
  }
}

/**
 * Create a new normalizer instance
 */
export function createNormalizer(options?: NormalizerOptions): Normalizer {
  return new Normalizer(options);
}

// Re-export for convenience
export * from './html-cleaner.js';
export * from './heading-fixer.js';
export * from './link-resolver.js';
export * from './image-handler.js';
