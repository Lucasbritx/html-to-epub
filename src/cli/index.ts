/**
 * CLI module - Command-line interface for HTML to EPUB converter
 */

import { Command } from 'commander';
import { registerConvertCommand } from './commands/index.js';
import { logError } from '../core/logger.js';

// Package info (would normally come from package.json)
const VERSION = '1.0.0';
const NAME = 'html-to-epub';
const DESCRIPTION = 'Convert multi-page HTML websites to clean EPUB files optimized for Kindle';

/**
 * Create and configure the CLI program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name(NAME)
    .description(DESCRIPTION)
    .version(VERSION, '-V, --version', 'Output the version number')
    .helpOption('-h, --help', 'Display help for command');

  // Register commands
  registerConvertCommand(program);

  // Handle unknown commands
  program.on('command:*', (commands: string[]) => {
    logError(`Unknown command: ${commands[0]}`);
    logError(`Run '${NAME} --help' for available commands.`);
    process.exit(1);
  });

  return program;
}

/**
 * Run the CLI
 */
export async function runCLI(args: string[] = process.argv): Promise<void> {
  const program = createCLI();

  try {
    await program.parseAsync(args);
  } catch (error) {
    if (error instanceof Error) {
      logError(error.message);
    }
    process.exit(1);
  }
}

// Export validators for external use
export * from './validators.js';
export * from './commands/index.js';
