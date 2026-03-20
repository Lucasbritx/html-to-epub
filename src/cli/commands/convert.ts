/**
 * Convert command - main CLI command for converting HTML to EPUB
 */

import type { Command } from 'commander';
import type { CLIOptions, ConversionOptions, ConversionResult } from '../../core/types.js';
import { logInfo, logSuccess, logError, setVerbose } from '../../core/logger.js';
import {
  validateUrl,
  validateOutputPath,
  validateConcurrency,
  validateTimeout,
  validateTitle,
  validateAuthor,
  validateConfigFile,
} from '../validators.js';

/**
 * Register the convert command
 */
export function registerConvertCommand(program: Command): void {
  program
    .command('convert')
    .description('Convert a multi-page HTML website to EPUB')
    .argument('<url>', 'URL of the website to convert')
    .option('-o, --output <path>', 'Output EPUB file path', './output.epub')
    .option('-t, --title <title>', 'Book title (auto-detected if not provided)')
    .option('-a, --author <author>', 'Book author (auto-detected if not provided)')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--concurrency <number>', 'Maximum concurrent page fetches', '5')
    .option('--timeout <ms>', 'Timeout per page in milliseconds', '30000')
    .option('-v, --verbose', 'Enable verbose logging', false)
    .action(async (url: string, options: RawOptions) => {
      await runConvert(url, options);
    });
}

interface RawOptions {
  output: string;
  title?: string;
  author?: string;
  config?: string;
  concurrency?: string;
  timeout?: string;
  verbose?: boolean;
}

/**
 * Run the convert command
 */
async function runConvert(url: string, rawOptions: RawOptions): Promise<void> {
  const startTime = Date.now();

  try {
    // Enable verbose logging if requested
    if (rawOptions.verbose) {
      setVerbose(true);
    }

    // Validate inputs
    const validatedOptions = validateOptions(url, rawOptions);

    logInfo(`Converting: ${validatedOptions.url}`);
    logInfo(`Output: ${validatedOptions.output}`);

    // Build conversion options
    const conversionOptions: ConversionOptions = {
      url: validatedOptions.url,
      output: validatedOptions.output,
      title: validatedOptions.title,
      author: validatedOptions.author,
      maxConcurrency: validatedOptions.maxConcurrency,
      timeout: validatedOptions.timeout,
    };

    // Load config file if provided
    if (validatedOptions.configFile) {
      const config = await loadConfigFile(validatedOptions.configFile);
      conversionOptions.siteConfig = config;
    }

    // Run the conversion pipeline
    const result = await runPipeline(conversionOptions);

    // Report success
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logSuccess('Conversion completed!');
    logInfo(`  Output: ${result.outputPath}`);
    logInfo(`  Chapters: ${result.chaptersCount}`);
    logInfo(`  Images: ${result.imagesCount}`);
    logInfo(`  Size: ${formatSize(result.totalSize)}`);
    logInfo(`  Duration: ${duration}s`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logError(`Conversion failed after ${duration}s`);

    if (error instanceof Error) {
      logError(error.message);

      if (rawOptions.verbose && error.stack) {
        console.error(error.stack);
      }
    }

    process.exit(1);
  }
}

/**
 * Validate and transform raw CLI options
 */
function validateOptions(url: string, raw: RawOptions): CLIOptions {
  return {
    url: validateUrl(url),
    output: validateOutputPath(raw.output),
    title: validateTitle(raw.title),
    author: validateAuthor(raw.author),
    configFile: validateConfigFile(raw.config),
    maxConcurrency: validateConcurrency(raw.concurrency),
    timeout: validateTimeout(raw.timeout),
    verbose: raw.verbose,
  };
}

/**
 * Load and parse a configuration file
 */
async function loadConfigFile(configPath: string): Promise<Record<string, unknown>> {
  const { readFile } = await import('fs/promises');
  const content = await readFile(configPath, 'utf-8');

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in config file: ${configPath}`);
  }
}

/**
 * Run the conversion pipeline
 * 
 * This is a placeholder that will be replaced by the actual pipeline
 * implementation in Step 10.
 */
async function runPipeline(options: ConversionOptions): Promise<ConversionResult> {
  // Import the pipeline dynamically to avoid circular dependencies
  const { convert } = await import('../../pipeline/index.js');
  return convert(options);
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
