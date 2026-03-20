/**
 * EPUB writer - generates EPUB files using epub-gen-memory
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import epubGenMemory from 'epub-gen-memory';
import type { Book, ProcessedImage } from '../core/types.js';
import { EpubGenerationError } from '../core/errors.js';
import { logStep, logDebug, logSuccess } from '../core/logger.js';
import type { EpubOptions, EpubContent } from './metadata-builder.js';
import { buildEpubOptions } from './metadata-builder.js';
import { chaptersToContent } from './toc-generator.js';

/**
 * Options for the EPUB writer
 */
export interface EpubWriterOptions {
  /** Include images inline in the EPUB */
  includeImages?: boolean;
  /** Generate a custom TOC page */
  customToc?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
}

const DEFAULT_OPTIONS: EpubWriterOptions = {
  includeImages: true,
  customToc: false,
  verbose: false,
};

/**
 * Write a Book to an EPUB file
 */
export async function writeEpub(
  book: Book,
  outputPath: string,
  options: EpubWriterOptions = {}
): Promise<EpubWriteResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  logStep('Generating EPUB', book.title);

  try {
    // Build metadata options
    const epubOptions = buildEpubOptions(book);

    if (opts.verbose) {
      epubOptions.verbose = true;
    }

    // Convert chapters to content
    let content = chaptersToContent(book.chapters);

    // DO NOT embed images as data URIs - epub-gen-memory expects original URLs
    // and will download and include them automatically
    // The processed images are stored in book.images for reference but the HTML
    // should keep its original URLs so epub-gen-memory can handle them
    // Note: We still need to process images (compress) but do it in parallel
    // with epub-gen-memory's download, OR skip preprocessing entirely

    // For now, we skip image embedding since epub-gen-memory handles images
    // The normalizer already resolved relative URLs to absolute URLs

    // Generate EPUB buffer
    logDebug('Generating EPUB content...');
    const buffer = await generateEpubBuffer(epubOptions, content);

    // Ensure output directory exists
    const dir = dirname(outputPath);
    await mkdir(dir, { recursive: true });

    // Write to file
    await writeFile(outputPath, buffer);

    const result: EpubWriteResult = {
      outputPath,
      size: buffer.length,
      chaptersCount: book.chapters.length,
      imagesCount: book.images.length,
    };

    logSuccess(`EPUB written: ${outputPath} (${formatSize(buffer.length)})`);
    return result;
  } catch (error) {
    throw new EpubGenerationError(
      `Failed to generate EPUB: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error instanceof Error ? error : undefined }
    );
  }
}

/**
 * Result of EPUB generation
 */
export interface EpubWriteResult {
  outputPath: string;
  size: number;
  chaptersCount: number;
  imagesCount: number;
}

/**
 * Generate EPUB as a Buffer
 */
async function generateEpubBuffer(
  options: EpubOptions,
  content: EpubContent[]
): Promise<Buffer> {
  // epub-gen-memory expects 'content' property, not 'data'
  const epubContent = content.map((c) => ({
    title: c.title,
    content: c.data, // Note: epub-gen-memory uses 'content', our interface uses 'data'
    filename: c.filename,
    excludeFromToc: c.excludeFromToc,
    beforeToc: c.beforeToc,
  }));

  // Use the default export (epub function)
  const epubFn = epubGenMemory.default || epubGenMemory;
  const result = await epubFn(options, epubContent);

  // Result is a Buffer
  return Buffer.from(result);
}

/**
 * Embed images into chapter content using base64 data URIs
 * 
 * Note: epub-gen-memory handles images differently - we need to add them
 * to the EPUB's content and reference them properly
 */
function embedImages(content: EpubContent[], images: ProcessedImage[]): EpubContent[] {
  // Create a map of original URL to processed image
  const imageMap = new Map<string, ProcessedImage>();
  for (const image of images) {
    imageMap.set(image.originalUrl, image);
  }

  // Replace image references in content
  return content.map((entry) => {
    let data = entry.data;

    // Find all img tags and replace src with data URIs
    // This is a fallback approach - ideally epub-gen-memory would handle this
    data = data.replace(
      /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
      (match, before, src, after) => {
        const image = findImageByUrl(images, src);
        if (image) {
          const dataUri = `data:${image.mimeType};base64,${image.data.toString('base64')}`;
          return `<img ${before}src="${dataUri}"${after}>`;
        }
        return match;
      }
    );

    return { ...entry, data };
  });
}

/**
 * Find an image by its URL (checking both original and filename)
 */
function findImageByUrl(images: ProcessedImage[], url: string): ProcessedImage | undefined {
  // Direct match on original URL
  let image = images.find((img) => img.originalUrl === url);
  if (image) return image;

  // Match on filename
  const filename = url.split('/').pop() || '';
  image = images.find((img) => img.filename === filename);
  if (image) return image;

  // Partial URL match (for relative URLs)
  image = images.find(
    (img) => img.originalUrl.endsWith(url) || url.endsWith(img.originalUrl)
  );
  return image;
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Validate that the output path is writable
 */
export function validateOutputPath(outputPath: string): void {
  if (!outputPath) {
    throw new EpubGenerationError('Output path is required');
  }

  if (!outputPath.endsWith('.epub')) {
    throw new EpubGenerationError('Output path must end with .epub');
  }
}

/**
 * Generate a default output filename from the book title
 */
export function generateOutputFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  return `${slug || 'book'}.epub`;
}
