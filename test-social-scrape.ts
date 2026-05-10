import { ScraperService } from './services/scraper.ts';

async function runTest() {
  const scraper = ScraperService.getInstance();
  console.log("Starting scraper test for Instagram...");
  try {
    const result = await scraper.scrapeSocialPage('https://instagram.com/nike', 'instagram');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Scrape Error:", error);
  }
}

runTest();
