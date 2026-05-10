import ScraperService from './src/services/scraper';

async function run() {
  const scraper = new ScraperService();
  try {
    const res = await scraper.scrape('https://www.tiktok.com/@nike');
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
