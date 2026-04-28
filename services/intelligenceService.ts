import { ScraperService } from './scraper.ts';
import { adminDb } from '../firebase-config.ts';
import { AdSpyEngine } from '../intel/adSpy.ts';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
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
   * Performs collaborative AI analysis using Gemini as host and others as experts
   */
  async collaborativeAnalyze(prompt: string): Promise<string> {
    console.log('[Intelligence] 🤝 Starting Collaborative Intelligence...');
    
    // 1. Get Experts' opinions (Parallel) - ONLY if keys exist and are valid
    const expertCalls: Promise<string>[] = [];
    
    const hasOpenAI = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('TODO');
    const hasAnthropic = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('TODO');

    if (hasOpenAI) {
      expertCalls.push(this.analyzeWithAI(`EXPERT TASK: Provide deep logical reasoning, data-structure verification, and mathematical sanity checks for the following request. Focus on finding flaws or optimizations. REQUEST: ${prompt.substring(0, 2000)}`, 'openai'));
    }
    
    if (hasAnthropic) {
      expertCalls.push(this.analyzeWithAI(`EXPERT TASK: Provide strategic direction, market positioning, and polished narrative articulation for the following request. REQUEST: ${prompt.substring(0, 2000)}`, 'anthropic'));
    }

    let experts: any[] = [];
    if (expertCalls.length > 0) {
      experts = await Promise.allSettled(expertCalls);
    }

    const logicExpert = hasOpenAI && experts[0]?.status === 'fulfilled' ? experts[0].value : 'Logic expertise unavailable (Key or Quota issue).';
    const strategyExpert = hasAnthropic && experts[1]?.status === 'fulfilled' ? experts[1].value : 'Strategic expertise unavailable (Key or Quota issue).';

    // 2. Aggregate with Gemini (The Master Engine)
    const finalPrompt = `
      You are the Master Marketing Intelligence Engine.
      You have received specialized insights from your internal reasoning experts.
      
      EXPERT INSIGHTS:
      ${logicExpert}
      ${strategyExpert}
      
      YOUR FINAL TASK:
      Synthesize these insights with your own analysis to produce the final comprehensive response. 
      Deliver a single, high-authority output in PROFESSIONAL MARKETING ENGLISH only.
      
      ORIGINAL USER REQUEST:
      ${prompt}
    `;

    return this.analyzeWithAI(finalPrompt, 'gemini');
  }

  /**
   * Perfroms AI analysis using chosen LLM (Claude, ChatGPT, or Gemini)
   */
  async analyzeWithAI(prompt: string, modelType: 'gemini' | 'openai' | 'anthropic' = 'gemini'): Promise<string> {
    try {
      const isJsonRequest = prompt.toLowerCase().includes('json');

      if (modelType === 'openai') {
        const key = process.env.OPENAI_API_KEY;
        if (!key || key.includes('TODO')) throw new Error('OPENAI_API_KEY is missing or not configured.');
        const openai = new OpenAI({ apiKey: key.trim().replace(/^["']|["']$/g, '') });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: isJsonRequest ? { type: "json_object" } : undefined
        });
        return response.choices[0].message.content || '';
      } 
      
      if (modelType === 'anthropic') {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key || key.includes('TODO')) throw new Error('ANTHROPIC_API_KEY is missing or not configured.');
        const anthropic = new Anthropic({ apiKey: key.trim().replace(/^["']|["']$/g, '') });
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        });
        return (response.content[0] as any).text || '';
      }

      // Default to Gemini
      let key = process.env.GEMINI_API_KEY;
      
      if (!key || key === 'TODO' || key.includes('YOUR_API_KEY')) {
         key = process.env.GOOGLE_API_KEY || key;
      }

      if (!key || key === 'TODO' || key.includes('YOUR_API_KEY')) {
        throw new Error('GEMINI_API_KEY is missing or invalid. Go to Settings > Secrets to add it.');
      }
      
      const sanitizedKey = key.trim().replace(/^["']|["']$/g, '');
      
      const genAI = new GoogleGenAI({ apiKey: sanitizedKey });
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: isJsonRequest ? "application/json" : "text/plain"
        }
      });
      
      return response.text || '';

    } catch (error: any) {
      console.error(`[Intelligence] AI analysis failed (${modelType}):`, error.message);
      
      const errMsg = error.message?.toLowerCase() || '';
      
      // Better user-facing error messages
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('too many requests')) {
        throw new Error(`${modelType.toUpperCase()} Quota exceeded. AI limit reached. Please wait a few minutes or upgrade your plan.`);
      }
      if (errMsg.includes('400') || errMsg.includes('api key not valid') || errMsg.includes('invalid_argument')) {
        throw new Error(`${modelType.toUpperCase()} API key is invalid or unauthorized. Please check Settings > Secrets.`);
      }
      if (errMsg.includes('401') || errMsg.includes('unauthorized')) {
        throw new Error(`${modelType.toUpperCase()} Authentication failed. Is the API key correct?`);
      }
      if (errMsg.includes('credit balance is too low')) {
        throw new Error(`${modelType.toUpperCase()} balance is too low. Please add credits to your AI provider account.`);
      }
      
      throw new Error(`AI Analysis Error (${modelType.toUpperCase()}): ${error.message}`);
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
    
    let savedId = null;

    try {
      // 1. Persistence to User's private collection
      const userDoc = await adminDb.collection('users').doc(userId).collection('intelligence_reports').add({
        ...report,
        createdAt: new Date(),
        userId
      });
      savedId = userDoc.id;
      console.log(`[Intelligence] ✅ Saved report ${savedId} for user ${userId}`);
    } catch (err: any) {
      console.error(`[Intelligence] ❌ Failed to save to user collection:`, err.message);
      // If we can't even save to user collection, we might want to throw if savedId is null
    }
    
    try {
      // 2. Also keep global record for system intelligence
      await adminDb.collection('system_intel').doc('market').collection('reports').add({
        ...report,
        userId,
        domain,
        url: report.url,
        createdAt: new Date()
      });
      console.log(`[Intelligence] ✅ Saved report to system_intel`);
    } catch (err: any) {
      console.warn(`[Intelligence] ⚠️ Failed to save to system_intel:`, err.message);
      // Non-critical failure
    }

    if (!savedId) {
      throw new Error('Failed to save intelligence report to database.');
    }

    return { id: savedId };
  }
}
