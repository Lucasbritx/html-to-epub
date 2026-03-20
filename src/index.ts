#!/usr/bin/env node
/**
 * HTML-to-EPUB CLI entry point
 */

import { runCLI } from './cli/index.js';

runCLI().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
