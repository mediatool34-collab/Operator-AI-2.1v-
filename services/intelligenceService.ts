import { ScraperService } from './scraper.ts';
import { db } from '../src/db/index.js';
import { optimizationLogs, workspaces } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { AdSpyEngine } from '../intel/adSpy.ts';
import axios from 'axios';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface IntelligenceReport {
  domain: string;
  url: string;
  timestamp: string;
  audit?: any;
}

export class IntelligenceService {
  private static instance: IntelligenceService;
  private scraper: ScraperService;
  private spy: AdSpyEngine;

  private constructor() {
    this.scraper = ScraperService.getInstance();
    this.spy = new AdSpyEngine();
  }

  public static getInstance(): IntelligenceService {
    if (!IntelligenceService.instance) {
      IntelligenceService.instance = new IntelligenceService();
    }
    return IntelligenceService.instance;
  }

  /**
   * Fetches real-world marketing data from SEMrush
   */
  async fetchSemrushData(url: string): Promise<any> {
    const apiKey = process.env.SEMRUSH_API_KEY;
    if (!apiKey) {
      console.warn('[Intelligence] SEMrush API Key missing. Falling back to scraper only.');
      return null;
    }

    try {
      const domain = new URL(url).hostname;
      
      // 1. Domain Overview
      const overviewUrl = `https://api.semrush.com/?type=domain_ranks&key=${apiKey}&export_columns=Or,Ot,Oc,Ad,At,Ac,As&domain=${domain}&database=us`;
      const overviewRes = await axios.get(overviewUrl);
      
      // 2. Backlinks Overview
      const backlinksUrl = `https://api.semrush.com/?type=backlinks_overview&key=${apiKey}&target=${domain}&target_type=domain`;
      const backlinksRes = await axios.get(backlinksUrl);

      // Parse CSV-like response from SEMrush
      const parseSemrushCsv = (csv: string) => {
        if (!csv || csv.includes('ERROR')) return null;
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return null;
        const headers = lines[0].split(';');
        const values = lines[1].split(';');
        const result: any = {};
        headers.forEach((h, i) => {
          result[h] = values[i];
        });
        return result;
      };

      return {
        overview: parseSemrushCsv(overviewRes.data),
        backlinks: parseSemrushCsv(backlinksRes.data),
        source: 'SEMrush'
      };
    } catch (error: any) {
      console.error('[Intelligence] SEMrush fetch failed:', error.message);
      return null;
    }
  }

  /**
   * Performs AI analysis using chosen LLM (Claude, ChatGPT, or Gemini)
   */
  async analyzeWithAI(prompt: string, modelType: 'gemini' | 'openai' | 'anthropic' = 'gemini'): Promise<string> {
    try {
      const isJsonRequest = prompt.toLowerCase().includes('json');

      if (modelType === 'gemini') {
        throw new Error('Gemini calls from backend are deprecated. Please use the frontend analyzeWithGemini() function to comply with security guidelines.');
      }

      if (modelType === 'openai') {
        const key = process.env.OPENAI_API_KEY;
        if (!key || key.includes('MY_') || key === 'TODO') {
          throw new Error('OpenAI API Key is missing or invalid in Secrets.');
        }
        const openai = new OpenAI({ apiKey: key });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: isJsonRequest ? { type: "json_object" } : undefined
        });
        return response.choices[0].message.content || '';
      } 
      
      if (modelType === 'anthropic') {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key || key.includes('MY_') || key === 'TODO') {
          throw new Error('Anthropic API Key is missing or invalid in Secrets.');
        }
        const anthropic = new Anthropic({ apiKey: key });
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        });
        return (response.content[0] as any).text || '';
      }

      throw new Error(`Unsupported backend model type: ${modelType}. Please use frontend services for Gemini.`);

    } catch (error: any) {
      let message = error.message;

      // Handle specific API key errors from Google SDK
      if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
        message = 'Invalid Gemini API Key. Please check the Secrets panel and ensure your key (starting with AIza...) is correctly copied without extra characters.';
      }

      console.error(`[Intelligence] AI analysis failed (${modelType}):`, message);
      throw new Error(message);
    }
  }

  /**
   * Coordinates the full diagnostic
   */
  async fullAudit(url: string, userId: string, preferredModel: any = 'gemini'): Promise<any> {
    console.log(`[Intelligence] 🔍 Starting Full Audit for: ${url} using ${preferredModel}`);
    
    // 1. Scrape content
    const scrapeResult = await this.scraper.scrape(url, { screenshot: false });
    
    // 2. Fetch SEMrush data
    const semrushData = await this.fetchSemrushData(url);
    
    // 3. Prepare contextual data for AI
    const dataContext = {
      url,
      scrapeContent: scrapeResult.content?.substring(0, 5000), // Protect context length
      semrush: semrushData,
      timestamp: new Date().toISOString()
    };

    // 4. In a real app, we'd inject the specialized prompts here
    // For this demonstration, we'll return the prepared data
    // and the frontend will decide whether to call the AI directly or via backend
    
    return dataContext;
  }

  /**
   * Saves a completed report from the frontend
   */
  async saveCompletedReport(userId: string, report: any): Promise<any> {
    const domain = report.url ? new URL(report.url).hostname : 'unknown';
    
    const savedId = `report_${Date.now()}`;

    try {
      // Create a default workspace if it doesn't exist for pg schema logs
      const defaultWorkspaceId = `ws_${userId}`;
      const existingWorkspace = await db.select().from(workspaces).where(eq(workspaces.id, defaultWorkspaceId)).limit(1);
      
      if (existingWorkspace.length === 0) {
          await db.insert(workspaces).values({
            id: defaultWorkspaceId,
            name: `${userId}'s Workspace`,
            ownerId: userId
          });
      }

      // We'll log it as an optimization action for tracking
      await db.insert(optimizationLogs).values({
        id: savedId,
        workspaceId: defaultWorkspaceId,
        action: `SAVE_INTEL_REPORT`,
        reason: `Report saved for ${domain}`,
        afterState: report
      });

      console.log(`[Intelligence] ✅ Saved report ${savedId} for user ${userId} to PostgreSQL`);
    } catch (err: any) {
      console.error(`[Intelligence] ❌ Failed to save to PostgreSQL:`, err.message);
      throw new Error('Failed to save intelligence report to database.');
    }

    return { id: savedId };
  }
}
