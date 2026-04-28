import { ScraperService } from '../services/scraper.ts';
import { adminDb } from '../firebase-config.ts';

export interface AdSpyResult {
  id?: string;
  query: string;
  platform: 'meta' | 'tiktok' | 'google';
  ads: {
    publisher_name: string;
    body_text: string;
    image_url?: string;
    cta_text?: string;
    active_date?: string;
    hooks: string[];
    angles: string[];
  }[];
  trends: string[];
  scraped_at: string;
}

export class AdSpyEngine {
  private scraper: ScraperService;

  constructor() {
    this.scraper = ScraperService.getInstance();
  }

  /**
   * Searches for competitor ads on Meta Ads Library and analyzes them.
   */
  public async spyOnCompetitors(searchQuery: string): Promise<AdSpyResult> {
    console.log(`[AdSpy] 🕵️ Starting spy mission for query: ${searchQuery}`);
    
    // Construct Meta Ad Library Search URL
    // active_status=active, ad_type=all, q=QUERY
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodedQuery}&search_type=keyword_unordered&media_type=all`;

    try {
      // Use specialized social scraper
      const result = await this.scraper.scrapeSocialPage(url, 'meta');
      
      // Parse the real content
      // Note: In a real environment, we'd use robust selectors. 
      // For this implementation, we extract patterns from the scraped HTML/Text.
      const ads = this.extractAdsFromContent(result.content, result.html);

      const spyData: AdSpyResult = {
        query: searchQuery,
        platform: 'meta',
        ads: ads.slice(0, 10), // Limit to top 10
        trends: this.detectTrends(ads),
        scraped_at: new Date().toISOString(),
      };

      // Store in DB for historical tracking
      await adminDb.collection('system_intel').doc('ad_spy').collection('results').add(spyData);
      
      console.log(`[AdSpy] ✅ Successfully scraped and analyzed ${ads.length} ads`);
      return spyData;

    } catch (error: any) {
      console.error(`[AdSpy] ❌ Spy failed:`, error.message);
      throw error;
    }
  }

  /**
   * Simple heuristic parser for scraped ad content
   */
  private extractAdsFromContent(text: string, html: string): any[] {
    // This is a heuristic approach to find ad units in the text dump
    // Real Meta Ad Library uses complex React components
    const adUnits: any[] = [];
    
    // Split by common separators or repeated keywords
    const blocks = text.split(/Library ID:/i);
    
    blocks.forEach((block, index) => {
      if (index === 0) return; // Skip intro text

      // Extract Publisher (usually appears before the date/ID)
      const publisherMatch = block.match(/^([^\n]+)/);
      const publisher = publisherMatch ? publisherMatch[1].trim() : 'Unknown Advertiser';

      // Extract Body (look for text after "Started running on" or similar patterns)
      const bodyText = block.substring(0, 1000).replace(/\n/g, ' ').trim();

      // Heuristic analysis for hooks and angles
      const hooks = this.extractHooks(bodyText);
      const angles = this.extractAngles(bodyText);

      adUnits.push({
        publisher_name: publisher,
        body_text: bodyText,
        hooks,
        angles,
        active_date: new Date().toLocaleDateString()
      });
    });

    return adUnits;
  }

  private extractHooks(text: string): string[] {
    const hooks: string[] = [];
    // Common hook patterns: Questions, Direct Benefits, Urgency
    if (text.includes('?')) hooks.push('Question-based hook');
    if (text.match(/free|discount|off/i)) hooks.push('Offer-based hook');
    if (text.match(/how to|secrets|reveal/i)) hooks.push('Educational hook');
    if (text.match(/limited time|today only|ends/i)) hooks.push('Urgency/Scarcity hook');
    
    return hooks.length > 0 ? hooks : ['Direct product pitch'];
  }

  private extractAngles(text: string): string[] {
    const angles: string[] = [];
    if (text.match(/save|money|budget/i)) angles.push('Financial angle');
    if (text.match(/easy|fast|simple/i)) angles.push('Efficiency/Convenience angle');
    if (text.match(/best|premium|quality/i)) angles.push('Authority/Quality angle');
    if (text.match(/guarantee|proven|results/i)) angles.push('Trust/Proof angle');
    
    return angles.length > 0 ? angles : ['Standard commercial angle'];
  }

  private detectTrends(ads: any[]): string[] {
    const trends: string[] = [];
    if (ads.length > 5) {
      const allText = ads.map(a => a.body_text).join(' ').toLowerCase();
      
      // Look for repeated keywords in the set
      const commonAds = ['video', 'ugc', 'testimonial', 'sale', 'new'];
      commonAds.forEach(word => {
        const count = (allText.match(new RegExp(word, 'g')) || []).length;
        if (count > ads.length * 0.5) {
          trends.push(`Trend: High usage of ${word.toUpperCase()} format/content`);
        }
      });
    }
    
    if (trends.length === 0) trends.push('Trend: Diverse creative approaches');
    return trends;
  }
}
