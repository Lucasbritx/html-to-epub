# HTML to EPUB Converter

A robust CLI tool that converts multi-page HTML websites (like online books, documentation, tutorials) into clean EPUB files optimized for Kindle and other e-readers.

## Features

- **Smart Crawling**: Automatically discovers and crawls all pages of a website using multiple strategies (sidebar navigation, pagination, auto-detection)
- **Site Detection**: Auto-detects common site types (GitHub Pages, Docsify, GitBook, Jekyll) and applies optimal selectors
- **Content Extraction**: Removes noise (navigation, ads, scripts) and extracts clean content
- **Image Optimization**: Downloads and compresses images (JPEG 70% quality, max 1200x1600px) for Kindle
- **Heading Normalization**: Preserves heading hierarchy while fixing gaps (h1→h3 becomes h1→h2)
- **EPUB 3 Output**: Generates valid EPUB 3 files with proper metadata and table of contents
- **Fail-Fast**: If any chapter fails to process, the entire conversion fails immediately

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Install from source

```bash
# Clone the repository
git clone <repository-url>
cd html-to-epub

# Install dependencies
npm install

# Install Playwright browsers (required for crawling)
npx playwright install chromium

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

### Basic Usage

```bash
# Convert a website to EPUB
html-to-epub convert https://example.com/book -o my-book.epub

# Or run directly with Node
node dist/index.js convert https://example.com/book -o my-book.epub

# Or use npm script during development
npm run dev -- convert https://example.com/book -o my-book.epub
```

### Command Options

```
Usage: html-to-epub convert [options] <url>

Convert a multi-page HTML website to EPUB

Arguments:
  url                     URL of the website to convert

Options:
  -o, --output <path>     Output EPUB file path (default: "./output.epub")
  -t, --title <title>     Book title (auto-detected if not provided)
  -a, --author <author>   Book author (auto-detected if not provided)
  -c, --config <path>     Path to configuration file
  --concurrency <number>  Maximum concurrent page fetches (default: "5")
  --timeout <ms>          Timeout per page in milliseconds (default: "30000")
  -v, --verbose           Enable verbose logging (default: false)
  -h, --help              Display help for command
```

### Examples

```bash
# Basic conversion
html-to-epub convert https://docs.example.com -o documentation.epub

# With custom title and author
html-to-epub convert https://book.example.com \
  -o "my-book.epub" \
  -t "My Awesome Book" \
  -a "John Doe"

# With verbose logging for debugging
html-to-epub convert https://tutorial.example.com -o tutorial.epub -v

# With custom concurrency and timeout
html-to-epub convert https://large-book.example.com \
  -o large-book.epub \
  --concurrency 3 \
  --timeout 60000
```

## Configuration

### Configuration File

You can provide a JSON configuration file for advanced customization:

```bash
html-to-epub convert https://example.com -c config.json -o book.epub
```

Example `config.json`:

```json
{
  "selectors": {
    "content": ["article", ".post-content", "main"],
    "title": ["h1", ".page-title"],
    "navigation": [".sidebar a", "nav a"],
    "exclude": ["script", "style", ".ads", ".comments"]
  },
  "crawlStrategy": {
    "type": "sidebar",
    "selector": ".sidebar-nav a"
  },
  "imageOptions": {
    "maxWidth": 1200,
    "maxHeight": 1600,
    "quality": 70,
    "format": "jpeg"
  }
}
```

### Crawl Strategies

The tool supports multiple crawl strategies:

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `sidebar` | Follows links in a sidebar/TOC | Documentation sites, GitBook |
| `pagination` | Follows next/previous links | Blog posts, tutorials |
| `auto` | Auto-detects the best strategy | Unknown site structure |

### Supported Site Types

The tool auto-detects and optimizes for:

- **Docsify** - JavaScript documentation sites
- **GitBook** - GitBook-based documentation
- **Jekyll** - Jekyll static sites (GitHub Pages)
- **GitHub README** - GitHub repository documentation
- **Generic** - Fallback for unknown sites

## Development

### Project Structure

```
html-to-epub/
├── src/
│   ├── core/           # Core types, errors, logger, config
│   ├── utils/          # URL manipulation, retry logic
│   ├── crawler/        # Page fetching and link discovery
│   │   └── strategies/ # Crawl strategies (sidebar, pagination, auto)
│   ├── parser/         # Content extraction and noise removal
│   │   └── selectors/  # Site-specific selectors
│   ├── normalizer/     # HTML cleanup, heading fixes, image handling
│   ├── chapter-builder/# Chapter creation and ordering
│   ├── epub/           # EPUB generation
│   ├── pipeline/       # Main orchestrator
│   └── cli/            # Command-line interface
│       └── commands/
├── tests/
│   └── unit/           # Unit tests
├── dist/               # Compiled output
└── package.json
```

### Scripts

```bash
# Build the project
npm run build

# Run in development mode
npm run dev -- convert <url> -o output.epub

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type check without emitting
npm run typecheck

# Clean build artifacts
npm run clean
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/epub/metadata-builder.test.ts

# Run with coverage report
npm run test:coverage
```

## Architecture

### Pipeline Overview

```
URL → Crawler → Parser → Normalizer → ChapterBuilder → EpubGenerator → EPUB File
```

1. **Crawler**: Uses Playwright to fetch pages, discovers links using configured strategy
2. **Parser**: Extracts main content using CSS selectors, removes noise elements
3. **Normalizer**: Cleans HTML for EPUB compatibility, fixes headings, processes images
4. **ChapterBuilder**: Creates chapter objects, resolves ordering, handles duplicates
5. **EpubGenerator**: Builds metadata, generates TOC, writes EPUB file

### Key Design Decisions

- **Fail-Fast**: Any failure stops the entire process to ensure data integrity
- **Modular Design**: Each module has a single responsibility and clear interfaces
- **Concurrency Control**: Uses p-limit to control parallel operations
- **Image Optimization**: Sharp for efficient image compression
- **Browser-Based Crawling**: Playwright handles JavaScript-rendered content

## Dependencies

| Package | Purpose |
|---------|---------|
| `playwright` | Browser automation for crawling |
| `cheerio` | HTML parsing and manipulation |
| `epub-gen-memory` | EPUB file generation |
| `sharp` | Image processing and compression |
| `commander` | CLI argument parsing |
| `consola` | Beautiful console logging |
| `p-limit` | Concurrency control |

## Troubleshooting

### Common Issues

**"No chapters found"**
- The site structure may not be supported. Try providing a custom config file with appropriate selectors.

**"Timeout" errors**
- Increase the timeout: `--timeout 60000`
- Reduce concurrency: `--concurrency 2`

**Images not appearing**
- Check if images are loaded via JavaScript (may need longer timeout)
- Verify image URLs are accessible

**Content extraction issues**
- Use `-v` flag to see debug output
- Provide custom selectors via config file

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
html-to-epub convert https://example.com -o book.epub -v
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request
