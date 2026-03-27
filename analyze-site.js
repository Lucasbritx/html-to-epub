import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { resolveUrl, normalizeUrl, isSameSite, isContentUrl } from './dist/utils/url.js';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://diegopacheco.github.io/The-Art-of-Sense-A-Philosophy-of-Modern-AI/');
  
  // Get the raw HTML
  const html = await page.content();
  
  // Parse with Cheerio like the link extractor does
  const $ = cheerio.load(html);
  const baseUrl = 'https://diegopacheco.github.io/The-Art-of-Sense-A-Philosophy-of-Modern-AI/';
  
  // Test the exact selector being used
  const selectors = [
    '.sidebar a, .sidebar-nav a, #sidebar a, nav a, .chapter a, .chapter-link a, ' +
    '[class*="sidebar"] a, [class*="chapter"] a, [role="navigation"] a, .book-summary a, .summary a'
  ];
  
  const links = [];
  const seen = new Set();
  let order = 0;
  
  for (const selector of selectors) {
    const elements = $(selector);
    console.log(`Selector "${selector.substring(0, 50)}..." found ${elements.length} elements`);
    
    elements.each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      
      if (!href) return;
      
      const resolvedUrl = resolveUrl(href, baseUrl);
      if (!resolvedUrl) return;
      
      const normalized = normalizeUrl(resolvedUrl);
      if (seen.has(normalized)) return;
      
      if (!isSameSite(resolvedUrl, baseUrl)) {
        console.log(`  Filtered by isSameSite: ${href}`);
        return;
      }
      
      if (!isContentUrl(resolvedUrl)) {
        console.log(`  Filtered by isContentUrl: ${href}`);
        return;
      }
      
      const text = $el.text().trim() || '';
      if (!text) return;
      
      seen.add(normalized);
      links.push({ href: normalized, text, order: order++ });
    });
  }
  
  console.log(`\nTotal links after filtering: ${links.length}`);
  
  // Count anchor vs page links
  const anchorLinks = links.filter(l => l.href.includes('#'));
  const pageLinks = links.filter(l => !l.href.includes('#'));
  
  console.log(`Anchor links: ${anchorLinks.length}`);
  console.log(`Page links: ${pageLinks.length}`);
  
  if (pageLinks.length > 0) {
    console.log('\nFirst 10 page links:');
    pageLinks.slice(0, 10).forEach(l => console.log(`  ${l.text}: ${l.href}`));
  }
  
  await browser.close();
})();
