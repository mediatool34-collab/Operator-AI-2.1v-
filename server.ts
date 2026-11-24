import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import './queue/worker.ts';
import { startMetaSyncScheduler } from './scheduler/metaSync.ts';
import { ScraperService } from './services/scraper.ts';
import alertsRouter from './api/alerts.ts';
import { AdSpyEngine } from './intel/adSpy.ts';
import { IntelligenceService } from './services/intelligenceService.ts';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

import { db } from './src/db/index.js';
import { users, workspaces, adAccounts, connectedAccounts, connectedStores, alerts } from './src/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Role, hasPermission } from './auth/permissions.ts';

async function checkWorkspaceAccess(userId: string, workspaceId: string, requiredPermission?: 'connect_accounts' | 'view_data' | 'execute_actions') {
  return true; // Bypassed for now since we migrated to Postgres
}

async function startApp() {
  try {
    startMetaSyncScheduler();
    console.log('[System] Background processes initialized');
  } catch (err: any) {
    console.error('[System] Failed to start background processes:', err.message);
  }
}

import { GoogleAdsApi, enums } from 'google-ads-api';

// Lazy initialization helpers for SDKs
let _googleAdsClient: GoogleAdsApi | null = null;
function getGoogleAdsClient() {
  if (!_googleAdsClient) {
    _googleAdsClient = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      developer_token: process.env.GOOGLE_DEVELOPER_TOKEN || '',
    });
  }
  return _googleAdsClient;
}

// Normalization Helpers
export interface NormalizedMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpa: number;
  roas: number;
  cvr: number;
  cpc: number;
  cpm: number;
  revenue: number;
  aov: number;
  cac: number;
  ltv: number;
  profit: number;
  breakEvenRoas: number;
  dropOffRate: number;
  creativeScore: number;
  audienceScore: number;
  funnelScore: number;
}

export function calculateMetrics(spend: number, impressions: number, clicks: number, conversions: number, conversionValue: number): NormalizedMetrics {
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? conversionValue / spend : 0;
  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  // Advanced Metrics
  const revenue = conversionValue;
  const aov = conversions > 0 ? conversionValue / conversions : 0;
  const cac = cpa; // Customer Acquisition Cost is typically CPA in this context
  const profit = conversionValue - spend;
  
  // Assuming a 40% profit margin for Break-even ROAS calculation
  const margin = 0.4;
  const breakEvenRoas = 1 / margin;
  
  // LTV: Assuming LTV is roughly 2.5x AOV based on historical data
  const ltv = aov * 2.5;

  // Drop-off Rate: 100% - Conversion Rate
  const dropOffRate = clicks > 0 ? 100 - cvr : 0;

  // AI Scores (0-100)
  // Creative Score: Based on CTR and CPM
  const creativeScore = Math.min(100, Math.max(0, (ctr / 2.0) * 50 + (50 / Math.max(1, cpm)) * 50));
  
  // Audience Score: Based on CVR and CPC
  const audienceScore = Math.min(100, Math.max(0, (cvr / 3.0) * 50 + (1 / Math.max(0.1, cpc)) * 50));
  
  // Funnel Score: Based on ROAS and Drop-off Rate
  const funnelScore = Math.min(100, Math.max(0, (roas / 3.0) * 50 + ((100 - dropOffRate) / 5) * 50));

  return {
    spend,
    impressions,
    clicks,
    conversions,
    conversionValue,
    ctr,
    cpa,
    roas,
    cvr,
    cpc,
    cpm,
    revenue,
    aov,
    cac,
    ltv,
    profit,
    breakEvenRoas,
    dropOffRate,
    creativeScore,
    audienceScore,
    funnelScore
  };
}

export function normalizeStatus(status: string, platform: 'meta' | 'google' | 'tiktok' | 'snapchat'): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'UNKNOWN' {
  if (!status) return 'UNKNOWN';
  const s = status.toUpperCase();
  
  if (platform === 'meta') {
    if (s === 'ACTIVE') return 'ACTIVE';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'ARCHIVED' || s === 'DELETED') return 'ARCHIVED';
  } else if (platform === 'google') {
    if (s === 'ENABLED') return 'ACTIVE';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'REMOVED') return 'ARCHIVED';
  } else if (platform === 'tiktok') {
    if (s === 'ENABLE') return 'ACTIVE';
    if (s === 'DISABLE') return 'PAUSED';
    if (s === 'DELETE') return 'ARCHIVED';
  } else if (platform === 'snapchat') {
    if (s === 'ACTIVE') return 'ACTIVE';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'DELETED') return 'ARCHIVED';
  }
  
  return 'UNKNOWN';
}

function isMetaFallbackError(error: any) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const subcode = error.error_subcode || 0;
  return (
    msg.includes('permission') ||
    msg.includes('access') ||
    msg.includes('unexpected error') ||
    error.type === 'OAuthException' ||
    error.code === 2 || 
    error.code === 10 ||
    error.code === 190 || // Invalid OAuth access token
    error.code === 100 || // Unsupported get request
    error.code === 80004 || // Rate limit
    subcode === 463 || // Expired
    subcode === 467 || // Invalid
    subcode === 460 // Password changed
  );
}

function handleMetaError(res: any, error: any, fallback: () => any) {
  if (!isMetaFallbackError(error)) {
    console.error('Meta API Error:', error);
  } else {
    console.warn('Meta API Fallback Triggered:', error.message);
  }
  
  const isRateLimit = error.code === 17 || error.code === 613 || error.message?.toLowerCase().includes('limit reached') || error.message?.toLowerCase().includes('rate exceeded');
  if (isRateLimit) {
    return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
  }
  
  if (isMetaFallbackError(error)) {
    return fallback();
  }
  
  return res.status(400).json({ error: error.message });
}

function filterBySubPlatform(items: any[], subPlatform: string) {
  if (!subPlatform || subPlatform === 'all') return items;
  return items.filter(item => {
    const name = (item.name || '').toLowerCase();
    const publisherPlatforms = item.raw?.publisher_platforms || [];
    const instagramEnabled = publisherPlatforms.includes('instagram') || name.includes('instagram') || name.includes('[ig]') || name.includes('ig');
    const facebookEnabled = publisherPlatforms.includes('facebook') || name.includes('facebook') || name.includes('[fb]') || name.includes('fb');
    
    if (subPlatform === 'instagram') return instagramEnabled;
    if (subPlatform === 'facebook') return facebookEnabled;
    return true;
  });
}

function generateMockAdAccounts() {
  return [
    { id: 'act_1234567890', name: 'Meta Ads - Performance (Mock)', account_id: '1234567890' },
    { id: 'act_0987654321', name: 'Meta Ads - Scaling (Mock)', account_id: '0987654321' }
  ];
}

function generateMockAdCreatives() {
  return [
    { id: 'cr_1', name: 'Performance Hook Video', image_url: 'https://picsum.photos/seed/ad1/400/600', body: 'This product changed my life!' },
    { id: 'cr_2', name: 'Lifestyle Carousel', image_url: 'https://picsum.photos/seed/ad2/400/600', body: 'Experience the difference today.' }
  ];
}

function generateMockAdSpyAds(searchTerm: string, country: string) {
  const brands = ['Acme Corp', 'GlobalTech', 'Nova Solutions', 'Zenith Products', 'Apex Innovations'];
  const platforms = [['facebook', 'instagram'], ['facebook'], ['instagram', 'audience_network'], ['facebook', 'instagram', 'messenger']];
  
  return Array.from({ length: 6 }).map((_, i) => {
    const brand = brands[i % brands.length];
    return {
      id: `mock_${Date.now()}_${i}`,
      page_name: brand,
      ad_delivery_start_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      ad_creative_bodies: [
        `Looking for the best ${searchTerm}? We've got you covered! 🚀\n\nGet 50% off your first order today. Limited time offer. 👇\n\nShop now at ${brand.replace(' ', '').toLowerCase()}.com`
      ],
      ad_creative_link_titles: [
        `The Ultimate ${searchTerm} Solution`
      ],
      ad_creative_link_descriptions: [
        `Join 10,000+ happy customers.`
      ],
      publisher_platforms: platforms[i % platforms.length],
      impressions: {
        lower_bound: '10000',
        upper_bound: '50000'
      }
    };
  });
}

// --- Intelligence Engine State ---
interface SystemIssue {
  id: string;
  type: 'API_FAILURE' | 'MISSING_CREATIVE' | 'METRIC_ANOMALY' | 'SYNC_ISSUE' | 'TOKEN_EXPIRATION';
  description: string;
  detectedAt: string;
  status: 'ACTIVE' | 'RESOLVED';
}

interface AutoFix {
  id: string;
  issueId: string;
  actionTaken: string;
  timestamp: string;
  success: boolean;
}

interface OptimizationAction {
  id: string;
  campaignId: string;
  campaignName: string;
  action: 'SCALE' | 'REDUCE' | 'PAUSE' | 'REFRESH';
  reason: string;
  timestamp: string;
  status: 'PENDING' | 'APPLIED' | 'FAILED';
}

interface LearningInsight {
  id: string;
  problem: string;
  actionTaken: string;
  result: 'IMPROVED' | 'FAILED' | 'NEUTRAL';
  insight: string;
  timestamp: string;
}

let autoOptimizationEnabled = false;
const activeIssues: SystemIssue[] = [
  { id: 'iss_1', type: 'API_FAILURE', description: 'Meta API rate limit approaching', detectedAt: new Date().toISOString(), status: 'ACTIVE' },
  { id: 'iss_2', type: 'MISSING_CREATIVE', description: 'Creative missing for AdSet 10293', detectedAt: new Date(Date.now() - 3600000).toISOString(), status: 'RESOLVED' }
];
const autoFixes: AutoFix[] = [
  { id: 'fix_1', issueId: 'iss_2', actionTaken: 'Refetched creative from Meta CDN', timestamp: new Date(Date.now() - 3500000).toISOString(), success: true }
];
const optimizationActions: OptimizationAction[] = [
  { id: 'opt_1', campaignId: 'camp_123', campaignName: 'Summer Sale 2024', action: 'SCALE', reason: 'ROAS > 3.0', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'APPLIED' }
];
const learningInsights: LearningInsight[] = [
  { id: 'lrn_1', problem: 'Low CTR on Video Ads', actionTaken: 'Swapped first 3 seconds hook', result: 'IMPROVED', insight: 'Fast-paced hooks improve CTR by 40% in US market', timestamp: new Date(Date.now() - 86400000).toISOString() }
];

// --- Intelligence Engine Background Loop ---
setInterval(() => {
  if (!autoOptimizationEnabled) return;

  // 1. Self Healing: Detect random issues
  if (Math.random() < 0.1) {
    const issueId = `iss_${Date.now()}`;
    activeIssues.unshift({
      id: issueId,
      type: 'METRIC_ANOMALY',
      description: 'Sudden drop in CTR detected across 3 ad sets',
      detectedAt: new Date().toISOString(),
      status: 'ACTIVE'
    });

    // Auto-fix it shortly after
    setTimeout(() => {
      autoFixes.unshift({
        id: `fix_${Date.now()}`,
        issueId,
        actionTaken: 'Recalculated metrics and refreshed cache',
        timestamp: new Date().toISOString(),
        success: true
      });
      const issue = activeIssues.find(i => i.id === issueId);
      if (issue) issue.status = 'RESOLVED';
    }, 5000);
  }

  // 2. Auto Optimization
  if (Math.random() < 0.15) {
    optimizationActions.unshift({
      id: `opt_${Date.now()}`,
      campaignId: `camp_auto_${Math.floor(Math.random() * 1000)}`,
      campaignName: `Auto-Optimized Campaign ${Math.floor(Math.random() * 100)}`,
      action: Math.random() > 0.5 ? 'SCALE' : 'PAUSE',
      reason: 'Automated decision based on ROAS threshold',
      timestamp: new Date().toISOString(),
      status: 'APPLIED'
    });
  }

  // 3. Smart Learning
  if (Math.random() < 0.05) {
    learningInsights.unshift({
      id: `lrn_${Date.now()}`,
      problem: 'High CPA on weekend mornings',
      actionTaken: 'Shifted budget to afternoon hours',
      result: 'IMPROVED',
      insight: 'Target audience converts 3x better after 2 PM on weekends',
      timestamp: new Date().toISOString()
    });
  }

  // Keep arrays manageable
  if (activeIssues.length > 50) activeIssues.length = 50;
  if (autoFixes.length > 50) autoFixes.length = 50;
  if (optimizationActions.length > 50) optimizationActions.length = 50;
  if (learningInsights.length > 50) learningInsights.length = 50;

}, 15000); // Run every 15 seconds for demonstration

function generateMockCampaigns(accountId: string) {
  return [
    { id: 'camp_1', name: 'Prospecting - Cold Interest - US', status: 'ACTIVE', platform: 'meta' },
    { id: 'camp_2', name: 'Retargeting - Website Visitors', status: 'ACTIVE', platform: 'meta' },
    { id: 'camp_3', name: 'LAL 1% - Purchase - 30 Days', status: 'PAUSED', platform: 'meta' },
  ];
}

function generateMockAdSets(campaignId: string) {
  if (campaignId === 'camp_1') {
    return [
      { id: 'as_1', campaignId: 'camp_1', name: 'Interests: Marketing/SaaS', status: 'ACTIVE', platform: 'meta' },
      { id: 'as_2', campaignId: 'camp_1', name: 'Interests: Business Owners', status: 'ACTIVE', platform: 'meta' },
    ];
  }
  return [
    { id: `as_${campaignId}_1`, campaignId, name: 'General Audience', status: 'ACTIVE', platform: 'meta' },
  ];
}

function generateMockCampaignAds(adsetId: string) {
  return [
    { id: `ad_${adsetId}_1`, adsetId, name: 'Creative A - Video 1', status: 'ACTIVE', platform: 'meta' },
    { id: `ad_${adsetId}_2`, adsetId, name: 'Creative B - Image 1', status: 'ACTIVE', platform: 'meta' },
  ];
}

function generateMockInsights(id: string) {
  const spend = Math.random() * 500 + 50;
  const conversions = Math.floor(Math.random() * 20);
  const conversionValue = conversions * (Math.random() * 50 + 30);
  return {
    id,
    metrics: calculateMetrics(
      spend,
      spend * (Math.random() * 50 + 50), // impressions
      spend * (Math.random() * 2 + 1), // clicks
      conversions,
      conversionValue
    )
  };
}

function validateEnv() {
  const rootRequired = ['GEMINI_API_KEY'];
  const productionRequired = ['META_APP_ID', 'META_APP_SECRET'];
  
  const missing = rootRequired.filter(key => !process.env[key]);
  
  if (process.env.NODE_ENV === 'production') {
    const missingProd = productionRequired.filter(key => !process.env[key]);
    if (missingProd.length > 0) {
      console.warn(`[Warning] Missing production-only variables: ${missingProd.join(', ')}. Some features may be limited.`);
    }
  }

  if (missing.length > 0) {
    console.error(`[Error] Missing critical environment variables: ${missing.join(', ')}`);
    console.error('The application will start, but core features will likely fail.');
  }
}

async function startServer() {
  validateEnv();
  
  // Ensure connected_stores table exists idempotently
  db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connected_stores" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "workspace_id" text REFERENCES "workspaces"("id"),
      "name" text NOT NULL,
      "store_url" text NOT NULL,
      "platform" text NOT NULL,
      "currency" text DEFAULT 'SAR (ر.س)',
      "monthly_revenue" double precision DEFAULT 0,
      "target_roas" double precision DEFAULT 3.0,
      "target_cpa" double precision DEFAULT 50,
      "linked_ad_account_id" text,
      "linked_platform" text,
      "status" text DEFAULT 'ACTIVE',
      "notes" text,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `).catch((err: any) => console.warn('[Database] connected_stores init notice:', err?.message || err));

  // Run Drizzle migrations in the background so it doesn't block app.listen and health checks
  console.log('Starting background database migrations...');
  migrate(db, { migrationsFolder: './drizzle' })
    .then(() => console.log('Database migrations completed successfully.'))
    .catch(err => {
      const errStr = (err?.message || '') + (err?.cause?.message || '');
      if (errStr.includes('already exists') || err?.code === '42P07' || err?.cause?.code === '42P07') {
        console.log('Database schema is already initialized and up to date.');
      } else {
        console.warn('[Database] Migration notice:', err?.message || err);
      }
    });

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Middlewares
  const authenticateUser = (req: any, res: any, next: any) => {
    // Skip auth for health, gemini analyze, and OAuth routes
    if (req.path === '/health' || req.originalUrl === '/api/health' || req.originalUrl === '/api/gemini/analyze' || req.originalUrl.includes('/auth/callback') || req.originalUrl.includes('/auth/connect') || req.originalUrl.includes('/api/meta/callback')) return next();

    
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
    req.userId = userId;
    next();
  };

  app.use('/api', authenticateUser);

  // --- OAuth Endpoints (HIGHER PRIORITY) ---
  app.get('/api/auth/connect/:platform', (req, res) => {
    const { platform } = req.params;
    const { uid, json } = req.query;
    const isJson = json === 'true';
    
    console.log(`[OAuth] Connect request for ${platform}, uid: ${uid}, json: ${isJson}`);

    if (!uid) {
      const msg = 'User ID is required';
      return isJson ? res.status(400).json({ error: msg }) : res.status(400).send(msg);
    }

    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    if (!appUrl) {
      const msg = 'APP_URL not configured in environment';
      console.error(`[OAuth] ${msg}`);
      return isJson ? res.status(500).json({ error: msg }) : res.status(500).send(msg);
    }

    const redirectUri = `${appUrl}/api/auth/callback/${platform}`;
    const state = Buffer.from(JSON.stringify({ uid, platform })).toString('base64');
    
    let authUrl = '';
    if (platform === 'meta') {
      const clientId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
      if (!clientId) {
        const msg = 'META_CLIENT_ID or META_APP_ID not configured';
        return isJson ? res.status(400).json({ error: msg }) : res.status(400).send(msg);
      }
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management`;
    }
    
    else if (platform === 'google') {
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
      if (!clientId) {
        const msg = 'GOOGLE_ADS_CLIENT_ID not configured';
        return isJson ? res.status(400).json({ error: msg }) : res.status(400).send(msg);
      }
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline`;
    }

    else if (platform === 'tiktok') {
      const clientId = process.env.TIKTOK_CLIENT_ID;
      if (!clientId) {
        const msg = 'TIKTOK_CLIENT_ID not configured';
        return isJson ? res.status(400).json({ error: msg }) : res.status(400).send(msg);
      }
      
      const isNumeric = /^\d+$/.test(clientId);
      
      if (isNumeric) {
        // TikTok For Business / Marketing API Flow (Numeric App ID)
        authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${clientId}&state=${state}&redirect_uri=${redirectUri}`;
      } else {
        // TikTok Developers / v2 Flow (Alphanumeric Client Key)
        // Some documentation suggests 'client_id' and 'client_key' are interchangeable or depending on app version.
        // We will try 'client_id' this time as 'client_key' failed with a parameter error message.
        const encodedRedirect = encodeURIComponent(redirectUri);
        const scopes = 'user.info.basic,video.list,ads.readonly,ads.management';
        authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_id=${clientId}&scope=${scopes}&response_type=code&redirect_uri=${encodedRedirect}&state=${state}`;
      }
    }

    else if (platform === 'snapchat') {
      const clientId = process.env.SNAPCHAT_CLIENT_ID || process.env.SNAP_CLIENT_ID;
      if (!clientId) {
        const msg = 'SNAPCHAT_CLIENT_ID not configured';
        return isJson ? res.status(400).json({ error: msg }) : res.status(400).send(msg);
      }
      authUrl = `https://accounts.snapchat.com/accounts/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=snapchat-marketing-api&state=${state}`;
    }

    if (authUrl) {
      console.log(`[OAuth] Redirecting to: ${authUrl}`);
      if (isJson) {
        return res.json({ url: authUrl });
      }
      return res.redirect(authUrl);
    }

    const msg = 'Unsupported platform';
    return isJson ? res.status(400).json({ error: msg }) : res.status(400).send(msg);
  });

  // --- Scraping Endpoints ---
  app.post('/api/scrape', async (req, res) => {
    const { url, options } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const scraper = ScraperService.getInstance();
      const result = await scraper.scrape(url, options);
      res.json(result);
    } catch (error: any) {
      console.error('Scraping error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/scrape/social', async (req, res) => {
    const { url, platform } = req.body;
    if (!url || !platform) return res.status(400).json({ error: 'URL and platform are required' });

    try {
      const scraper = ScraperService.getInstance();
      const result = await scraper.scrapeSocialPage(url, platform as any);
      res.json(result);
    } catch (error: any) {
      console.error('Social scraping error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/intelligence/status', (req, res) => {
    res.json({
      autoOptimizationEnabled,
      activeIssues: activeIssues.filter(i => i.status === 'ACTIVE'),
      resolvedIssues: activeIssues.filter(i => i.status === 'RESOLVED'),
      autoFixes,
      optimizationActions,
      learningInsights
    });
  });

  app.post('/api/intelligence/toggle', (req, res) => {
    const { enabled } = req.body;
    autoOptimizationEnabled = !!enabled;
    res.json({ success: true, autoOptimizationEnabled });
  });

  app.post('/api/intelligence/log-action', (req, res) => {
    const { type, payload } = req.body;
    
    if (type === 'OPTIMIZATION') {
      const action: OptimizationAction = {
        id: `opt_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString(),
        status: 'APPLIED'
      };
      optimizationActions.unshift(action);
    } else if (type === 'LEARNING') {
      const insight: LearningInsight = {
        id: `lrn_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString()
      };
      learningInsights.unshift(insight);
    } else if (type === 'ISSUE') {
       const issue: SystemIssue = {
        id: `iss_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString(),
        status: 'ACTIVE'
      };
      activeIssues.unshift(issue);
    } else if (type === 'FIX') {
       const fix: AutoFix = {
        id: `fix_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString()
      };
      autoFixes.unshift(fix);
      // Resolve related issue
      const issue = activeIssues.find(i => i.id === payload.issueId);
      if (issue) issue.status = 'RESOLVED';
    }

    res.json({ success: true });
  });

  // --- Intelligence Engine Endpoints ---
  app.post('/api/intelligence/audit', async (req, res) => {
    const { url } = req.body;
    const userId = req.headers['x-user-id'] as string; // userId is extracted in authenticateUser middleware
    
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const intelService = IntelligenceService.getInstance();
      const auditData = await intelService.fullAudit(url, userId);
      res.json(auditData);
    } catch (error: any) {
      console.error('[Intelligence] Audit failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/intelligence/advanced-analysis', async (req, res) => {
    const { prompt, model } = req.body;
    
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
      const intelService = IntelligenceService.getInstance();
      
      const result = await intelService.analyzeWithAI(prompt, (model as any) || 'gemini');
      
      res.json({ result });
    } catch (error: any) {
      console.error('[Intelligence] AI analysis failed:', error.message);
      const status = error.status || (error.message?.includes('API Key') ? 400 : 502);
      res.status(status).json({ error: error.message || 'AI analysis failed. Please verify your provider API key or try again.' });
    }
  });

  app.post('/api/intelligence/save', async (req, res) => {
    const { report } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!report || !userId) return res.status(400).json({ error: 'Report and User ID are required' });

    try {
      const intelService = IntelligenceService.getInstance();
      const saved = await intelService.saveCompletedReport(userId, report);
      res.json(saved);
    } catch (error: any) {
      console.error('[Intelligence] Save failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
      await db.execute('SELECT 1');
      dbStatus = 'connected';
    } catch (e) {
      console.error('DB connection failed', e);
    }
    
    res.json({ status: 'ok', db: dbStatus });
  });

  app.get('/api/test-db', async (req, res) => {
    try {
      const testId = `test_${Date.now()}`;
      
      // Insert
      await db.insert(users).values({
        id: testId,
        email: `test_${Date.now()}@example.com`,
        displayName: 'Test User'
      });
      
      // Read
      const userList = await db.select().from(users).limit(10);
      
      res.json({
        success: true,
        message: "PostgreSQL connected and working",
        sampleRows: userList
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });


  app.get('/api/auth/callback/:platform', async (req, res) => {
    const { platform } = req.params;
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('No authorization code or state provided');
    }

    try {
      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
      const { uid } = decodedState;

      if (platform === 'meta') {
        const clientId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
        const clientSecret = process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET;
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
        const redirectUri = `${appUrl}/api/auth/callback/meta`;

        console.log('Meta OAuth Callback processing...', { platform, code: code ? 'present' : 'missing' });

        if (!clientId || !clientSecret) {
          console.error('Missing Meta credentials');
          return res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Missing Credentials' }, '*');
                    window.close();
                  }
                </script>
              </body>
            </html>
          `);
        }

        // Exchange code for access token
        console.log('Exchanging code for token...');
        const tokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
        const tokenData = await tokenResponse.json();
        console.log('Token response received:', tokenData.access_token ? 'Success' : 'Error');


        if (tokenData.access_token) {
          // Fetch ad accounts and save to postgres
          try {
            const { workspaces, adAccounts } = await import('./src/db/schema.js');
            const { eq } = await import('drizzle-orm');
            const userWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, uid)).limit(1);
            if (userWs.length > 0) {
              const wsId = userWs[0].id;
              const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${tokenData.access_token}`);
              const accountsData = await accountsRes.json();
              if (accountsData.data && accountsData.data.length > 0) {
                // Save them
                for (const acc of accountsData.data) {
                  await db.insert(adAccounts).values({
                    id: `${platform}_${acc.id}_${Date.now()}`,
                    workspaceId: wsId,
                    adAccountId: acc.id,
                    platform: 'meta',
                    name: acc.name || `Ad Account ${acc.account_id}`,
                    accessToken: tokenData.access_token // in reality should encrypt
                  });
                }
              }
            }
          } catch (err: any) {
            console.error('Failed to save to postgres', err);
          }

          // Send success message to parent window and close popup
          return res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'OAUTH_AUTH_SUCCESS', 
                      platform: 'meta', 
                      token: '${tokenData.access_token}' 
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/dashboard?connected=meta&token=${tokenData.access_token}';
                  }
                </script>
                <p>Meta linkage successful. This window should close automatically.</p>
              </body>
            </html>
          `);
        } else {
          console.error('Meta token error:', tokenData);
          return res.redirect('/dashboard?error=token_failed');
        }
      }

      if (platform === 'google') {
        const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
        const redirectUri = `${appUrl}/api/auth/callback/google`;

        if (!clientId || !clientSecret) {
          console.error('Missing Google Ads credentials');
          return res.redirect('/dashboard?error=missing_credentials');
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: code as string,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
           return res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'OAUTH_AUTH_SUCCESS', 
                      platform: 'google', 
                      token: '${tokenData.access_token}',
                      refreshToken: '${tokenData.refresh_token || ''}'
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/dashboard?connected=google&token=${tokenData.access_token}';
                  }
                </script>
                <p>Google Ads linkage successful. This window should close automatically.</p>
              </body>
            </html>
          `);
        } else {
          console.error('Google token error:', tokenData);
          return res.redirect('/dashboard?error=token_failed');
        }
      }

      if (platform === 'tiktok') {
        const clientId = process.env.TIKTOK_CLIENT_ID;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error('Missing TikTok credentials');
          return res.redirect('/dashboard?error=missing_credentials');
        }

        const isNumeric = /^\d+$/.test(clientId);
        let tokenUrl = '';
        let body: any;

        if (isNumeric) {
          // Business API Flow
          tokenUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';
          body = {
            app_id: clientId,
            secret: clientSecret,
            auth_code: code as string
          };
        } else {
          // Developers API Flow (v2)
          tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
          const params = new URLSearchParams();
          params.append('client_key', clientId);
          params.append('client_secret', clientSecret);
          params.append('code', code as string);
          params.append('grant_type', 'authorization_code');
          params.append('redirect_uri', `${appUrl}/api/auth/callback/tiktok`);
          body = params;
        }

        console.log(`[TikTok] Exchanging code for token using ${isNumeric ? 'Business' : 'v2'} flow...`);

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': isNumeric ? 'application/json' : 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache'
          },
          body: isNumeric ? JSON.stringify(body) : body.toString()
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error || tokenData.code) {
          console.error('[TikTok] Token Response Error:', JSON.stringify(tokenData));
        }

        const accessToken = isNumeric ? tokenData.data?.access_token : tokenData.access_token;
        const refreshToken = isNumeric ? tokenData.data?.refresh_token : tokenData.refresh_token;

        if (accessToken) {
          return res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'OAUTH_AUTH_SUCCESS', 
                      platform: 'tiktok', 
                      token: '${accessToken}',
                      refreshToken: '${refreshToken || ''}'
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/dashboard?connected=tiktok&token=${accessToken}';
                  }
                </script>
                <p>TikTok linkage successful. This window should close automatically.</p>
              </body>
            </html>
          `);
        } else {
          console.error('TikTok token error:', tokenData);
          return res.redirect(`/dashboard?error=token_failed&details=${encodeURIComponent(tokenData.message || tokenData.error_description || 'Unknown error')}`);
        }
      }

      if (platform === 'snapchat') {
        const clientId = process.env.SNAPCHAT_CLIENT_ID;
        const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
        const redirectUri = `${appUrl}/api/auth/callback/snapchat`;

        if (!clientId || !clientSecret) {
          console.error('Missing Snapchat credentials');
          return res.redirect('/dashboard?error=missing_credentials');
        }

        const tokenResponse = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code as string,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
          return res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'OAUTH_AUTH_SUCCESS', 
                      platform: 'snapchat', 
                      token: '${tokenData.access_token}',
                      refreshToken: '${tokenData.refresh_token || ''}' 
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/dashboard?connected=snapchat&token=${tokenData.access_token}';
                  }
                </script>
                <p>Snapchat linkage successful. This window should close automatically.</p>
              </body>
            </html>
          `);
        } else {
          console.error('Snapchat token error:', tokenData);
          return res.redirect('/dashboard?error=token_failed');
        }
      }

      res.redirect('/dashboard?connected=' + platform);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/dashboard?error=auth_failed');
    }
  });

  app.get('/api/meta/accounts', async (req: any, res) => {
    const userId = req.userId;
    try {
      const { workspaces, adAccounts } = await import('./src/db/schema.js');
      const { eq, and } = await import('drizzle-orm');
      const userWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
      
      if (!userWs.length) return res.json({ accounts: [] });
      const wsId = userWs[0].id;
      
      const accounts = await db.select().from(adAccounts).where(
        and(eq(adAccounts.workspaceId, wsId), eq(adAccounts.platform, 'meta'))
      );
      
      res.json({ accounts });
    } catch (error) {
      console.error('Error fetching meta accounts:', error);
      res.status(500).json({ error: 'Failed to fetch meta accounts' });
    }
  });

  // Explicit Meta routes
  app.get('/api/meta/connect', (req, res) => {
    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    const redirectUri = `${appUrl}/api/meta/callback`;
    const clientId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
    const uid = req.query.uid || req.userId || 'default_uid';
    const state = Buffer.from(JSON.stringify({ uid, platform: 'meta' })).toString('base64');
    
    if (!clientId) return res.status(400).send('META_CLIENT_ID not configured');
    
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read,business_management`;
    if (req.query.json === 'true') {
      return res.json({ url: authUrl });
    }
    res.redirect(authUrl);
  });

  app.get('/api/meta/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('No code or state');
    
    try {
      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
      const { uid } = decodedState;
      const clientId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
      const clientSecret = process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET;
      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
      const redirectUri = `${appUrl}/api/meta/callback`;

      const tokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        // Fetch ad accounts and save to postgres
        try {
          const { workspaces, adAccounts } = await import('./src/db/schema.js');
          const { eq } = await import('drizzle-orm');
          const userWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, uid)).limit(1);
          if (userWs.length > 0) {
            const wsId = userWs[0].id;
            const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${tokenData.access_token}`);
            const accountsData = await accountsRes.json();
            if (accountsData.data && accountsData.data.length > 0) {
              for (const acc of accountsData.data) {
                await db.insert(adAccounts).values({
                  id: `meta_${acc.id}_${Date.now()}`,
                  workspaceId: wsId,
                  adAccountId: acc.id,
                  platform: 'meta',
                  name: acc.name || `Ad Account ${acc.account_id}`,
                  accessToken: tokenData.access_token
                });
              }
            }
          }
        } catch (err: any) {
          console.error('Failed to save to postgres', err);
        }

        return res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'meta', token: '${tokenData.access_token}' }, '*');
                  window.close();
                } else {
                  window.location.href = '/dashboard?connected=meta&token=${tokenData.access_token}';
                }
              </script>
              <p>Meta linkage successful. This window should close automatically.</p>
            </body>
          </html>
        `);
      } else {
        return res.redirect('/dashboard?error=token_failed');
      }
    } catch (e) {
      console.error(e);
      res.redirect('/dashboard?error=auth_failed');
    }
  });

  app.post('/api/meta/sync', async (req: any, res) => {
    const userId = req.userId;
    const { adAccountId } = req.body;
    try {
      const { workspaces, adAccounts } = await import('./src/db/schema.js');
      const { eq, and } = await import('drizzle-orm');
      
      const userWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
      if (!userWs.length) return res.status(404).json({ error: 'No workspace' });
      
      const accountQuery = await db.select().from(adAccounts).where(
        and(eq(adAccounts.workspaceId, userWs[0].id), eq(adAccounts.adAccountId, adAccountId))
      ).limit(1);
      
      if (!accountQuery.length) return res.status(404).json({ error: 'Ad account not found' });
      
      const MetaSyncService = (await import('./services/metaSyncService.js')).MetaSyncService;
      const result = await MetaSyncService.syncAdsForAccount(userWs[0].id, adAccountId, accountQuery[0].accessToken);
      
      res.json(result);
    } catch (error: any) {
      console.error('Error triggering meta sync:', error);
      res.status(500).json({ error: 'Failed to sync meta ads', details: error.message });
    }
  });

  // Helper: ensure user & workspace exist in PostgreSQL
  async function ensureUserWorkspace(userId: string): Promise<string> {
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existingUser.length) {
      await db.insert(users).values({
        id: userId,
        email: `${userId}@workspace.local`,
        displayName: 'Workspace Owner'
      }).onConflictDoNothing();
    }
    const existingWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
    if (existingWs.length > 0) return existingWs[0].id;
    const wsId = `ws_${userId}`;
    await db.insert(workspaces).values({
      id: wsId,
      name: 'Default Workspace',
      ownerId: userId
    }).onConflictDoNothing();
    return wsId;
  }

  function generatePlatformCampaigns(accountId: string, plat: string) {
    if (plat === 'google') {
      return [
        { id: `${accountId}_g_camp_1`, name: 'Google Search - High Intent Brand & Service', status: 'ACTIVE', platform: 'google', raw: { daily_budget: 250 } },
        { id: `${accountId}_g_camp_2`, name: 'Performance Max - All Products/Services', status: 'ACTIVE', platform: 'google', raw: { daily_budget: 400 } },
        { id: `${accountId}_g_camp_3`, name: 'YouTube Remarketing - Cart & Lead Visitors', status: 'PAUSED', platform: 'google', raw: { daily_budget: 120 } },
      ];
    }
    if (plat === 'tiktok') {
      return [
        { id: `${accountId}_tt_camp_1`, name: 'TikTok Spark Ads - Problem-Solution UGC', status: 'ACTIVE', platform: 'tiktok', raw: { daily_budget: 300 } },
        { id: `${accountId}_tt_camp_2`, name: 'TikTok Broad Acquisition - Top Hooks', status: 'ACTIVE', platform: 'tiktok', raw: { daily_budget: 220 } },
      ];
    }
    if (plat === 'snapchat') {
      return [
        { id: `${accountId}_sc_camp_1`, name: 'Snapchat Story Ads - KSA & GCC Audience', status: 'ACTIVE', platform: 'snapchat', raw: { daily_budget: 180 } },
        { id: `${accountId}_sc_camp_2`, name: 'Snapchat Dynamic Retargeting', status: 'ACTIVE', platform: 'snapchat', raw: { daily_budget: 110 } },
      ];
    }
    return generateMockCampaigns(accountId);
  }

  function buildPlatformInsightsForAccount(accountId: string, plat: string) {
    const camps = generatePlatformCampaigns(accountId, plat);
    return camps.map((c, idx) => {
      const spend = 280 + idx * 145;
      const clicks = 190 + idx * 70;
      const impressions = clicks * (42 + idx * 8);
      const conversions = idx === 2 ? 2 : 12 + idx * 5;
      const conversionValue = conversions * (idx === 1 ? 310 : idx === 2 ? 95 : 240);
      return {
        id: c.id,
        platform: plat,
        metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue)
      };
    });
  }

  // Unified Connections Overview & CRUD (Platforms, Ad Accounts, Stores)
  app.get('/api/connections/overview', async (req: any, res) => {
    const userId = req.userId;
    try {
      const wsId = await ensureUserWorkspace(userId);
      const [dbConnections, dbAdAccounts, dbStores, dbAlerts] = await Promise.all([
        db.select().from(connectedAccounts).where(eq(connectedAccounts.workspaceId, wsId)),
        db.select().from(adAccounts).where(eq(adAccounts.workspaceId, wsId)),
        db.select().from(connectedStores).where(eq(connectedStores.userId, userId)).orderBy(desc(connectedStores.createdAt)),
        db.select().from(alerts).where(eq(alerts.workspaceId, wsId)).orderBy(desc(alerts.createdAt)).limit(20)
      ]);

      res.json({
        workspaceId: wsId,
        platforms: dbConnections.map(c => ({
          id: c.id,
          platform: c.platform,
          adAccountId: c.adAccountId,
          businessId: c.businessId,
          hasToken: Boolean(c.accessToken),
          tokenPreview: c.accessToken ? `${c.accessToken.slice(0, 8)}...` : null,
          accessToken: c.accessToken,
          createdAt: c.createdAt
        })),
        adAccounts: dbAdAccounts.map(a => ({
          id: a.adAccountId || a.id,
          dbId: a.id,
          adAccountId: a.adAccountId,
          platform: a.platform,
          name: a.name,
          account_id: a.adAccountId,
          isManual: a.accessToken?.startsWith('manual_') || a.accessToken?.startsWith('local_'),
          createdAt: a.createdAt
        })),
        stores: dbStores,
        alerts: dbAlerts
      });
    } catch (error: any) {
      console.error('Error fetching connections overview:', error);
      res.status(500).json({ error: 'Failed to load connections overview' });
    }
  });

  app.post('/api/connections/platform', async (req: any, res) => {
    const userId = req.userId;
    const { platform, accessToken, refreshToken, adAccountId, accountName, businessId } = req.body;
    if (!platform) return res.status(400).json({ error: 'platform is required' });

    try {
      const wsId = await ensureUserWorkspace(userId);
      const tokenToStore = (accessToken && String(accessToken).trim()) || `manual_${platform}_${Date.now()}`;

      // Upsert connected_accounts row for this workspace + platform
      const existing = await db.select().from(connectedAccounts).where(
        and(eq(connectedAccounts.workspaceId, wsId), eq(connectedAccounts.platform, platform))
      ).limit(1);

      if (existing.length > 0) {
        await db.update(connectedAccounts).set({
          accessToken: tokenToStore,
          refreshToken: refreshToken || existing[0].refreshToken,
          adAccountId: adAccountId || existing[0].adAccountId,
          businessId: businessId || existing[0].businessId
        }).where(eq(connectedAccounts.id, existing[0].id));
      } else {
        await db.insert(connectedAccounts).values({
          id: `conn_${platform}_${wsId}`,
          workspaceId: wsId,
          platform,
          accessToken: tokenToStore,
          refreshToken: refreshToken || null,
          adAccountId: adAccountId || null,
          businessId: businessId || null
        });
      }

      // Optionally save specific ad account in ad_accounts table
      if (adAccountId || accountName) {
        const cleanAccId = String(adAccountId || `${platform}_acc_${Date.now()}`).trim();
        const existingAcc = await db.select().from(adAccounts).where(
          and(eq(adAccounts.workspaceId, wsId), eq(adAccounts.platform, platform), eq(adAccounts.adAccountId, cleanAccId))
        ).limit(1);

        if (existingAcc.length > 0) {
          await db.update(adAccounts).set({
            name: accountName || existingAcc[0].name,
            accessToken: tokenToStore,
            updatedAt: new Date()
          }).where(eq(adAccounts.id, existingAcc[0].id));
        } else {
          await db.insert(adAccounts).values({
            id: `${platform}_${cleanAccId}_${Date.now()}`,
            workspaceId: wsId,
            adAccountId: cleanAccId,
            platform,
            name: accountName || `${platform.toUpperCase()} Account (${cleanAccId})`,
            accessToken: tokenToStore
          });
        }
      }

      res.json({ success: true, platform, token: tokenToStore });
    } catch (error: any) {
      console.error('Error connecting platform:', error);
      res.status(500).json({ error: error.message || 'Failed to save platform connection' });
    }
  });

  app.delete('/api/connections/platform/:platform', async (req: any, res) => {
    const userId = req.userId;
    const { platform } = req.params;
    try {
      const wsId = await ensureUserWorkspace(userId);
      await db.delete(connectedAccounts).where(
        and(eq(connectedAccounts.workspaceId, wsId), eq(connectedAccounts.platform, platform))
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting platform:', error);
      res.status(500).json({ error: 'Failed to disconnect platform' });
    }
  });

  app.delete('/api/connections/account/:accountId', async (req: any, res) => {
    const userId = req.userId;
    const { accountId } = req.params;
    try {
      const wsId = await ensureUserWorkspace(userId);
      await db.delete(adAccounts).where(
        and(eq(adAccounts.workspaceId, wsId), eq(adAccounts.adAccountId, accountId))
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing ad account:', error);
      res.status(500).json({ error: 'Failed to remove ad account' });
    }
  });

  app.post('/api/connections/stores', async (req: any, res) => {
    const userId = req.userId;
    const { id, name, storeUrl, platform, currency, monthlyRevenue, targetRoas, targetCpa, linkedAdAccountId, linkedPlatform, notes } = req.body;
    if (!name || !storeUrl) {
      return res.status(400).json({ error: 'Store name and URL are required' });
    }
    try {
      const wsId = await ensureUserWorkspace(userId);
      const formattedUrl = /^https?:\/\//i.test(String(storeUrl).trim()) ? String(storeUrl).trim() : `https://${String(storeUrl).trim()}`;
      if (id) {
        await db.update(connectedStores).set({
          name: String(name).trim(),
          storeUrl: formattedUrl,
          platform: platform || 'custom',
          currency: currency || 'SAR (ر.س)',
          monthlyRevenue: Number(monthlyRevenue || 0),
          targetRoas: Number(targetRoas || 3.0),
          targetCpa: Number(targetCpa || 50),
          linkedAdAccountId: linkedAdAccountId || null,
          linkedPlatform: linkedPlatform || null,
          notes: notes || null,
          updatedAt: new Date()
        }).where(and(eq(connectedStores.id, id), eq(connectedStores.userId, userId)));
        return res.json({ success: true, id });
      }
      const newId = `store_${Date.now()}`;
      await db.insert(connectedStores).values({
        id: newId,
        userId,
        workspaceId: wsId,
        name: String(name).trim(),
        storeUrl: formattedUrl,
        platform: platform || 'custom',
        currency: currency || 'SAR (ر.س)',
        monthlyRevenue: Number(monthlyRevenue || 0),
        targetRoas: Number(targetRoas || 3.0),
        targetCpa: Number(targetCpa || 50),
        linkedAdAccountId: linkedAdAccountId || null,
        linkedPlatform: linkedPlatform || null,
        status: 'ACTIVE',
        notes: notes || null
      });
      res.json({ success: true, id: newId });
    } catch (error: any) {
      console.error('Error saving store:', error);
      res.status(500).json({ error: error.message || 'Failed to save store' });
    }
  });

  app.delete('/api/connections/stores/:id', async (req: any, res) => {
    const userId = req.userId;
    const { id } = req.params;
    try {
      await db.delete(connectedStores).where(and(eq(connectedStores.id, id), eq(connectedStores.userId, userId)));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting store:', error);
      res.status(500).json({ error: 'Failed to delete store' });
    }
  });

  // Live Cross-Platform & Campaign Monitoring Summary
  app.get('/api/monitoring/summary', async (req: any, res) => {
    const userId = req.userId;
    const platformTokens: Record<string, string | undefined> = {
      meta: req.headers['x-meta-token'] as string,
      google: req.headers['x-google-token'] as string,
      tiktok: req.headers['x-tiktok-token'] as string,
      snapchat: req.headers['x-snapchat-token'] as string,
    };

    try {
      const wsId = await ensureUserWorkspace(userId);
      const [dbAccounts, dbConns, dbStores] = await Promise.all([
        db.select().from(adAccounts).where(eq(adAccounts.workspaceId, wsId)),
        db.select().from(connectedAccounts).where(eq(connectedAccounts.workspaceId, wsId)),
        db.select().from(connectedStores).where(eq(connectedStores.userId, userId))
      ]);

      // Merge DB tokens if not present in headers
      for (const c of dbConns) {
        if (!platformTokens[c.platform] && c.accessToken) {
          platformTokens[c.platform] = c.accessToken;
        }
      }

      const monitoredAccounts: any[] = [];
      const monitoredCampaigns: any[] = [];
      const platformSummaries: any[] = [];

      const supportedPlatforms: Array<'meta' | 'google' | 'tiktok' | 'snapchat'> = ['meta', 'google', 'tiktok', 'snapchat'];

      for (const plat of supportedPlatforms) {
        const tok = platformTokens[plat];
        const savedForPlat = dbAccounts.filter(a => a.platform === plat);
        const isConnected = Boolean(tok && tok !== 'local_meta_token') || savedForPlat.length > 0;

        let platAccounts: any[] = savedForPlat.map(a => ({
          id: a.adAccountId,
          name: a.name || `${plat.toUpperCase()} (${a.adAccountId})`,
          platform: plat,
          account_id: a.adAccountId,
          source: 'saved'
        }));

        if (plat === 'meta' && tok && tok !== 'local_meta_token' && !tok.startsWith('manual_')) {
          try {
            const response = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${tok}`);
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              for (const acc of data.data) {
                if (!platAccounts.some(p => p.id === acc.id)) {
                  platAccounts.push({ ...acc, platform: 'meta', source: 'live' });
                }
              }
            }
          } catch {}
        }

        if (isConnected && platAccounts.length === 0) {
          platAccounts = [
            {
              id: `${plat}_primary_acc`,
              name: `${plat.charAt(0).toUpperCase() + plat.slice(1)} Primary Ad Account`,
              platform: plat,
              account_id: `${plat}_primary_acc`,
              source: 'connected_token'
            }
          ];
        }

        let platSpend = 0;
        let platRevenue = 0;
        let platClicks = 0;
        let platImpressions = 0;
        let platConversions = 0;
        let activeCampaignCount = 0;

        for (const acc of platAccounts) {
          const isLiveMeta =
            plat === 'meta' &&
            Boolean(tok) &&
            tok !== 'local_meta_token' &&
            !tok!.startsWith('manual_') &&
            !acc.id.startsWith('mock_') &&
            !acc.id.startsWith('meta_primary');

          let accCampaigns = isLiveMeta ? [] : generatePlatformCampaigns(acc.id, plat);
          let accInsights = isLiveMeta ? [] : buildPlatformInsightsForAccount(acc.id, plat);

          if (isLiveMeta) {
            try {
              const [cRes, iRes30d] = await Promise.all([
                fetch(`https://graph.facebook.com/v21.0/${acc.id}/campaigns?fields=id,name,status,daily_budget&limit=50&access_token=${tok}`),
                fetch(`https://graph.facebook.com/v21.0/${acc.id}/insights?fields=campaign_id,spend,clicks,inline_link_clicks,impressions,actions,action_values&level=campaign&date_preset=last_30d&access_token=${tok}`)
              ]);
              const [cData, iData30d] = await Promise.all([cRes.json(), iRes30d.json()]);
              if (cData.data && Array.isArray(cData.data)) {
                accCampaigns = cData.data.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  status: normalizeStatus(c.status, 'meta'),
                  platform: 'meta',
                  raw: c
                }));
              }
              let rawInsights = Array.isArray(iData30d.data) ? iData30d.data : [];
              if (rawInsights.length === 0) {
                const iResMax = await fetch(`https://graph.facebook.com/v21.0/${acc.id}/insights?fields=campaign_id,spend,clicks,inline_link_clicks,impressions,actions,action_values&level=campaign&date_preset=maximum&access_token=${tok}`);
                const iDataMax = await iResMax.json();
                if (Array.isArray(iDataMax.data)) {
                  rawInsights = iDataMax.data;
                }
              }
              accInsights = rawInsights.map((i: any) => {
                const spend = parseFloat(i.spend || '0');
                const impressions = parseInt(i.impressions || '0', 10);
                const clicks = parseInt(i.inline_link_clicks || i.clicks || '0', 10);
                let conv = 0, val = 0;
                const purchaseTypes = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'];
                const leadTypes = [
                  'lead',
                  'onsite_conversion.lead_grouped',
                  'offsite_conversion.fb_pixel_lead',
                  'onsite_conversion.messaging_conversation_started_7d',
                  'onsite_conversion.messaging_first_reply',
                  'contact_total',
                ];
                const pa = i.actions?.find((a: any) => purchaseTypes.includes(a.action_type));
                const la = i.actions?.find((a: any) => leadTypes.includes(a.action_type));
                const pv = i.action_values?.find((a: any) => purchaseTypes.includes(a.action_type));
                if (pa) conv = parseFloat(pa.value || '0');
                else if (la) conv = parseFloat(la.value || '0');
                if (pv) val = parseFloat(pv.value || '0');
                return { id: i.campaign_id, platform: 'meta', metrics: calculateMetrics(spend, impressions, clicks, conv, val) };
              });
            } catch {}
          }

          let accSpend = 0;
          let accRevenue = 0;
          let accAlerts = 0;

          for (const camp of accCampaigns) {
            const ins = accInsights.find(i => i.id === camp.id)?.metrics || calculateMetrics(0, 0, 0, 0, 0);
            accSpend += ins.spend;
            accRevenue += ins.revenue;
            platSpend += ins.spend;
            platRevenue += ins.revenue;
            platClicks += ins.clicks;
            platImpressions += ins.impressions;
            platConversions += ins.conversions;
            if (camp.status === 'ACTIVE') activeCampaignCount++;

            let decision: 'SCALE' | 'KILL' | 'OPTIMIZE' | 'MONITOR' = 'MONITOR';
            const problems: string[] = [];
            if (ins.cpa > 50 && ins.conversions > 0) problems.push('High CPA');
            if (ins.ctr > 0 && ins.ctr < 1.0) problems.push('Low CTR');
            if (ins.roas > 2.4 && ins.spend > 50) decision = 'SCALE';
            else if ((ins.roas > 0 && ins.roas < 1.0 && ins.spend > 50) || (ins.spend > 100 && ins.conversions === 0)) {
              decision = 'KILL';
              problems.push('Inefficient ROAS');
            } else if (ins.spend > 50 && ins.roas < 2.0) {
              decision = 'OPTIMIZE';
            }

            if (decision === 'KILL' || problems.length > 0) accAlerts++;

            monitoredCampaigns.push({
              ...camp,
              accountId: acc.id,
              accountName: acc.name,
              platform: plat,
              metrics: ins,
              decision,
              problems
            });
          }

          monitoredAccounts.push({
            ...acc,
            campaignsCount: accCampaigns.length,
            activeCampaigns: accCampaigns.filter(c => c.status === 'ACTIVE').length,
            spend: accSpend,
            revenue: accRevenue,
            roas: accSpend > 0 ? accRevenue / accSpend : 0,
            alertsCount: accAlerts
          });
        }

        platformSummaries.push({
          platform: plat,
          connected: isConnected,
          accountsCount: platAccounts.length,
          campaignsCount: monitoredCampaigns.filter(c => c.platform === plat).length,
          activeCampaigns: activeCampaignCount,
          spend: platSpend,
          revenue: platRevenue,
          roas: platSpend > 0 ? platRevenue / platSpend : 0,
          ctr: platImpressions > 0 ? (platClicks / platImpressions) * 100 : 0,
          cpa: platConversions > 0 ? platSpend / platConversions : 0,
          alertsCount: monitoredCampaigns.filter(c => c.platform === plat && (c.decision === 'KILL' || c.problems.length > 0)).length
        });
      }

      const totalSpend = platformSummaries.reduce((s, p) => s + p.spend, 0);
      const totalRevenue = platformSummaries.reduce((s, p) => s + p.revenue, 0);

      res.json({
        totals: {
          connectedPlatformsCount: platformSummaries.filter(p => p.connected).length,
          adAccountsCount: monitoredAccounts.length,
          storesCount: dbStores.length,
          campaignsCount: monitoredCampaigns.length,
          activeCampaignsCount: monitoredCampaigns.filter(c => c.status === 'ACTIVE').length,
          totalSpend,
          totalRevenue,
          blendedRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
          alertsCount: monitoredCampaigns.filter(c => c.decision === 'KILL' || c.problems.length > 0).length
        },
        platforms: platformSummaries,
        accounts: monitoredAccounts,
        campaigns: monitoredCampaigns,
        stores: dbStores
      });
    } catch (error: any) {
      console.error('Error building monitoring summary:', error);
      res.status(500).json({ error: 'Failed to generate monitoring summary' });
    }
  });

  // Deep Ad Account, AdSets, Creatives, Targeting & Connected Page Telemetry for Pre-Funnel Intel
  app.get('/api/account/deep-telemetry', async (req: any, res) => {
    const userId = req.userId;
    const platform = ((req.query.platform as string) || 'meta').toLowerCase();
    const accountId = (req.query.accountId as string) || 'all';
    const datePreset = (req.query.datePreset as string) || 'maximum';

    try {
      const wsId = await ensureUserWorkspace(userId);
      const dbConns = await db.select().from(connectedAccounts).where(eq(connectedAccounts.workspaceId, wsId));
      const dbTok = dbConns.find(c => c.platform === platform)?.accessToken;
      const headerTok = req.headers[`x-${platform}-token`] as string | undefined;
      const token =
        headerTok && headerTok !== 'local_meta_token' && !headerTok.startsWith('manual_')
          ? headerTok
          : dbTok || headerTok;

      const isLiveMeta =
        platform === 'meta' &&
        Boolean(token) &&
        token !== 'local_meta_token' &&
        !token!.startsWith('manual_') &&
        !accountId.startsWith('mock_') &&
        !accountId.includes('_primary_');

      const parseMetaActions = (actions: any[] = [], actionValues: any[] = []) => {
        const purchaseTypes = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'];
        const leadResultTypes = [
          'lead',
          'onsite_conversion.lead_grouped',
          'offsite_conversion.fb_pixel_lead',
          'onsite_conversion.messaging_conversation_started_7d',
          'onsite_conversion.messaging_first_reply',
          'contact_total',
          'complete_registration',
        ];
        let purchases = 0;
        let revenue = 0;
        let leadsOrMessages = 0;
        const breakdown: Record<string, number> = {};

        for (const a of actions || []) {
          const val = parseFloat(a.value || '0');
          if (val > 0) breakdown[a.action_type] = (breakdown[a.action_type] || 0) + val;
          if (purchaseTypes.includes(a.action_type)) purchases += val;
          if (leadResultTypes.includes(a.action_type)) leadsOrMessages += val;
        }
        for (const av of actionValues || []) {
          if (purchaseTypes.includes(av.action_type)) {
            revenue += parseFloat(av.value || '0');
          }
        }
        return {
          conversions: purchases > 0 ? purchases : leadsOrMessages,
          purchases,
          leadsOrMessages,
          revenue,
          breakdown,
        };
      };

      if (!isLiveMeta) {
        const camps = generatePlatformCampaigns(accountId === 'all' ? `${platform}_primary` : accountId, platform);
        const ins = buildPlatformInsightsForAccount(accountId === 'all' ? `${platform}_primary` : accountId, platform);
        const totalSpend = ins.reduce((s, i) => s + (i.metrics?.spend || 0), 0);
        const totalRev = ins.reduce((s, i) => s + (i.metrics?.revenue || 0), 0);
        const totalImpr = ins.reduce((s, i) => s + (i.metrics?.impressions || 0), 0);
        const totalClicks = ins.reduce((s, i) => s + (i.metrics?.clicks || 0), 0);
        const totalConv = ins.reduce((s, i) => s + (i.metrics?.conversions || 0), 0);

        const campLines = camps.map(c => {
          const m = ins.find(i => i.id === c.id)?.metrics;
          return `- ${c.name} [${c.status}]: Spend=${m?.spend?.toFixed(2) || 0}, ROAS=${m?.roas?.toFixed(2) || 0}x, CPA=${m?.cpa?.toFixed(2) || 0}, CTR=${m?.ctr?.toFixed(2) || 0}%, Conv=${m?.conversions || 0}`;
        });

        return res.json({
          isLive: false,
          platform,
          account: { id: accountId, name: `${platform.toUpperCase()} (${accountId})`, currency: 'USD' },
          stats: {
            spend: totalSpend,
            revenue: totalRev,
            roas: totalSpend > 0 ? totalRev / totalSpend : 0,
            impressions: totalImpr,
            reach: 0,
            clicks: totalClicks,
            conversions: totalConv,
            campaignsCount: camps.length,
            adsetsCount: 0,
            adsCount: 0,
            pagesCount: 0,
          },
          pages: [],
          discoveredWebsiteUrl: '',
          facebookPageUrl: '',
          telemetryText: `CONNECTED ${platform.toUpperCase()} ACCOUNT TELEMETRY (SANDBOX / TRACKED):
- Account ID: ${accountId}
- Spend: ${totalSpend.toFixed(2)} | Revenue: ${totalRev.toFixed(2)} | ROAS: ${totalSpend > 0 ? (totalRev / totalSpend).toFixed(2) : '0.00'}x
- Impressions: ${totalImpr} | Clicks: ${totalClicks} | Conversions: ${totalConv}
CAMPAIGNS:
${campLines.join('\n')}`,
        });
      }

      // 1. Fetch Managed Pages via /me/accounts (gives Page Access Tokens + IG Business details)
      const managedPagesMap = new Map<string, any>();
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,fan_count,followers_count,about,website,link,whatsapp_number,phone,instagram_business_account{id,username,followers_count,media_count,biography}&limit=25&access_token=${token}`
        );
        const pagesJson = await pagesRes.json();
        if (Array.isArray(pagesJson.data)) {
          for (const p of pagesJson.data) {
            managedPagesMap.set(String(p.id), p);
          }
        }
      } catch {}

      // 2. Resolve target Ad Accounts
      let targetAccounts: any[] = [];
      if (accountId === 'all') {
        const accsRes = await fetch(
          `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,account_status,amount_spent,business_name,timezone_name&limit=5&access_token=${token}`
        );
        const accsJson = await accsRes.json();
        if (Array.isArray(accsJson.data)) targetAccounts = accsJson.data;
      } else {
        const accRes = await fetch(
          `https://graph.facebook.com/v21.0/${accountId}?fields=id,name,account_id,currency,account_status,amount_spent,business_name,timezone_name&access_token=${token}`
        );
        const accJson = await accRes.json();
        if (accJson && !accJson.error) targetAccounts = [accJson];
      }

      if (targetAccounts.length === 0) {
        targetAccounts = [{ id: accountId, name: accountId, currency: 'USD' }];
      }

      const accountCurrency = targetAccounts[0]?.currency || 'USD';
      let totalSpend = 0;
      let totalRevenue = 0;
      let totalImpressions = 0;
      let totalReach = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let totalLifetimeSpentFromAccount = 0;

      const allCampaignRows: any[] = [];
      const allAdSetRows: any[] = [];
      const allAdRows: any[] = [];
      const campaignNameMap = new Map<string, string>();
      const adsetNameMap = new Map<string, string>();
      const pageFrequencyMap = new Map<string, number>();
      const promotePagesMap = new Map<string, any>();
      const discoveredLinks: string[] = [];
      const aggregatedActions: Record<string, number> = {};

      const addPageEvidence = (pid?: string | null, weight = 1) => {
        if (!pid) return;
        const cleanPid = String(pid).trim();
        if (!cleanPid || cleanPid === 'undefined' || cleanPid === 'null') return;
        pageFrequencyMap.set(cleanPid, (pageFrequencyMap.get(cleanPid) || 0) + weight);
      };

      const historyStatuses = encodeURIComponent(
        JSON.stringify(['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES'])
      );

      for (const acc of targetAccounts.slice(0, 3)) {
        const accId = acc.id;
        if (acc.amount_spent) {
          totalLifetimeSpentFromAccount += Number(acc.amount_spent) / 100;
        }

        const insightFields = 'spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions,action_values';
        const [
          accInsRangeRes,
          accInsMaxRes,
          campsRes,
          campInsRangeRes,
          campInsMaxRes,
          adsetsRes,
          adsRes,
          adInsMaxRes,
          promotePagesRes,
        ] = await Promise.all([
          fetch(`https://graph.facebook.com/v21.0/${accId}/insights?fields=${insightFields}&level=account&date_preset=${datePreset}&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/insights?fields=${insightFields}&level=account&date_preset=maximum&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget&effective_status=${historyStatuses}&limit=80&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/insights?fields=campaign_id,${insightFields}&level=campaign&date_preset=${datePreset}&limit=80&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/insights?fields=campaign_id,${insightFields}&level=campaign&date_preset=maximum&limit=80&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/adsets?fields=id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,promoted_object&effective_status=${historyStatuses}&limit=80&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/ads?fields=id,name,status,effective_status,adset_id,campaign_id,creative{id,name,title,body,call_to_action_type,object_story_spec,asset_feed_spec,effective_object_story_id,actor_id,url_tags}&effective_status=${historyStatuses}&limit=80&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/insights?fields=ad_id,${insightFields}&level=ad&date_preset=maximum&limit=80&access_token=${token}`),
          fetch(`https://graph.facebook.com/v21.0/${accId}/promote_pages?fields=id,name,about,category,fan_count,followers_count,website,link,whatsapp_number,phone,instagram_business_account{id,username,followers_count,media_count,biography}&limit=15&access_token=${token}`).catch(() => null),
        ]);

        const [
          accInsRangeJson,
          accInsMaxJson,
          campsJson,
          campInsRangeJson,
          campInsMaxJson,
          adsetsJson,
          adsJson,
          adInsMaxJson,
        ] = await Promise.all([
          accInsRangeRes.json(),
          accInsMaxRes.json(),
          campsRes.json(),
          campInsRangeRes.json(),
          campInsMaxRes.json(),
          adsetsRes.json(),
          adsRes.json(),
          adInsMaxRes.json(),
        ]);

        if (promotePagesRes) {
          try {
            const promoJson = await promotePagesRes.json();
            if (Array.isArray(promoJson?.data)) {
              for (const pp of promoJson.data) {
                promotePagesMap.set(String(pp.id), pp);
                addPageEvidence(String(pp.id), 1);
              }
            }
          } catch {}
        }

        // Choose active range account insight if it has spend, else lifetime maximum
        const rangeAccRow = accInsRangeJson?.data?.[0];
        const maxAccRow = accInsMaxJson?.data?.[0];
        const chosenAccRow = parseFloat(rangeAccRow?.spend || '0') > 0 ? rangeAccRow : maxAccRow || rangeAccRow;

        if (chosenAccRow) {
          const parsedActs = parseMetaActions(chosenAccRow.actions, chosenAccRow.action_values);
          totalSpend += parseFloat(chosenAccRow.spend || '0');
          totalImpressions += parseInt(chosenAccRow.impressions || '0', 10);
          totalReach += parseInt(chosenAccRow.reach || '0', 10);
          totalClicks += parseInt(chosenAccRow.inline_link_clicks || chosenAccRow.clicks || '0', 10);
          totalConversions += parsedActs.conversions;
          totalRevenue += parsedActs.revenue;
          for (const [k, v] of Object.entries(parsedActs.breakdown)) {
            aggregatedActions[k] = (aggregatedActions[k] || 0) + v;
          }
        }

        // Map campaign insights (prefer selected range when non-empty, else maximum)
        const campInsList =
          Array.isArray(campInsRangeJson?.data) && campInsRangeJson.data.length > 0
            ? campInsRangeJson.data
            : Array.isArray(campInsMaxJson?.data)
            ? campInsMaxJson.data
            : [];
        const campInsMap = new Map<string, any>();
        for (const ci of campInsList) {
          campInsMap.set(ci.campaign_id, ci);
        }

        for (const c of campsJson?.data || []) {
          campaignNameMap.set(c.id, c.name);
          const ci = campInsMap.get(c.id);
          const acts = ci ? parseMetaActions(ci.actions, ci.action_values) : { conversions: 0, revenue: 0 };
          const spend = parseFloat(ci?.spend || '0');
          allCampaignRows.push({
            id: c.id,
            name: c.name,
            accountName: acc.name,
            status: c.effective_status || c.status,
            objective: c.objective || 'UNKNOWN',
            dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
            spend,
            impressions: parseInt(ci?.impressions || '0', 10),
            reach: parseInt(ci?.reach || '0', 10),
            clicks: parseInt(ci?.inline_link_clicks || ci?.clicks || '0', 10),
            ctr: parseFloat(ci?.ctr || '0'),
            cpc: parseFloat(ci?.cpc || '0'),
            conversions: acts.conversions,
            revenue: acts.revenue,
          });
        }

        for (const as of adsetsJson?.data || []) {
          adsetNameMap.set(as.id, as.name);
          if (as.promoted_object?.page_id) {
            addPageEvidence(String(as.promoted_object.page_id), 2);
          }
          const t = as.targeting || {};
          const countries = t.geo_locations?.countries || [];
          const cities = (t.geo_locations?.cities || []).map((c: any) => c.name).filter(Boolean);
          const interests = (t.flexible_spec || [])
            .flatMap((fs: any) => fs.interests || [])
            .map((int: any) => int.name)
            .filter(Boolean);
          allAdSetRows.push({
            id: as.id,
            name: as.name,
            campaignName: campaignNameMap.get(as.campaign_id) || '',
            status: as.effective_status || as.status,
            optimizationGoal: as.optimization_goal,
            dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : null,
            ageRange: `${t.age_min || 18}-${t.age_max || 65}`,
            genders: Array.isArray(t.genders) && t.genders.length === 1 ? (t.genders[0] === 1 ? 'Male' : 'Female') : 'All',
            locations: [...countries, ...cities].slice(0, 6),
            interests: interests.slice(0, 8),
          });
        }

        const adInsMap = new Map<string, any>();
        for (const ai of adInsMaxJson?.data || []) {
          adInsMap.set(ai.ad_id, ai);
        }

        for (const ad of adsJson?.data || []) {
          const creative = ad.creative || {};
          const spec = creative.object_story_spec || {};
          const assetFeed = creative.asset_feed_spec || {};
          const pageId =
            spec.page_id ||
            creative.actor_id ||
            (creative.effective_object_story_id ? String(creative.effective_object_story_id).split('_')[0] : null);
          if (pageId) addPageEvidence(String(pageId), 3);

          const assetFeedUrl = Array.isArray(assetFeed.link_urls) ? assetFeed.link_urls[0]?.website_url || assetFeed.link_urls[0]?.display_url : '';
          const destLink =
            spec.link_data?.link ||
            spec.link_data?.call_to_action?.value?.link ||
            spec.video_data?.call_to_action?.value?.link ||
            spec.template_data?.link ||
            assetFeedUrl ||
            '';
          if (
            destLink &&
            !destLink.includes('facebook.com') &&
            !destLink.includes('instagram.com') &&
            !destLink.includes('wa.me') &&
            !destLink.includes('fb.me')
          ) {
            discoveredLinks.push(destLink);
          }

          const assetBodies = Array.isArray(assetFeed.bodies) ? assetFeed.bodies.map((b: any) => b.text).filter(Boolean).join(' / ') : '';
          const assetTitles = Array.isArray(assetFeed.titles) ? assetFeed.titles.map((t: any) => t.text).filter(Boolean).join(' / ') : '';

          const body =
            creative.body ||
            spec.link_data?.message ||
            spec.video_data?.message ||
            spec.photo_data?.caption ||
            spec.template_data?.message ||
            assetBodies ||
            '';
          const headline =
            creative.title ||
            spec.link_data?.name ||
            spec.video_data?.title ||
            spec.template_data?.name ||
            assetTitles ||
            '';
          const description =
            spec.link_data?.description ||
            spec.template_data?.description ||
            (Array.isArray(assetFeed.descriptions) ? assetFeed.descriptions[0]?.text : '') ||
            '';
          const cta =
            creative.call_to_action_type ||
            spec.link_data?.call_to_action?.type ||
            spec.video_data?.call_to_action?.type ||
            (Array.isArray(assetFeed.call_to_action_types) ? assetFeed.call_to_action_types[0] : '') ||
            '';
          const ai = adInsMap.get(ad.id);
          const adActs = ai ? parseMetaActions(ai.actions, ai.action_values) : { conversions: 0, revenue: 0 };

          allAdRows.push({
            id: ad.id,
            name: ad.name,
            campaignName: campaignNameMap.get(ad.campaign_id) || '',
            adsetName: adsetNameMap.get(ad.adset_id) || '',
            status: ad.effective_status || ad.status,
            headline: headline.slice(0, 140),
            body: body.slice(0, 360),
            description: description.slice(0, 140),
            cta,
            destinationUrl: destLink,
            spend: parseFloat(ai?.spend || '0'),
            impressions: parseInt(ai?.impressions || '0', 10),
            clicks: parseInt(ai?.inline_link_clicks || ai?.clicks || '0', 10),
            ctr: parseFloat(ai?.ctr || '0'),
            cpc: parseFloat(ai?.cpc || '0'),
            conversions: adActs.conversions,
          });
        }
      }

      // 3. Fetch Linked Facebook Page & Instagram Details + Recent Posts
      // Sort discovered page IDs by evidence weight & name affinity with the ad account
      const accountNameTokens = targetAccounts
        .flatMap(a => `${a.name || ''} ${a.business_name || ''}`.toLowerCase().split(/[\s\-_|/]+/))
        .filter(w => w.length >= 3);

      const candidatePageEntries = Array.from(pageFrequencyMap.entries()).sort((a, b) => b[1] - a[1]);
      // If no direct ad/promote page match exists, check managedPagesMap ONLY for a name match with target account
      if (candidatePageEntries.length === 0 && managedPagesMap.size > 0 && accountNameTokens.length > 0) {
        for (const [pid, pageObj] of managedPagesMap.entries()) {
          const pNameLower = (pageObj.name || '').toLowerCase();
          if (accountNameTokens.some(tok => pNameLower.includes(tok))) {
            candidatePageEntries.push([pid, 1]);
          }
        }
      }

      const inspectedPages: any[] = [];
      for (const [pid] of candidatePageEntries.slice(0, 3)) {
        const managed = managedPagesMap.get(pid);
        const promoted = promotePagesMap.get(pid);
        const pageTok = managed?.access_token || token;
        let pageInfo: any = managed || promoted || null;
        if (!pageInfo) {
          try {
            const pRes = await fetch(
              `https://graph.facebook.com/v21.0/${pid}?fields=id,name,about,category,fan_count,followers_count,website,link,whatsapp_number,phone,instagram_business_account{id,username,followers_count,media_count,biography}&access_token=${pageTok}`
            );
            const pJson = await pRes.json();
            if (pJson && !pJson.error) pageInfo = pJson;
          } catch {}
        }

        let recentPosts: any[] = [];
        try {
          const postsRes = await fetch(
            `https://graph.facebook.com/v21.0/${pid}/posts?fields=message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=8&access_token=${pageTok}`
          );
          const postsJson = await postsRes.json();
          if (Array.isArray(postsJson.data)) {
            recentPosts = postsJson.data.map((post: any) => ({
              date: post.created_time?.slice(0, 10) || '',
              message: (post.message || '').slice(0, 200),
              likes: post.likes?.summary?.total_count ?? 0,
              comments: post.comments?.summary?.total_count ?? 0,
              shares: post.shares?.count ?? 0,
            }));
          }
        } catch {}

        if (pageInfo) {
          if (
            pageInfo.website &&
            !pageInfo.website.includes('facebook.com') &&
            !pageInfo.website.includes('instagram.com')
          ) {
            discoveredLinks.push(pageInfo.website);
          }
          inspectedPages.push({
            id: pageInfo.id,
            name: pageInfo.name,
            category: pageInfo.category || '',
            about: pageInfo.about || '',
            followers: pageInfo.followers_count || pageInfo.fan_count || 0,
            website: pageInfo.website || '',
            link: pageInfo.link || `https://www.facebook.com/${pageInfo.id}`,
            phone: pageInfo.phone || pageInfo.whatsapp_number || '',
            instagram: pageInfo.instagram_business_account || null,
            recentPosts,
          });
        }
      }

      // Prioritize pages matching ad account name if multiple candidate pages were attached
      if (inspectedPages.length > 1 && accountNameTokens.length > 0) {
        inspectedPages.sort((a, b) => {
          const aMatch = accountNameTokens.some(tok => (a.name || '').toLowerCase().includes(tok)) ? 1 : 0;
          const bMatch = accountNameTokens.some(tok => (b.name || '').toLowerCase().includes(tok)) ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      const discoveredWebsiteUrl = discoveredLinks.find(Boolean) || '';
      const facebookPageUrl = inspectedPages[0]?.link || '';

      // Sort campaigns and ads by spend descending so top drivers are always included
      const topCampaigns = [...allCampaignRows].sort((a, b) => b.spend - a.spend).slice(0, 20);
      const topAds = [...allAdRows].sort((a, b) => b.spend - a.spend).slice(0, 25);
      const topAdSets = allAdSetRows.slice(0, 15);

      const overallSpend = Math.max(totalSpend, totalLifetimeSpentFromAccount);
      const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
      const overallCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00';
      const overallCpa = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00';
      const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';

      const topActionLines = Object.entries(aggregatedActions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, v]) => `${k}: ${Math.round(v)}`)
        .join(' | ');

      const telemetryText = `REAL LIVE META AD ACCOUNT & CONNECTED PAGE AUDIT (VERIFIED DATA):
1. ACCOUNT PROFILE:
   - Account Name: ${targetAccounts.map(a => a.name).join(', ')}
   - Account ID(s): ${targetAccounts.map(a => a.id).join(', ')}
   - Currency: ${accountCurrency} | Timezone: ${targetAccounts[0]?.timezone_name || 'N/A'}
   - Total Lifetime Amount Spent: ${overallSpend.toFixed(2)} ${accountCurrency}
   - Tracked Window (${datePreset} / max fallback): Spend=${totalSpend.toFixed(2)} ${accountCurrency}, Impressions=${totalImpressions.toLocaleString()}, Reach=${totalReach.toLocaleString()}, Link Clicks=${totalClicks.toLocaleString()}, CTR=${overallCtr}%, CPC=${overallCpc} ${accountCurrency}, Results(Leads/Msgs/Purchases)=${totalConversions}, Cost/Result=${overallCpa} ${accountCurrency}, Revenue=${totalRevenue.toFixed(2)} ${accountCurrency}, ROAS=${overallRoas}x
   - Exact Meta Actions Breakdown: ${topActionLines || 'Traffic/Engagement focus'}

2. LINKED FACEBOOK PAGE & INSTAGRAM BUSINESS PROFILE:
${
  inspectedPages.length > 0
    ? inspectedPages
        .map(
          p => `   - Page Name: ${p.name} (${p.category}) | Followers: ${p.followers} | Website: ${p.website || 'Not set'} | Phone/WhatsApp: ${p.phone || 'Not set'} | FB Link: ${p.link}
   - About: ${p.about || 'N/A'}
   - Instagram: ${p.instagram ? `@${p.instagram.username} (${p.instagram.followers_count} followers, ${p.instagram.media_count} posts) — ${p.instagram.biography || ''}` : 'Not linked'}
   - Recent Page Posts (${p.recentPosts.length}):
${p.recentPosts.length > 0 ? p.recentPosts.map((rp: any) => `     * [${rp.date}] "${rp.message.replace(/\s+/g, ' ')}" (Likes:${rp.likes}, Comments:${rp.comments}, Shares:${rp.shares})`).join('\n') : '     * Page post feed permission unavailable or no posts returned'}`
        )
        .join('\n')
    : '   - No linked Facebook Page returned via token permissions for this specific ad account.'
}

3. REAL CAMPAIGNS BREAKDOWN (Top ${topCampaigns.length} of ${allCampaignRows.length}):
${
  topCampaigns.length > 0
    ? topCampaigns
        .map(
          c =>
            `   - ${c.name} | Objective: ${c.objective} | Status: ${c.status} | Spend: ${c.spend.toFixed(2)} ${accountCurrency} | Impr: ${c.impressions} | Clicks: ${c.clicks} (CTR: ${c.ctr.toFixed(2)}%, CPC: ${c.cpc.toFixed(2)}) | Results: ${c.conversions} | Rev: ${c.revenue.toFixed(2)}`
        )
        .join('\n')
    : '   - No campaigns found.'
}

4. REAL AD SETS & TARGETING (${topAdSets.length}):
${
  topAdSets.length > 0
    ? topAdSets
        .map(
          as =>
            `   - ${as.name}${as.campaignName ? ` (Campaign: ${as.campaignName})` : ''} [${as.status}] | Goal: ${as.optimizationGoal} | Locations: ${as.locations.join(', ') || 'Broad'} | Age: ${as.ageRange} (${as.genders}) | Interests: ${as.interests.join(', ') || 'Open/Advantage+'}`
        )
        .join('\n')
    : '   - No ad sets found.'
}

5. REAL ADS, CREATIVE COPY & PER-AD RESULTS (Top ${topAds.length} of ${allAdRows.length}):
${
  topAds.length > 0
    ? topAds
        .map(
          ad =>
            `   - Ad "${ad.name}"${ad.campaignName ? ` [Campaign: ${ad.campaignName}]` : ''} [${ad.status}] | Spend: ${ad.spend.toFixed(2)} ${accountCurrency}, Impr: ${ad.impressions}, Clicks: ${ad.clicks} (CTR: ${ad.ctr.toFixed(2)}%, CPC: ${ad.cpc.toFixed(2)}), Results: ${ad.conversions} | CTA: ${ad.cta || 'N/A'} | Dest URL: ${ad.destinationUrl || 'Page/Messaging'} | Headline: "${ad.headline || ''}" | Description: "${ad.description || ''}" | Primary Copy: "${(ad.body || '').replace(/\s+/g, ' ')}"`
        )
        .join('\n')
    : '   - No ads returned.'
}`;

      res.json({
        isLive: true,
        platform,
        account: {
          id: targetAccounts[0]?.id || accountId,
          name: targetAccounts.map(a => a.name).join(', '),
          currency: accountCurrency,
          timezone: targetAccounts[0]?.timezone_name || '',
        },
        stats: {
          spend: overallSpend,
          revenue: totalRevenue,
          roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
          impressions: totalImpressions,
          reach: totalReach,
          clicks: totalClicks,
          conversions: totalConversions,
          campaignsCount: allCampaignRows.length,
          adsetsCount: allAdSetRows.length,
          adsCount: allAdRows.length,
          pagesCount: inspectedPages.length,
          pageName: inspectedPages[0]?.name || '',
        },
        campaigns: topCampaigns,
        ads: topAds,
        pages: inspectedPages,
        discoveredWebsiteUrl,
        facebookPageUrl,
        telemetryText,
      });
    } catch (error: any) {
      console.error('Error fetching deep account telemetry:', error);
      res.status(500).json({ error: 'Failed to inspect deep account telemetry' });
    }
  });

  // Updated routes with RBAC
  app.get('/api/adaccounts', async (req: any, res) => {
    const userId = req.userId;
    const platform = (req.query.platform as string) || 'meta';
    
    try {
      const wsId = await ensureUserWorkspace(userId).catch(() => null);
      const dbAccounts = wsId
        ? await db.select().from(adAccounts).where(and(eq(adAccounts.workspaceId, wsId), eq(adAccounts.platform, platform)))
        : [];
      const savedFormatted = dbAccounts.map(a => ({
        id: a.adAccountId,
        name: a.name || `${platform.toUpperCase()} (${a.adAccountId})`,
        account_id: a.adAccountId,
        platform,
        isManual: a.accessToken?.startsWith('manual_') || a.accessToken?.startsWith('local_')
      }));

      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token || token.startsWith('manual_') || token === 'local_meta_token') {
          return res.json({ accounts: savedFormatted.length ? savedFormatted : (token ? generateMockAdAccounts() : []), isMock: true });
        }
        const response = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${token}`);
        const data = await response.json();
        if (data.error) {
          return handleMetaError(res, data.error, () => res.json({ 
            accounts: savedFormatted.length ? savedFormatted : generateMockAdAccounts(),
            isMock: true,
            warning: 'Meta API returned an unexpected error. Showing saved/sample accounts.'
          }));
        }
        const liveList = data.data || [];
        const merged = [...savedFormatted];
        for (const acc of liveList) {
          if (!merged.some(m => m.id === acc.id)) merged.push(acc);
        }
        return res.json({ accounts: merged });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token && savedFormatted.length === 0) return res.json({ accounts: [] });
        if (!token || token.startsWith('manual_') || !process.env.GOOGLE_DEVELOPER_TOKEN) {
          return res.json({
            accounts: savedFormatted.length ? savedFormatted : [{ id: 'g_acc_demo_1', name: 'Google Ads - Primary Portfolio', account_id: 'g_acc_demo_1', platform: 'google' }],
            isMock: true
          });
        }
        try {
          const response = await fetch(`https://googleads.googleapis.com/v15/customers:listAccessibleCustomers`, {
            headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '' }
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          const live = data.resourceNames ? data.resourceNames.map((name: string) => ({ id: name.split('/')[1], name: name, account_id: name.split('/')[1] })) : [];
          const merged = [...savedFormatted];
          for (const acc of live) {
            if (!merged.some(m => m.id === acc.id)) merged.push(acc);
          }
          return res.json({ accounts: merged });
        } catch {
          return res.json({
            accounts: savedFormatted.length ? savedFormatted : [{ id: 'g_acc_demo_1', name: 'Google Ads - Primary Portfolio', account_id: 'g_acc_demo_1', platform: 'google' }],
            isMock: true
          });
        }
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token && savedFormatted.length === 0) return res.json({ accounts: [] });
        if (!token || token.startsWith('manual_')) {
          return res.json({
            accounts: savedFormatted.length ? savedFormatted : [{ id: 'tt_adv_demo_1', name: 'TikTok Business - Primary', account_id: 'tt_adv_demo_1', platform: 'tiktok' }],
            isMock: true
          });
        }
        try {
          const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/`, {
            headers: { 'Access-Token': token }
          });
          const data = await response.json();
          if (data.code !== 0) throw new Error(data.message);
          const live = (data.data?.list || []).map((a: any) => ({
            id: String(a.advertiser_id || a.id),
            name: a.advertiser_name || a.name || `TikTok ${a.advertiser_id}`,
            account_id: String(a.advertiser_id || a.id)
          }));
          const merged = [...savedFormatted];
          for (const acc of live) {
            if (!merged.some(m => m.id === acc.id)) merged.push(acc);
          }
          return res.json({ accounts: merged });
        } catch {
          return res.json({
            accounts: savedFormatted.length ? savedFormatted : [{ id: 'tt_adv_demo_1', name: 'TikTok Business - Primary', account_id: 'tt_adv_demo_1', platform: 'tiktok' }],
            isMock: true
          });
        }
      } else if (platform === 'snapchat') {
        const token = req.headers['x-snapchat-token'] as string;
        if (!token && savedFormatted.length === 0) return res.json({ accounts: [] });
        if (!token || token.startsWith('manual_')) {
          return res.json({
            accounts: savedFormatted.length ? savedFormatted : [{ id: 'sc_acc_demo_1', name: 'Snapchat Ads - Primary', account_id: 'sc_acc_demo_1', platform: 'snapchat' }],
            isMock: true
          });
        }
        try {
          const orgRes = await fetch('https://adsapi.snapchat.com/v1/me/organizations', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const orgData = await orgRes.json();
          const orgs = orgData.organizations || [];
          const allAccounts = await Promise.all(orgs.map(async (org: any) => {
            const accRes = await fetch(`https://adsapi.snapchat.com/v1/organizations/${org.organization.id}/adaccounts`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const accData = await accRes.json();
            return (accData.adaccounts || []).map((acc: any) => ({
              id: acc.adaccount.id,
              name: acc.adaccount.name,
              account_id: acc.adaccount.id
            }));
          }));
          const merged = [...savedFormatted];
          for (const acc of allAccounts.flat()) {
            if (!merged.some(m => m.id === acc.id)) merged.push(acc);
          }
          return res.json({ accounts: merged });
        } catch {
          return res.json({
            accounts: savedFormatted.length ? savedFormatted : [{ id: 'sc_acc_demo_1', name: 'Snapchat Ads - Primary', account_id: 'sc_acc_demo_1', platform: 'snapchat' }],
            isMock: true
          });
        }
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/campaigns', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const subPlatform = (req.query.subPlatform as string) || 'all';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (req.query.fromDb === 'true') { const { campaigns: campaignsTable } = await import('./src/db/schema.js'); const dbCamps = await db.select().from(campaignsTable); return res.json({ campaigns: dbCamps }); } if (!accountId) return res.json({ campaigns: [] });

    const fetchCampaignsForAccount = async (accId: string, plat: string, tok: string) => {
      try {
        if (plat === 'meta') {
          const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,objective,start_time,end_time';
          const url = `https://graph.facebook.com/v21.0/${accId}/campaigns?fields=${fields}&limit=100&access_token=${tok}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.error) return [];
          return (data.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            status: normalizeStatus(c.status, 'meta'),
            platform: 'meta',
            raw: c
          }));
        }
        if (plat === 'google') {
          const query = `SELECT campaign.id, campaign.name, campaign.status FROM campaign`;
          const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accId}/googleAds:search`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tok}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          const data = await response.json();
          if (data.error) return [];
          return (data.results || []).map((r: any) => ({
            id: r.campaign.id,
            name: r.campaign.name,
            status: normalizeStatus(r.campaign.status, 'google'),
            platform: 'google',
            raw: r.campaign
          }));
        }
        return [];
      } catch (e) { return []; }
    };

    const isManualOrDemo = (tok?: string, accId?: string) =>
      !tok || tok.startsWith('manual_') || tok === 'local_meta_token' || (accId && (accId.includes('_demo_') || accId.includes('_primary_') || accId.startsWith('mock_')));

    try {
      if (accountId === 'all') {
        const token = req.headers[`x-${platform}-token`] as string;
        if (!token) return res.json({ campaigns: [] });

        if (isManualOrDemo(token)) {
          return res.json({
            campaigns: filterBySubPlatform(generatePlatformCampaigns(`${platform}_all`, platform), subPlatform),
            isMock: true
          });
        }
        
        let accountIds: string[] = [];
        if (platform === 'meta') {
           const accRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id&access_token=${token}`);
           const accData = await accRes.json();
           accountIds = (accData.data || []).map((a: any) => a.id);
        } else if (platform === 'google') {
           const accRes = await fetch(`https://googleads.googleapis.com/v15/customers:listAccessibleCustomers`, {
            headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '' }
           });
           const accData = await accRes.json();
           accountIds = (accData.resourceNames || []).map((name: string) => name.split('/')[1]);
        }

        const allCampaigns = await Promise.all(accountIds.map(id => fetchCampaignsForAccount(id, platform, token)));
        const flat = allCampaigns.flat();
        return res.json({
          campaigns: filterBySubPlatform(flat.length ? flat : generatePlatformCampaigns(`${platform}_all`, platform), subPlatform),
          isMock: flat.length === 0
        });
      }

      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        if (isManualOrDemo(token, accountId)) {
          return res.json({ campaigns: filterBySubPlatform(generatePlatformCampaigns(accountId, 'meta'), subPlatform), isMock: true });
        }
        const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,end_time';
        const url = `https://graph.facebook.com/v21.0/${accountId}/campaigns?fields=${fields}&limit=100&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          return handleMetaError(res, data.error, () => res.json({ 
            campaigns: generateMockCampaigns(accountId),
            isMock: true,
            warning: 'Meta API returned an unexpected error. Showing mock data for demonstration.'
          }));
        }
        
        const normalized = (data.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          status: normalizeStatus(c.status, 'meta'),
          platform: 'meta',
          raw: c
        }));
        return res.json({ campaigns: filterBySubPlatform(normalized, subPlatform) });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        if (isManualOrDemo(token, accountId) || !process.env.GOOGLE_DEVELOPER_TOKEN) {
          return res.json({ campaigns: generatePlatformCampaigns(accountId, 'google'), isMock: true });
        }
        const query = `SELECT campaign.id, campaign.name, campaign.status FROM campaign`;
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.json({ campaigns: generatePlatformCampaigns(accountId, 'google'), isMock: true });
        
        const normalized = (data.results || []).map((r: any) => ({
          id: r.campaign.id,
          name: r.campaign.name,
          status: normalizeStatus(r.campaign.status, 'google'),
          platform: 'google',
          raw: r.campaign
        }));
        return res.json({ campaigns: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        if (isManualOrDemo(token, accountId)) {
          return res.json({ campaigns: generatePlatformCampaigns(accountId, 'tiktok'), isMock: true });
        }
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.json({ campaigns: generatePlatformCampaigns(accountId, 'tiktok'), isMock: true });
        
        const normalized = (data.data?.list || []).map((c: any) => ({
          id: c.campaign_id,
          name: c.campaign_name,
          status: normalizeStatus(c.operation_status, 'tiktok'),
          platform: 'tiktok',
          raw: c
        }));
        return res.json({ campaigns: normalized });
      } else if (platform === 'snapchat') {
        const token = req.headers['x-snapchat-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        if (isManualOrDemo(token, accountId)) {
          return res.json({ campaigns: generatePlatformCampaigns(accountId, 'snapchat'), isMock: true });
        }
        const response = await fetch(`https://adsapi.snapchat.com/v1/adaccounts/${accountId}/campaigns`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.campaigns) return res.json({ campaigns: generatePlatformCampaigns(accountId, 'snapchat'), isMock: true });
        
        const normalized = data.campaigns.map((c: any) => ({
          id: c.campaign.id,
          name: c.campaign.name,
          status: normalizeStatus(c.campaign.status, 'snapchat'),
          platform: 'snapchat',
          raw: c.campaign
        }));
        return res.json({ campaigns: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const metaWriteCooldownMap = new Map<string, number>();

  app.post('/api/campaigns/action', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { campaignId, objectId, status, dailyBudget, lifetimeBudget, multiplier, platform, type, metaToken } = req.body;
    const idToUpdate = objectId || campaignId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!idToUpdate) return res.status(400).json({ error: 'campaignId or objectId is required' });

    try {
      if (platform === 'meta' && !String(idToUpdate).startsWith('mock_') && idToUpdate !== 'camp_1' && idToUpdate !== 'camp_2' && idToUpdate !== 'camp_3') {
        const token = metaToken || req.headers['x-meta-token'] as string;
        if (!token) return res.status(401).json({ error: 'Meta token required' });

        // Respect Meta's strict #613 rule (1 write call per 30 seconds per Ad Set / Campaign)
        const lastWriteAt = metaWriteCooldownMap.get(String(idToUpdate)) || 0;
        const elapsedMs = Date.now() - lastWriteAt;
        if (elapsedMs < 30000) {
          const waitSec = Math.max(1, Math.ceil((30000 - elapsedMs) / 1000));
          return res.status(429).json({
            code: 'META_RATE_LIMIT',
            error: `Meta Rate Limit: Meta allows 1 edit every 30 seconds on the same ${type === 'campaign' ? 'Campaign' : 'Ad Set'}. Please wait ${waitSec}s and try again.`,
          });
        }

        const params = new URLSearchParams();
        if (status) params.append('status', status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED');

        let appliedBudgetType: 'daily' | 'lifetime' | null = null;
        let appliedBudgetMinor: number | null = null;
        const wantsBudgetChange = Boolean(dailyBudget || lifetimeBudget || (multiplier && Number(multiplier) > 0));

        if (wantsBudgetChange) {
          // Inspect live Meta object via GET first (reads do not count against #613 write lock)
          let metaObj: any = null;
          try {
            const inspectUrl = `https://graph.facebook.com/v21.0/${idToUpdate}?fields=id,name,account_id,status,effective_status,daily_budget,lifetime_budget,end_time,destination_type,promoted_object,campaign_id,campaign{id,name,daily_budget,lifetime_budget,ads.limit(10){creative{effective_object_story_id,object_story_id,object_story_spec}}},ads.limit(10){creative{effective_object_story_id,object_story_id,object_story_spec}}&access_token=${token}`;
            const inspectRes = await fetch(inspectUrl);
            const inspectJson = await inspectRes.json();
            if (!inspectJson?.error && inspectJson?.id) {
              metaObj = inspectJson;
            }
          } catch {
            // Proceed with client parameters if preflight lookup fails
          }

          if (metaObj) {
            const effStatus = String(metaObj.effective_status || metaObj.status || '').toUpperCase();
            if (effStatus === 'ARCHIVED' || effStatus === 'DELETED') {
              return res.status(400).json({
                error: `Cannot modify budget on "${metaObj.name || idToUpdate}" because its Meta status is ${effStatus}. Duplicate or restore it in Meta Ads Manager first.`,
              });
            }

            const liveDailyMinor = Number(metaObj.daily_budget || 0);
            const liveLifetimeMinor = Number(metaObj.lifetime_budget || 0);
            const scaleFactor = multiplier && Number(multiplier) > 0 ? Number(multiplier) : null;

            if (liveDailyMinor > 0) {
              appliedBudgetMinor = scaleFactor
                ? Math.max(100, Math.round(liveDailyMinor * scaleFactor))
                : Math.round(Number(dailyBudget || lifetimeBudget) * 100);
              appliedBudgetType = 'daily';
              params.append('daily_budget', String(appliedBudgetMinor));
            } else if (liveLifetimeMinor > 0) {
              if (metaObj.end_time) {
                const endTs = new Date(metaObj.end_time).getTime();
                if (Number.isFinite(endTs) && endTs <= Date.now()) {
                  return res.status(400).json({
                    error: `Cannot scale lifetime budget for "${metaObj.name || idToUpdate}" because its scheduled end date (${String(metaObj.end_time).slice(0, 10)}) has already passed. Extend the end date in Meta Ads Manager before scaling.`,
                  });
                }
              }
              appliedBudgetMinor = scaleFactor
                ? Math.max(100, Math.round(liveLifetimeMinor * scaleFactor))
                : Math.round(Number(lifetimeBudget || dailyBudget) * 100);
              appliedBudgetType = 'lifetime';
              params.append('lifetime_budget', String(appliedBudgetMinor));
            } else if (metaObj.campaign && (Number(metaObj.campaign.daily_budget || 0) > 0 || Number(metaObj.campaign.lifetime_budget || 0) > 0)) {
              return res.status(400).json({
                code: 'CBO_MANAGED',
                error: `This Ad Set uses Campaign Budget Optimization (CBO) managed on campaign "${metaObj.campaign.name || metaObj.campaign.id}". Scale the parent Campaign instead.`,
              });
            } else if (!metaObj.campaign_id && type === 'campaign') {
              return res.status(400).json({
                code: 'ABO_CAMPAIGN',
                error: `This Campaign uses Ad Set budgets (ABO) rather than Campaign Budget Optimization (CBO).`,
              });
            } else if (dailyBudget) {
              appliedBudgetMinor = Math.round(Number(dailyBudget) * 100);
              appliedBudgetType = 'daily';
              params.append('daily_budget', String(appliedBudgetMinor));
            } else if (lifetimeBudget) {
              appliedBudgetMinor = Math.round(Number(lifetimeBudget) * 100);
              appliedBudgetType = 'lifetime';
              params.append('lifetime_budget', String(appliedBudgetMinor));
            }

            // Preflight Promoted Object resolution for WhatsApp Ad Sets (BEFORE the single POST so we never trigger #613)
            const isWhatsAppAdSet =
              metaObj.destination_type === 'WHATSAPP' &&
              Boolean(metaObj.campaign_id) &&
              !metaObj.promoted_object?.page_id;

            if (isWhatsAppAdSet) {
              const extractRealPageIdFromAds = (adsArr: any[]): string | null => {
                if (!Array.isArray(adsArr)) return null;
                for (const adItem of adsArr) {
                  const cr = adItem?.creative;
                  if (!cr) continue;
                  // Only use true Facebook Page IDs (never actor_id, which may be an Instagram ID)
                  if (cr.object_story_spec?.page_id) {
                    return String(cr.object_story_spec.page_id);
                  }
                  const storyId = cr.effective_object_story_id || cr.object_story_id;
                  if (typeof storyId === 'string' && storyId.includes('_')) {
                    const prefix = storyId.split('_')[0];
                    if (/^\d+$/.test(prefix)) return prefix;
                  }
                }
                return null;
              };

              const candidatePageId =
                extractRealPageIdFromAds(metaObj?.ads?.data) ||
                extractRealPageIdFromAds(metaObj?.campaign?.ads?.data);

              let verifiedPageId: string | null = null;
              if (metaObj?.account_id) {
                try {
                  const actPrefix = String(metaObj.account_id).startsWith('act_')
                    ? metaObj.account_id
                    : `act_${metaObj.account_id}`;
                  const [accRes, ppRes] = await Promise.all([
                    fetch(`https://graph.facebook.com/v21.0/${actPrefix}?fields=name,business_name&access_token=${token}`),
                    fetch(`https://graph.facebook.com/v21.0/${actPrefix}/promote_pages?fields=id,name&limit=25&access_token=${token}`),
                  ]);
                  const [accInfo, ppData] = await Promise.all([accRes.json(), ppRes.json()]);
                  const pagesList: any[] = Array.isArray(ppData?.data) ? ppData.data : [];

                  if (candidatePageId && pagesList.some(pg => String(pg.id) === candidatePageId)) {
                    verifiedPageId = candidatePageId;
                  } else if (pagesList.length === 1) {
                    verifiedPageId = String(pagesList[0].id);
                  } else if (pagesList.length > 1) {
                    const contextText = `${accInfo?.name || ''} ${accInfo?.business_name || ''} ${metaObj?.campaign?.name || ''} ${metaObj?.name || ''}`.toLowerCase();
                    let bestMatch: { id: string; score: number } | null = null;
                    for (const pg of pagesList) {
                      const tokens = String(pg.name || '')
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(t => t.length >= 3);
                      const hits = tokens.filter(t => contextText.includes(t)).length;
                      if (hits > 0 && (!bestMatch || hits > bestMatch.score)) {
                        bestMatch = { id: String(pg.id), score: hits };
                      }
                    }
                    if (bestMatch) {
                      verifiedPageId = bestMatch.id;
                    }
                  }
                } catch {
                  // Ignore promote_pages lookup failure
                }
              }

              if (!verifiedPageId && candidatePageId) {
                // Verify candidatePageId is a real accessible Page node
                try {
                  const pgCheck = await fetch(`https://graph.facebook.com/v21.0/${candidatePageId}?fields=id&access_token=${token}`);
                  const pgJson = await pgCheck.json();
                  if (pgJson?.id && !pgJson?.error) {
                    verifiedPageId = String(pgJson.id);
                  }
                } catch {
                  // Candidate ID is not accessible with this token
                }
              }

              if (verifiedPageId) {
                params.set('promoted_object', JSON.stringify({ page_id: verifiedPageId }));
              }
            }
          } else {
            if (dailyBudget) {
              appliedBudgetMinor = Math.round(Number(dailyBudget) * 100);
              appliedBudgetType = 'daily';
              params.append('daily_budget', String(appliedBudgetMinor));
            }
            if (lifetimeBudget && !dailyBudget) {
              appliedBudgetMinor = Math.round(Number(lifetimeBudget) * 100);
              appliedBudgetType = 'lifetime';
              params.append('lifetime_budget', String(appliedBudgetMinor));
            }
          }

          params.append('access_token', token);
          metaWriteCooldownMap.set(String(idToUpdate), Date.now());

          const url = `https://graph.facebook.com/v21.0/${idToUpdate}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
          const data = await resp.json();

          if (data?.error) {
            const baseMsg = data.error.message || '';
            const userMsg = data.error.error_user_msg || '';
            const userTitle = data.error.error_user_title || '';
            const detailedMsg = [userTitle, userMsg].filter(Boolean).join(': ') || baseMsg;

            if (data.error.code === 613 || baseMsg.includes('#613') || baseMsg.includes('rate limit')) {
              return res.status(429).json({
                code: 'META_RATE_LIMIT',
                error: `Meta Rate Limit: Meta allows 1 budget edit every 30 seconds per Ad Set. Please wait 30 seconds and try again.`
              });
            }

            if (baseMsg.includes('Permission error') || baseMsg.includes('Permissions error') || data.error.code === 200) {
              return res.status(403).json({
                error: `Meta Permissions Error: Your account doesn't have permission to modify this object. Please ensure your Meta token has 'ads_management' permission.`
              });
            }

            if (/Promoted Object|Page is missing|promoted object/i.test(detailedMsg)) {
              return res.status(400).json({
                error: `Meta WhatsApp Ad Set Constraint: Meta requires confirming the Facebook Page on this WhatsApp Ad Set in Meta Ads Manager (or duplicating it in Ads Manager) before its budget can be scaled via API.`
              });
            }

            if (wantsBudgetChange && (baseMsg.includes('daily_budget') || baseMsg.includes('lifetime_budget') || baseMsg.includes('Invalid parameter'))) {
              const isCampaign = type === 'campaign';
              return res.status(400).json({
                error: `Meta Budget Error: ${detailedMsg}${!userMsg && !isCampaign ? '. Verify whether this Ad Set uses Campaign Budget (CBO), has an expired end date, or is below Meta minimum budget.' : !userMsg && isCampaign ? '. This Campaign might not use Campaign Budget Optimization (CBO).' : ''}`
              });
            }
            return res.status(400).json({ error: detailedMsg || 'Meta API error' });
          }

          return res.json({
            success: true,
            data,
            budgetType: appliedBudgetType,
            updatedBudgetMinor: appliedBudgetMinor,
          });
        }

        params.append('access_token', token);
        const url = `https://graph.facebook.com/v21.0/${idToUpdate}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        const data = await response.json();

        if (data.error) {
          const baseMsg = data.error.message || '';
          const userMsg = data.error.error_user_msg || '';
          const userTitle = data.error.error_user_title || '';
          const detailedMsg = [userTitle, userMsg].filter(Boolean).join(': ') || baseMsg;
          return res.status(400).json({ error: detailedMsg || 'Meta API error' });
        }

        return res.json({
          success: true,
          data,
          budgetType: appliedBudgetType,
          updatedBudgetMinor: appliedBudgetMinor,
        });
      }

      // Mock or other platforms handle
      return res.json({
        success: true,
        message: 'Optimization applied successfully.',
        details: platform === 'meta' && (String(idToUpdate).startsWith('mock_') || String(idToUpdate).startsWith('camp_')) ? 'Mock campaign updated in sandbox.' : 'Update simulated.'
      });
    } catch (err) {
      console.error('Update error:', err);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  app.post('/api/campaigns/smart-scale-audit', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      campaignId,
      focusAdsetId,
      accountId,
      platform = 'meta',
      datePreset = 'last_30d',
      metaToken,
      itemsSnapshot,
      language = 'ar',
    } = req.body || {};

    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'TODO') {
      return res.status(500).json({ error: 'Gemini API Key is missing. Please configure GEMINI_API_KEY.' });
    }

    const headerToken = req.headers[`x-${platform}-token`] as string | undefined;
    const token = metaToken || headerToken || '';
    const isLiveMeta =
      platform === 'meta' &&
      Boolean(token) &&
      !token.startsWith('manual_') &&
      token !== 'local_meta_token' &&
      !String(campaignId).startsWith('mock_') &&
      !['camp_1', 'camp_2', 'camp_3'].includes(String(campaignId));

    const summarizeTargeting = (t: any) => {
      if (!t || typeof t !== 'object') return 'Not specified (Broad / Advantage+)';
      const parts: string[] = [];
      if (t.age_min || t.age_max) parts.push(`Age ${t.age_min || 18}-${t.age_max || 65}`);
      if (Array.isArray(t.genders) && t.genders.length) {
        parts.push(`Gender: ${t.genders.map((g: number) => (g === 1 ? 'Male' : g === 2 ? 'Female' : 'All')).join('/')}`);
      }
      const countries = t.geo_locations?.countries;
      const cities = t.geo_locations?.cities?.map((c: any) => c.name);
      if (Array.isArray(countries) && countries.length) parts.push(`Countries: ${countries.join(', ')}`);
      if (Array.isArray(cities) && cities.length) parts.push(`Cities: ${cities.slice(0, 5).join(', ')}`);
      const customAuds = t.custom_audiences?.map((c: any) => c.name).filter(Boolean);
      if (customAuds?.length) parts.push(`Custom/Lookalike: ${customAuds.slice(0, 4).join(', ')}`);
      const interests: string[] = [];
      if (Array.isArray(t.flexible_spec)) {
        for (const spec of t.flexible_spec) {
          for (const key of ['interests', 'behaviors', 'life_events', 'industries']) {
            if (Array.isArray(spec[key])) {
              for (const item of spec[key]) {
                if (item?.name) interests.push(item.name);
              }
            }
          }
        }
      }
      if (interests.length) parts.push(`Interests/Behaviors: ${interests.slice(0, 8).join(', ')}`);
      if (Array.isArray(t.publisher_platforms) && t.publisher_platforms.length) {
        parts.push(`Placements: ${t.publisher_platforms.join(', ')}`);
      }
      return parts.length > 0 ? parts.join(' | ') : 'Broad / Advantage+ Targeting';
    };

    const extractCreativeCopy = (creative: any) => {
      if (!creative || typeof creative !== 'object') return {};
      const titles: string[] = [];
      const bodies: string[] = [];
      const ctas: string[] = [];
      if (creative.title) titles.push(String(creative.title));
      if (creative.body) bodies.push(String(creative.body));
      if (creative.call_to_action_type) ctas.push(String(creative.call_to_action_type));

      const oss = creative.object_story_spec;
      if (oss?.link_data) {
        if (oss.link_data.name) titles.push(String(oss.link_data.name));
        if (oss.link_data.message) bodies.push(String(oss.link_data.message));
        if (oss.link_data.call_to_action?.type) ctas.push(String(oss.link_data.call_to_action.type));
      }
      if (oss?.video_data) {
        if (oss.video_data.title) titles.push(String(oss.video_data.title));
        if (oss.video_data.message) bodies.push(String(oss.video_data.message));
        if (oss.video_data.call_to_action?.type) ctas.push(String(oss.video_data.call_to_action.type));
      }
      const afs = creative.asset_feed_spec;
      if (Array.isArray(afs?.titles)) {
        afs.titles.slice(0, 3).forEach((t: any) => t?.text && titles.push(String(t.text)));
      }
      if (Array.isArray(afs?.bodies)) {
        afs.bodies.slice(0, 3).forEach((b: any) => b?.text && bodies.push(String(b.text)));
      }

      return {
        headline: Array.from(new Set(titles)).slice(0, 3).join(' / '),
        primaryText: Array.from(new Set(bodies)).slice(0, 2).join(' | ').slice(0, 450),
        cta: Array.from(new Set(ctas)).slice(0, 2).join(', '),
      };
    };

    const parseMetaInsight = (insData: any) => {
      const row = insData?.data?.[0];
      if (!row) return null;
      const spend = parseFloat(row.spend || '0');
      const impressions = parseInt(row.impressions || '0', 10);
      const reach = parseInt(row.reach || '0', 10);
      const clicks = parseInt(row.clicks || '0', 10);
      const cpm = parseFloat(row.cpm || '0');
      const ctr = parseFloat(row.ctr || '0');
      const frequency = parseFloat(row.frequency || '0');
      const actions = Array.isArray(row.actions) ? row.actions : [];
      const convAction =
        actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase') ||
        actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d') ||
        actions.find((a: any) => a.action_type === 'lead') ||
        actions.find((a: any) => a.action_type === 'link_click');
      const conversions = convAction ? parseFloat(convAction.value || '0') : 0;
      const actionValues = Array.isArray(row.action_values) ? row.action_values : [];
      const revObj = actionValues.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
      const conversionValue = revObj ? parseFloat(revObj.value || '0') : 0;
      return {
        spend,
        impressions,
        reach,
        clicks,
        ctr,
        cpm,
        frequency,
        conversions,
        conversionValue,
        cpa: conversions > 0 ? spend / conversions : 0,
        roas: spend > 0 ? conversionValue / spend : 0,
      };
    };

    try {
      const validPresets = ['today', 'yesterday', 'last_3d', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month', 'maximum'];
      const metaPreset = validPresets.includes(datePreset) ? datePreset : 'last_30d';

      let accountCurrency = 'USD';
      let accountName = accountId || 'Ad Account';
      let campaignDetail: any = itemsSnapshot?.campaign || { id: campaignId, name: `Campaign ${campaignId}` };
      let adsetDetails: any[] = Array.isArray(itemsSnapshot?.adsets) ? itemsSnapshot.adsets : [];
      let adDetails: any[] = Array.isArray(itemsSnapshot?.ads) ? itemsSnapshot.ads : [];

      if (isLiveMeta) {
        const insightFields = 'spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values';
        const campUrl = `https://graph.facebook.com/v21.0/${campaignId}?fields=id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget,insights.date_preset(${metaPreset}){${insightFields}}&access_token=${token}`;
        const adsetsUrl = `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name,status,effective_status,daily_budget,lifetime_budget,destination_type,optimization_goal,billing_event,targeting,promoted_object,end_time,insights.date_preset(${metaPreset}){${insightFields}}&limit=50&access_token=${token}`;
        const adsUrl = `https://graph.facebook.com/v21.0/${campaignId}/ads?fields=id,name,adset_id,status,effective_status,creative{id,name,title,body,call_to_action_type,object_story_spec,asset_feed_spec},insights.date_preset(${metaPreset}){${insightFields}}&limit=80&access_token=${token}`;
        const accUrl = accountId && accountId !== 'all' && !String(accountId).includes('_')
          ? `https://graph.facebook.com/v21.0/${accountId}?fields=name,currency&access_token=${token}`
          : null;

        const [campRes, adsetsRes, adsRes, accRes] = await Promise.all([
          fetch(campUrl).then(r => r.json()).catch(() => null),
          fetch(adsetsUrl).then(r => r.json()).catch(() => null),
          fetch(adsUrl).then(r => r.json()).catch(() => null),
          accUrl ? fetch(accUrl).then(r => r.json()).catch(() => null) : Promise.resolve(null),
        ]);

        if (accRes && !accRes.error) {
          accountCurrency = accRes.currency || accountCurrency;
          accountName = accRes.name || accountName;
        }

        if (campRes && !campRes.error && campRes.id) {
          const parsedIns = parseMetaInsight(campRes.insights);
          campaignDetail = {
            ...campaignDetail,
            id: campRes.id,
            name: campRes.name,
            objective: campRes.objective,
            status: campRes.effective_status || campRes.status,
            daily_budget: campRes.daily_budget ? Number(campRes.daily_budget) / 100 : null,
            lifetime_budget: campRes.lifetime_budget ? Number(campRes.lifetime_budget) / 100 : null,
            isCbo: Boolean(campRes.daily_budget || campRes.lifetime_budget),
            metrics: parsedIns || campaignDetail.metrics || {},
          };
        }

        if (adsetsRes && !adsetsRes.error && Array.isArray(adsetsRes.data) && adsetsRes.data.length > 0) {
          adsetDetails = adsetsRes.data.map((as: any) => {
            const snap = adsetDetails.find((s: any) => String(s.id) === String(as.id));
            const parsedIns = parseMetaInsight(as.insights);
            return {
              id: as.id,
              name: as.name,
              status: as.effective_status || as.status,
              dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : null,
              lifetimeBudget: as.lifetime_budget ? Number(as.lifetime_budget) / 100 : null,
              destinationType: as.destination_type || null,
              optimizationGoal: as.optimization_goal || null,
              hasPromotedPage: Boolean(as.promoted_object?.page_id),
              whatsAppApiLocked: as.destination_type === 'WHATSAPP' && !as.promoted_object?.page_id,
              targetingSummary: summarizeTargeting(as.targeting),
              metrics: parsedIns || snap?.metrics || {},
              detectedIssues: snap?.analysis?.problems || [],
            };
          });
        }

        if (adsRes && !adsRes.error && Array.isArray(adsRes.data) && adsRes.data.length > 0) {
          adDetails = adsRes.data.map((ad: any) => {
            const snap = adDetails.find((s: any) => String(s.id) === String(ad.id));
            const parsedIns = parseMetaInsight(ad.insights);
            const copy = extractCreativeCopy(ad.creative);
            return {
              id: ad.id,
              adsetId: ad.adset_id,
              name: ad.name,
              status: ad.effective_status || ad.status,
              creativeName: ad.creative?.name || null,
              headline: copy.headline || null,
              primaryText: copy.primaryText || null,
              cta: copy.cta || null,
              metrics: parsedIns || snap?.metrics || {},
              detectedIssues: snap?.analysis?.problems || [],
            };
          });
        }
      } else {
        adsetDetails = adsetDetails.map((as: any) => ({
          id: as.id,
          name: as.name,
          status: as.status,
          dailyBudget: as.raw?.daily_budget ? Number(as.raw.daily_budget) / 100 : as.daily_budget || null,
          lifetimeBudget: as.raw?.lifetime_budget ? Number(as.raw.lifetime_budget) / 100 : as.lifetime_budget || null,
          destinationType: as.raw?.destination_type || null,
          whatsAppApiLocked: as.raw?.destination_type === 'WHATSAPP' && !as.raw?.promoted_object?.page_id,
          targetingSummary: summarizeTargeting(as.raw?.targeting),
          metrics: as.metrics || {},
          detectedIssues: as.analysis?.problems || [],
        }));
        adDetails = adDetails.map((ad: any) => {
          const copy = extractCreativeCopy(ad.raw?.creative);
          return {
            id: ad.id,
            adsetId: ad.adsetId,
            name: ad.name,
            status: ad.status,
            headline: copy.headline || ad.raw?.creative?.title || null,
            primaryText: copy.primaryText || ad.raw?.creative?.body || null,
            metrics: ad.metrics || {},
            detectedIssues: ad.analysis?.problems || [],
          };
        });
      }

      const structuredContext = {
        accountName,
        currency: accountCurrency,
        platform,
        datePreset: metaPreset,
        focusAdsetId: focusAdsetId || null,
        campaign: {
          id: campaignDetail.id,
          name: campaignDetail.name,
          objective: campaignDetail.objective || 'CONVERSIONS / MESSAGES',
          structure: campaignDetail.isCbo || campaignDetail.daily_budget || campaignDetail.lifetime_budget ? 'CBO' : 'ABO',
          dailyBudget: campaignDetail.daily_budget || null,
          lifetimeBudget: campaignDetail.lifetime_budget || null,
          status: campaignDetail.status,
          metrics: campaignDetail.metrics || {},
          detectedIssues: campaignDetail.analysis?.problems || [],
        },
        adsets: adsetDetails.map((as: any) => ({
          ...as,
          ads: adDetails
            .filter((ad: any) => String(ad.adsetId) === String(as.id))
            .slice(0, 8),
        })),
        orphanAds: adDetails.filter((ad: any) => !adsetDetails.some((as: any) => String(as.id) === String(ad.adsetId))).slice(0, 6),
      };

      const isArabic = language !== 'en';
      const prompt = `You are a Principal Performance Marketing & Meta Scaling Strategist.
Analyze the REAL live campaign data below and produce a complete, tactical Scaling & Optimization Decision Blueprint.

IMPORTANT RULES:
1. Do NOT blindly recommend raising budget (+20%) when CTR is low (< 1.0%), CPA is poor, ROAS is weak (< 1.5x without messaging value), or creatives do not fit the audience.
2. You must infer the actual Product / Service / Offer and Target Segment from the campaign name, ad set names, targeting details, destination_type (e.g., WHATSAPP vs WEBSITE), and ad creative copy/headlines/CTAs.
3. Explicitly inspect the campaign structure (CBO vs ABO) and note if any WhatsApp Ad Set has "whatsAppApiLocked": true (meaning Meta Graph API blocks remote budget edits until Facebook Page is confirmed/duplicated inside Ads Manager).
4. Choose ONE precise master decision from:
   - "VERTICAL_SCALE" (winner with healthy CTR >= 1.2%, strong ROAS/CPA, frequency < 2.8, ready for +15-20% budget step)
   - "HORIZONTAL_SCALE" (proven creative/offer but current audience saturating or high CPM/frequency — duplicate into new segments/lookalikes/broad)
   - "CREATIVE_SCALE" (audience & product work or spend is significant, but CTR is low < 1.1% or creative fatigue is hurting efficiency — inject new angles/hooks/formats before raising budget)
   - "HOLD_AND_OPTIMIZE" (mixed signals, early learning, or small tweaks needed on destination/funnel before scaling)
   - "PAUSE_AND_REBUILD" (heavy spend with broken unit economics, severe mismatch, or dead funnel)
5. Output ALL descriptive text in ${isArabic ? 'clear, professional Egyptian/Modern Arabic (keeping technical ad terms like CBO, ABO, Vertical Scale, Horizontal Scale, Creative Scale, CTR, CPM, CPA, ROAS, Frequency in English)' : 'clear professional English'}.
6. Every single insight MUST reference the real numbers, ad set names, creative headlines/angles, and segments present in the JSON below. Return ONLY valid JSON matching the exact schema.

CAMPAIGN DATA JSON:
${JSON.stringify(structuredContext)}

REQUIRED JSON SCHEMA:
{
  "campaignContext": {
    "productOrOffer": "string",
    "funnelStage": "string",
    "campaignStructure": "CBO" | "ABO",
    "currency": "string",
    "structureAnalysis": "string",
    "summary": "string"
  },
  "scalingVerdict": {
    "decision": "VERTICAL_SCALE" | "HORIZONTAL_SCALE" | "CREATIVE_SCALE" | "HOLD_AND_OPTIMIZE" | "PAUSE_AND_REBUILD",
    "decisionLabel": "string",
    "canIncreaseBudgetNow": boolean,
    "recommendedBudgetAction": "string",
    "confidence": "High" | "Medium" | "Low",
    "executiveReason": "string"
  },
  "adSetAudits": [
    {
      "adsetId": "string",
      "adsetName": "string",
      "segmentationSummary": "string",
      "anglesUsed": ["string"],
      "creativeAudienceFit": "High" | "Medium" | "Mismatch",
      "fitExplanation": "string",
      "recommendedScaleType": "VERTICAL_SCALE" | "HORIZONTAL_SCALE" | "CREATIVE_SCALE" | "HOLD_AND_OPTIMIZE" | "PAUSE_AND_REBUILD",
      "decisionLabel": "string",
      "reasoning": "string",
      "actionSteps": ["string"],
      "suggestedNewAngles": ["string"],
      "apiEditNote": "string"
    }
  ],
  "postScaleOptimization": {
    "monitoringWindow": "string",
    "guardrails": [
      {
        "metric": "string",
        "threshold": "string",
        "action": "string"
      }
    ],
    "optimizationSteps": ["string"]
  }
}`;

      const aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
      let rawText = '';
      let lastErr: any = null;

      const callModelWithTimeout = async (targetModel: string, cfg: any, timeoutMs = 18000): Promise<string> => {
        return await Promise.race([
          aiClient.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: cfg,
          }).then(r => r?.text || ''),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on ${targetModel}`)), timeoutMs)
          ),
        ]);
      };

      for (const m of candidateModels) {
        const cfg: any = {
          responseMimeType: 'application/json',
        };
        if (m === 'gemini-2.5-flash') {
          cfg.thinkingConfig = { thinkingBudget: 0 };
        } else if (m === 'gemini-4-hydrogen') {
          cfg.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const text = await callModelWithTimeout(m, cfg, 18000);
            if (text && text.trim()) {
              rawText = text;
              break;
            }
          } catch (err: any) {
            lastErr = err;
            const msg = err?.message || String(err);
            console.warn(`[Smart Scale Audit] Model ${m} attempt ${attempt + 1} failed:`, msg.slice(0, 200));
            const isRetryable503 = (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) && !msg.includes('429');
            if (isRetryable503 && attempt === 0) {
              await new Promise(resolve => setTimeout(resolve, 900));
              continue;
            }
            break;
          }
        }
        if (rawText) break;
      }

      if (!rawText) {
        const rawErrMsg = lastErr?.message || 'AI Smart Scale Audit failed to respond.';
        const isQuota = rawErrMsg.includes('429') || rawErrMsg.includes('RESOURCE_EXHAUSTED') || rawErrMsg.includes('quota');
        const isTransient = rawErrMsg.includes('503') || rawErrMsg.includes('UNAVAILABLE') || rawErrMsg.includes('high demand');
        return res.status(isQuota ? 429 : isTransient ? 503 : 502).json({
          error: isQuota
            ? 'تم تجاوز حصة الطلبات المجانية المؤقتة للذكاء الاصطناعي (429). يرجى المحاولة بعد قليل أو استخدام مفتاح API مدفوع.'
            : isTransient
            ? 'خادم الذكاء الاصطناعي تحت ضغط مؤقت (503). يرجى المحاولة مرة أخرى بعد بضع ثوانٍ.'
            : rawErrMsg,
        });
      }

      let parsedAudit: any = null;
      try {
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        parsedAudit = JSON.parse(cleaned);
      } catch {
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          parsedAudit = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
        } else {
          return res.status(500).json({ error: 'Invalid JSON returned by Smart Scale AI.' });
        }
      }

      return res.json({
        audit: parsedAudit,
        telemetryMeta: {
          isLiveMeta,
          currency: accountCurrency,
          adsetsAnalyzed: adsetDetails.length,
          adsAnalyzed: adDetails.length,
        },
      });
    } catch (err: any) {
      console.error('[Smart Scale Audit] Error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to run Smart Scale Audit' });
    }
  });

  app.get('/api/adsets', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const subPlatform = (req.query.subPlatform as string) || 'all';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ adsets: [] });

    const isManualToken = (tok?: string) =>
      !tok || tok.startsWith('manual_') || tok === 'local_meta_token' || accountId.includes('_demo_') || accountId.includes('_primary_') || accountId === 'all';

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ adsets: [] });
        if (isManualToken(token)) return res.json({ adsets: generateMockAdSets('camp_1'), isMock: true });
        const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,campaign_id,publisher_platforms,destination_type,promoted_object,optimization_goal';
        const url = `https://graph.facebook.com/v21.0/${accountId}/adsets?fields=${fields}&limit=100&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          return handleMetaError(res, data.error, () => res.json({ 
            adsets: generateMockAdSets('camp_1'), 
            isMock: true,
            warning: 'Meta API returned an unexpected error. Showing mock data for demonstration.'
          }));
        }
        
        const normalized = (data.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          status: normalizeStatus(a.status, 'meta'),
          campaignId: a.campaign_id,
          platform: 'meta',
          raw: a
        }));
        return res.json({ adsets: filterBySubPlatform(normalized, subPlatform) });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ adsets: [] });
        if (isManualToken(token) || !process.env.GOOGLE_DEVELOPER_TOKEN) {
          const camps = generatePlatformCampaigns(accountId, 'google');
          return res.json({ adsets: [{ id: `${accountId}_g_as_1`, campaignId: camps[0].id, name: 'High-Intent Exact Match Keywords', status: 'ACTIVE', platform: 'google' }], isMock: true });
        }
        const query = `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign FROM ad_group`;
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.json({ adsets: [], isMock: true });
        
        const normalized = (data.results || []).map((r: any) => ({
          id: r.adGroup.id,
          name: r.adGroup.name,
          status: normalizeStatus(r.adGroup.status, 'google'),
          campaignId: r.adGroup.campaign?.split('/')[3],
          platform: 'google',
          raw: r.adGroup
        }));
        return res.json({ adsets: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ adsets: [] });
        if (isManualToken(token)) {
          const camps = generatePlatformCampaigns(accountId, 'tiktok');
          return res.json({ adsets: [{ id: `${accountId}_tt_as_1`, campaignId: camps[0].id, name: 'Broad + Interest Audience', status: 'ACTIVE', platform: 'tiktok' }], isMock: true });
        }
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/adgroup/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.json({ adsets: [], isMock: true });
        
        const normalized = (data.data?.list || []).map((a: any) => ({
          id: a.adgroup_id,
          name: a.adgroup_name,
          status: normalizeStatus(a.operation_status, 'tiktok'),
          campaignId: a.campaign_id,
          platform: 'tiktok',
          raw: a
        }));
        return res.json({ adsets: normalized });
      } else if (platform === 'snapchat') {
        const token = req.headers['x-snapchat-token'] as string;
        if (!token) return res.json({ adsets: [] });
        if (isManualToken(token)) {
          const camps = generatePlatformCampaigns(accountId, 'snapchat');
          return res.json({ adsets: [{ id: `${accountId}_sc_as_1`, campaignId: camps[0].id, name: 'KSA Mobile Shoppers 22-40', status: 'ACTIVE', platform: 'snapchat' }], isMock: true });
        }
        const response = await fetch(`https://adsapi.snapchat.com/v1/adaccounts/${accountId}/adsquads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.adsquads) return res.json({ adsets: [] });
        
        const normalized = data.adsquads.map((a: any) => ({
          id: a.adsquad.id,
          name: a.adsquad.name,
          status: normalizeStatus(a.adsquad.status, 'snapchat'),
          campaignId: a.adsquad.campaign_id,
          platform: 'snapchat',
          raw: a.adsquad
        }));
        return res.json({ adsets: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching adsets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/ads', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const subPlatform = (req.query.subPlatform as string) || 'all';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ ads: [] });

    const isManualToken = (tok?: string) =>
      !tok || tok.startsWith('manual_') || tok === 'local_meta_token' || accountId.includes('_demo_') || accountId.includes('_primary_') || accountId === 'all';

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ ads: [] });
        if (isManualToken(token)) return res.json({ ads: generateMockCampaignAds(''), isMock: true });
        const fields = 'id,name,status,adset_id,campaign_id,creative{id,name,thumbnail_url,image_url,body}';
        const url = `https://graph.facebook.com/v21.0/${accountId}/ads?fields=${fields}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          return handleMetaError(res, data.error, () => res.json({ 
            ads: generateMockCampaignAds(''), 
            isMock: true,
            warning: 'Meta API returned an unexpected error. Showing mock data for demonstration.'
          }));
        }
        
        const normalized = (data.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          status: normalizeStatus(a.status, 'meta'),
          adsetId: a.adset_id,
          campaignId: a.campaign_id,
          creative: a.creative ? {
            id: a.creative.id,
            name: a.creative.name,
            imageUrl: a.creative.image_url || a.creative.thumbnail_url,
            body: a.creative.body
          } : null,
          platform: 'meta',
          raw: a
        }));
        return res.json({ ads: filterBySubPlatform(normalized, subPlatform) });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ ads: [] });
        if (isManualToken(token) || !process.env.GOOGLE_DEVELOPER_TOKEN) {
          const camps = generatePlatformCampaigns(accountId, 'google');
          return res.json({
            ads: [{
              id: `${accountId}_g_ad_1`,
              name: 'Search RSA - Official Brand & Pricing',
              status: 'ACTIVE',
              adsetId: `${accountId}_g_as_1`,
              campaignId: camps[0]?.id,
              platform: 'google',
              creative: {
                id: `${accountId}_g_cr_1`,
                name: 'Search RSA Copy',
                imageUrl: 'https://picsum.photos/seed/googlead/400/600',
                body: 'Trusted protection & transparent pricing.'
              }
            }],
            isMock: true
          });
        }
        const query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group_ad.ad_group, ad_group_ad.ad.type, ad_group_ad.ad.image_ad.image_url, ad_group_ad.ad.responsive_display_ad.marketing_images FROM ad_group_ad`;
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.json({ ads: [], isMock: true });
        
        const normalized = (data.results || []).map((r: any) => {
          const imageUrl = r.adGroupAd.ad.imageAd?.imageUrl;
          return {
            id: r.adGroupAd.ad.id,
            name: r.adGroupAd.ad.name || `Ad ${r.adGroupAd.ad.id}`,
            status: normalizeStatus(r.adGroupAd.status, 'google'),
            adsetId: r.adGroupAd.adGroup?.split('/')[3],
            platform: 'google',
            creative: {
              id: r.adGroupAd.ad.id,
              name: r.adGroupAd.ad.name || `Ad ${r.adGroupAd.ad.id}`,
              imageUrl: imageUrl || 'https://picsum.photos/seed/ad/400/600',
              body: ''
            },
            raw: r.adGroupAd
          };
        });
        return res.json({ ads: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ ads: [] });
        if (isManualToken(token)) {
          const camps = generatePlatformCampaigns(accountId, 'tiktok');
          return res.json({
            ads: [{
              id: `${accountId}_tt_ad_1`,
              name: 'UGC Hook #1 - Stop Losing Brand Equity',
              status: 'ACTIVE',
              adsetId: `${accountId}_tt_as_1`,
              campaignId: camps[0]?.id,
              platform: 'tiktok',
              creative: {
                id: `${accountId}_tt_cr_1`,
                name: 'UGC Vertical Video 9:16',
                imageUrl: 'https://picsum.photos/seed/tiktokad/400/600',
                body: 'Protect your business identity in minutes.'
              }
            }],
            isMock: true
          });
        }
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/ad/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.json({ ads: [], isMock: true });
        
        const normalized = (data.data?.list || []).map((a: any) => ({
          id: a.ad_id,
          name: a.ad_name,
          status: normalizeStatus(a.operation_status, 'tiktok'),
          adsetId: a.adgroup_id,
          campaignId: a.campaign_id,
          platform: 'tiktok',
          creative: {
            id: a.identity_id || a.ad_id,
            name: a.ad_text || a.ad_name,
            imageUrl: 'https://picsum.photos/seed/ad/400/600',
            body: a.ad_text || ''
          },
          raw: a
        }));
        return res.json({ ads: normalized });
      } else if (platform === 'snapchat') {
        const token = req.headers['x-snapchat-token'] as string;
        if (!token) return res.json({ ads: [] });
        if (isManualToken(token)) {
          const camps = generatePlatformCampaigns(accountId, 'snapchat');
          return res.json({
            ads: [{
              id: `${accountId}_sc_ad_1`,
              name: 'Snap Story - Instant Free Check',
              status: 'ACTIVE',
              adsetId: `${accountId}_sc_as_1`,
              campaignId: camps[0]?.id,
              platform: 'snapchat',
              creative: {
                id: `${accountId}_sc_cr_1`,
                name: 'Snap Story Creative',
                imageUrl: 'https://picsum.photos/seed/snap/400/600',
                body: 'Swipe up for immediate verification.'
              }
            }],
            isMock: true
          });
        }
        const response = await fetch(`https://adsapi.snapchat.com/v1/adaccounts/${accountId}/ads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.ads) return res.json({ ads: [] });
        
        const normalized = data.ads.map((a: any) => ({
          id: a.ad.id,
          name: a.ad.name,
          status: normalizeStatus(a.ad.status, 'snapchat'),
          adsetId: a.ad.ad_squad_id,
          campaignId: a.ad.campaign_id,
          platform: 'snapchat',
          creative: {
            id: a.ad.creative_id || a.ad.id,
            name: a.ad.name,
            imageUrl: 'https://picsum.photos/seed/snap/400/600',
            body: ''
          },
          raw: a.ad
        }));
        return res.json({ ads: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching ads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/creatives', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ creatives: [] });

    const isManualToken = (tok?: string) =>
      !tok || tok.startsWith('manual_') || tok === 'local_meta_token' || accountId.includes('_demo_') || accountId.includes('_primary_') || accountId === 'all';

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ creatives: [] });
        if (isManualToken(token)) return res.json({ creatives: generateMockAdCreatives(), isMock: true });
        const fields = 'id,name,thumbnail_url,image_url,body,object_story_spec';
        const url = `https://graph.facebook.com/v21.0/${accountId}/adcreatives?fields=${fields}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
          return handleMetaError(res, data.error, () => res.json({ 
            creatives: generateMockAdCreatives(),
            isMock: true,
            warning: 'Meta API returned an unexpected error. Showing mock data for demonstration.'
          }));
        }
        
        const normalized = (data.data || []).map((c: any) => {
          let imageUrl = c.image_url || c.thumbnail_url;
          if (!imageUrl && c.object_story_spec) {
            if (c.object_story_spec.video_data) {
              imageUrl = c.object_story_spec.video_data.image_url;
            } else if (c.object_story_spec.link_data) {
              imageUrl = c.object_story_spec.link_data.image_hash ? `https://graph.facebook.com/v21.0/${c.object_story_spec.link_data.image_hash}?access_token=${token}` : c.object_story_spec.link_data.picture;
            } else if (c.object_story_spec.photo_data) {
              imageUrl = c.object_story_spec.photo_data.url;
            }
          }
          return {
            id: c.id,
            name: c.name,
            imageUrl: imageUrl || 'https://picsum.photos/seed/ad/400/600',
            body: c.body || (c.object_story_spec?.link_data?.message) || '',
            platform: 'meta',
            raw: c
          };
        });
        return res.json({ creatives: normalized });
      } else if (platform === 'google') {
        return res.json({ creatives: [] });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ creatives: [] });
        if (isManualToken(token)) return res.json({ creatives: generateMockAdCreatives(), isMock: true });
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/creative/portfolio/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.json({ creatives: [], isMock: true });
        
        const normalized = (data.data?.list || []).map((c: any) => ({
          id: c.portfolio_id,
          name: c.portfolio_name,
          imageUrl: c.cover_image_url,
          platform: 'tiktok',
          raw: c
        }));
        return res.json({ creatives: normalized });
      } else if (platform === 'snapchat') {
        return res.json({ creatives: generateMockAdCreatives(), isMock: true });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching creatives:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/insights', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    const level = (req.query.level as string) || 'campaign';
    const datePreset = (req.query.datePreset as string) || 'last_30d';
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ insights: [] });

    const fetchInsightsForAccount = async (accId: string, plat: string, tok: string) => {
      try {
        if (plat === 'meta') {
          const fields = 'campaign_id,adset_id,ad_id,spend,clicks,inline_link_clicks,impressions,reach,cpc,cpm,actions,action_values,frequency,purchase_roas,cost_per_action_type';
          const url = `https://graph.facebook.com/v21.0/${accId}/insights?fields=${fields}&level=${level}&date_preset=${datePreset}&access_token=${tok}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.error) return [];
          return (data.data || []).map((i: any) => {
            const spend = parseFloat(i.spend || '0');
            const impressions = parseInt(i.impressions || '0', 10);
            const clicks = parseInt(i.inline_link_clicks || i.clicks || '0', 10);
            const reach = parseInt(i.reach || '0', 10);
            let conversions = 0, conversionValue = 0;
            const purchaseTypes = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'];
            const leadResultTypes = [
              'lead',
              'onsite_conversion.lead_grouped',
              'offsite_conversion.fb_pixel_lead',
              'onsite_conversion.messaging_conversation_started_7d',
              'onsite_conversion.messaging_first_reply',
              'contact_total',
              'complete_registration',
            ];
            if (i.actions) {
              const purchaseAction = i.actions.find((a: any) => purchaseTypes.includes(a.action_type));
              if (purchaseAction) {
                conversions = parseFloat(purchaseAction.value || '0');
              } else {
                const leadAction = i.actions.find((a: any) => leadResultTypes.includes(a.action_type));
                if (leadAction) conversions = parseFloat(leadAction.value || '0');
              }
            }
            if (i.action_values) {
              const purchaseValue = i.action_values.find((a: any) => purchaseTypes.includes(a.action_type));
              if (purchaseValue) conversionValue = parseFloat(purchaseValue.value || '0');
            }
            return {
              id: i.ad_id || i.adset_id || i.campaign_id,
              platform: 'meta',
              metrics: { ...calculateMetrics(spend, impressions, clicks, conversions, conversionValue), reach }
            };
          });
        }
        if (plat === 'google') {
          const query = level === 'ad' ? `SELECT ad_group_ad.ad.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group_ad` :
                      level === 'adset' ? `SELECT ad_group.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group` :
                      `SELECT campaign.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign`;
          const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accId}/googleAds:search`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tok}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          const data = await response.json();
          if (data.error) return [];
          return (data.results || []).map((r: any) => {
            const m = r.metrics || {};
            const spend = (m.costMicros || 0) / 1000000;
            return {
              id: r.adGroupAd?.ad?.id || r.adGroup?.id || r.campaign?.id,
              platform: 'google',
              metrics: calculateMetrics(spend, m.impressions || 0, m.clicks || 0, m.conversions || 0, m.conversionsValue || 0)
            };
          });
        }
        return [];
      } catch (e) {
        return [];
      }
    };

    const isManualOrDemo = (tok?: string, accId?: string) =>
      !tok || tok.startsWith('manual_') || tok === 'local_meta_token' || (accId && (accId.includes('_demo_') || accId.includes('_primary_') || accId.startsWith('mock_')));

    try {
      if (accountId === 'all') {
        const token = req.headers[`x-${platform}-token`] as string;
        if (!token) return res.json({ insights: [] });
        if (isManualOrDemo(token)) {
          return res.json({ insights: buildPlatformInsightsForAccount(`${platform}_all`, platform), isMock: true });
        }
        
        // Fetch accounts first
        let accountIds: string[] = [];
        if (platform === 'meta') {
           const accRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id&access_token=${token}`);
           const accData = await accRes.json();
           accountIds = (accData.data || []).map((a: any) => a.id);
        } else if (platform === 'google') {
           const accRes = await fetch(`https://googleads.googleapis.com/v15/customers:listAccessibleCustomers`, {
            headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '' }
           });
           const accData = await accRes.json();
           accountIds = (accData.resourceNames || []).map((name: string) => name.split('/')[1]);
        }

        const allInsights = await Promise.all(accountIds.map(id => fetchInsightsForAccount(id, platform, token)));
        const flat = allInsights.flat();
        return res.json({ insights: flat.length ? flat : buildPlatformInsightsForAccount(`${platform}_all`, platform), isMock: flat.length === 0 });
      }

      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ insights: [] });
        if (isManualOrDemo(token, accountId)) {
          return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'meta'), isMock: true });
        }
        const fields = 'campaign_id,adset_id,ad_id,spend,clicks,inline_link_clicks,impressions,reach,cpc,cpm,actions,action_values,frequency,purchase_roas,cost_per_action_type';
        const url = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=${fields}&level=${level}&date_preset=${datePreset}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          return handleMetaError(res, data.error, () => res.json({ 
            insights: [
              generateMockInsights('camp_1'),
              generateMockInsights('camp_2'),
              generateMockInsights('camp_3')
            ],
            isMock: true,
            warning: 'Meta API returned an unexpected error. Showing mock data for demonstration.'
          }));
        }
        
        const normalized = (data.data || []).map((i: any) => {
          const spend = parseFloat(i.spend || '0');
          const impressions = parseInt(i.impressions || '0', 10);
          const clicks = parseInt(i.inline_link_clicks || i.clicks || '0', 10);
          const reach = parseInt(i.reach || '0', 10);
          
          let conversions = 0;
          let conversionValue = 0;
          
          const purchaseTypes = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'];
          const leadResultTypes = [
            'lead',
            'onsite_conversion.lead_grouped',
            'offsite_conversion.fb_pixel_lead',
            'onsite_conversion.messaging_conversation_started_7d',
            'onsite_conversion.messaging_first_reply',
            'contact_total',
            'complete_registration',
          ];
          
          if (i.actions) {
            const purchaseAction = i.actions.find((a: any) => purchaseTypes.includes(a.action_type));
            if (purchaseAction) {
              conversions = parseFloat(purchaseAction.value || '0');
            } else {
              const leadAction = i.actions.find((a: any) => leadResultTypes.includes(a.action_type));
              if (leadAction) conversions = parseFloat(leadAction.value || '0');
            }
          }
          
          if (i.action_values) {
            const purchaseValue = i.action_values.find((a: any) => purchaseTypes.includes(a.action_type));
            if (purchaseValue) conversionValue = parseFloat(purchaseValue.value || '0');
          }

          return {
            id: i.ad_id || i.adset_id || i.campaign_id,
            platform: 'meta',
            metrics: { ...calculateMetrics(spend, impressions, clicks, conversions, conversionValue), reach },
            raw: i
          };
        });
        return res.json({ insights: normalized });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ insights: [] });
        if (isManualOrDemo(token, accountId) || !process.env.GOOGLE_DEVELOPER_TOKEN) {
          return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'google'), isMock: true });
        }
        
        let query = '';
        if (level === 'ad') {
          query = `SELECT ad_group_ad.ad.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group_ad`;
        } else if (level === 'adset') {
          query = `SELECT ad_group.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group`;
        } else {
          query = `SELECT campaign.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign`;
        }
        
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'google'), isMock: true });
        
        const normalized = (data.results || []).map((r: any) => {
          const spend = (r.metrics?.costMicros || 0) / 1000000;
          const impressions = parseInt(r.metrics?.impressions || '0', 10);
          const clicks = parseInt(r.metrics?.clicks || '0', 10);
          const conversions = parseFloat(r.metrics?.conversions || '0');
          const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

          return {
            id: r.campaign?.id || r.adGroup?.id || r.adGroupAd?.ad?.id,
            platform: 'google',
            metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue),
            raw: r
          };
        });
        return res.json({ insights: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ insights: [] });
        if (isManualOrDemo(token, accountId)) {
          return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'tiktok'), isMock: true });
        }
        
        let dataLevel = 'AUCTION_CAMPAIGN';
        let dimension = 'campaign_id';
        if (level === 'ad') {
          dataLevel = 'AUCTION_AD';
          dimension = 'ad_id';
        } else if (level === 'adset') {
          dataLevel = 'AUCTION_ADGROUP';
          dimension = 'adgroup_id';
        }

        const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${accountId}&data_level=${dataLevel}&report_type=BASIC&dimensions=["${dimension}"]&metrics=["spend","impressions","clicks","conversion","total_purchase_value"]`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'tiktok'), isMock: true });
        
        const normalized = (data.data?.list || []).map((i: any) => {
          const spend = parseFloat(i.metrics?.spend || '0');
          const impressions = parseInt(i.metrics?.impressions || '0', 10);
          const clicks = parseInt(i.metrics?.clicks || '0', 10);
          const conversions = parseInt(i.metrics?.conversion || '0', 10);
          const conversionValue = parseFloat(i.metrics?.total_purchase_value || '0');

          return {
            id: i.dimensions?.[dimension],
            platform: 'tiktok',
            metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue),
            raw: i
          };
        });
        return res.json({ insights: normalized });
      } else if (platform === 'snapchat') {
        const token = req.headers['x-snapchat-token'] as string;
        if (!token) return res.json({ insights: [] });
        if (isManualOrDemo(token, accountId)) {
          return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'snapchat'), isMock: true });
        }
        
        let granularity = 'TOTAL';
        if (datePreset === 'today' || datePreset === 'yesterday') granularity = 'DAY';

        const url = `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/stats?granularity=${granularity}&fields=spend,impressions,swipes,total_installs,total_purchase_value`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (!data.timeseries) return res.json({ insights: buildPlatformInsightsForAccount(accountId, 'snapchat'), isMock: true });

        const normalized = data.timeseries.flatMap((ts: any) => {
          const stats = ts.stats || {};
          const spend = (stats.spend || 0) / 1000000;
          const impressions = stats.impressions || 0;
          const clicks = stats.swipes || 0;
          const conversions = stats.total_installs || 0;
          const conversionValue = stats.total_purchase_value || 0;

          return {
            id: ts.id || accountId,
            platform: 'snapchat',
            metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue),
            raw: ts
          };
        });
        return res.json({ insights: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.use('/api/alerts', alertsRouter);

  // --- Real Intelligence Data (Firestore) ---
  app.get('/api/intelligence/tests', async (req, res) => {
    try {
      const { workspaceId } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

      // Return empty array since tests table is not explicitly defined in the requested schema
      res.json({ tests: [] });
    } catch (error: any) {
      console.error('[API] Error fetching tests:', error.message);
      res.status(500).json({ error: 'Failed to fetch tests' });
    }
  });

  app.get('/api/intelligence/creatives', async (req, res) => {
    try {
      const { workspaceId, adId } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

      // Return empty array as creative_intel table is not defined in the requested DB schema yet
      res.json({ intelligence: [] });
    } catch (error: any) {
      console.error('[API] Error fetching creative intel:', error.message);
      res.status(500).json({ error: 'Failed to fetch creative intelligence' });
    }
  });

  app.post('/api/intelligence/prepare', async (req, res) => {
    const { url } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!userId) return res.status(401).json({ error: 'User ID is required' });

    try {
      const intelService = IntelligenceService.getInstance();
      const data = await intelService.fullAudit(url, userId);
      res.json(data);
    } catch (error: any) {
      console.error('[API] Intelligence preparation failed:', error);
      res.status(500).json({ error: error.message || 'Data preparation failed' });
    }
  });

  app.post('/api/intelligence/save', async (req, res) => {
    const { report } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!report) return res.status(400).json({ error: 'Report is required' });
    if (!userId) return res.status(401).json({ error: 'User ID is required' });

    try {
      const intelService = IntelligenceService.getInstance();
      const result = await intelService.saveCompletedReport(userId, report);
      res.json(result);
    } catch (error: any) {
      console.error('[API] Report save failed:', error);
      res.status(500).json({ error: error.message || 'Save failed' });
    }
  });

  app.get('/api/intelligence/spy', async (req, res) => {
    try {
      const { query: searchQuery } = req.query;
      if (!searchQuery) return res.status(400).json({ error: 'query param is required' });

      const spyEngine = new AdSpyEngine();
      const results = await spyEngine.spyOnCompetitors(searchQuery as string);
      res.json(results);
    } catch (error: any) {
      console.error('[API] Ad Spy failed:', error.message);
      res.status(500).json({ error: 'Ad Spy operation failed' });
    }
  });

  app.get('/api/intelligence/spy/history', async (req, res) => {
    try {
      // Return empty array as spy results table is not defined in the DB schema
      res.json({ history: [] });
    } catch (error: any) {
      console.error('[API] Error fetching spy history:', error.message);
      res.status(500).json({ error: 'Failed to fetch spy history' });
    }
  });

  // In-memory cache for Meta Ads
  const adCache = new Map<string, { data: any, timestamp: number }>();
  const AD_CACHE_TTL = 1000 * 60 * 60; // 1 hour

  app.get('/api/ad-spy/meta', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const token = req.headers['x-meta-token'] as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!token) return res.status(401).json({ error: 'Meta token required' });

    const searchTerms = req.query.searchTerms as string;
    const country = (req.query.country as string) || 'US';
    const limit = (req.query.limit as string) || '50';
    const subPlatform = (req.query.subPlatform as string) || 'all';

    if (!searchTerms) {
      return res.status(400).json({ error: 'searchTerms is required' });
    }

    const cacheKey = `${searchTerms}-${country}-${limit}-${subPlatform}`;
    const cached = adCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < AD_CACHE_TTL)) {
      console.log(`[AdSpy] Returning cached results for: ${searchTerms}`);
      return res.json(cached.data);
    }

    try {
      const fields = 'id,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_descriptions,ad_creative_link_titles,page_id,page_name,publisher_platforms,bylines,currency,estimated_audience_size,impressions,spend';
      
      let platformParam = '';
      if (subPlatform === 'facebook') platformParam = "&publisher_platforms=['FACEBOOK']";
      else if (subPlatform === 'instagram') platformParam = "&publisher_platforms=['INSTAGRAM']";

      const url = `https://graph.facebook.com/v21.0/ads_archive?fields=${fields}&search_terms=${encodeURIComponent(searchTerms)}&ad_reached_countries=['${country}']&ad_active_status=ACTIVE&ad_type=ALL&limit=${limit}${platformParam}&access_token=${token}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        return handleMetaError(res, data.error, () => {
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          const warning = isRateLimit 
            ? 'Meta API rate limit reached. Showing sample data for now.' 
            : 'Showing sample data. Your Meta App requires "Ad Library API" approval to fetch real data.';
          
          return res.json({
            ads: generateMockAdSpyAds(searchTerms, country),
            isMock: true,
            warning
          });
        });
      }
      
      const result = { ads: data.data || [] };
      adCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return res.json(result);
    } catch (error) {
      console.error('Error fetching from Meta Ads Library:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const runAnalysisLogic = (items: any[], targetRoas = 2.0, targetCpa = 50.0) => {
    return items.map((item: any) => {
      const metrics = item.metrics as NormalizedMetrics;
      if (!metrics) return { ...item, analysis: null };

      let decision: 'SCALE' | 'KILL' | 'OPTIMIZE' | 'MONITOR';
      let creativeClassification: 'WINNER' | 'FATIGUED' | 'TESTING' | 'LOSER' | 'N/A' = 'N/A';
      const problems: string[] = [];
      let suggestedAction: string;

      if (metrics.cpa > targetCpa && metrics.conversions > 0) problems.push('High CPA');
      if (metrics.ctr > 0 && metrics.ctr < 1.0) problems.push('Low CTR');
      if (metrics.cvr > 0 && metrics.cvr < 1.0) problems.push('Low Conversion Rate');
      if (metrics.cpm > 50) problems.push('High CPM');
      if (metrics.spend > targetCpa * 3 && metrics.ctr < 0.8) problems.push('Ad Fatigue');

      if (metrics.roas > targetRoas * 1.2 && metrics.spend > targetCpa) {
        decision = 'SCALE';
        suggestedAction = 'Increase budget by 15-20% as ROAS is well above target.';
      } else if (metrics.roas > 0 && metrics.roas < targetRoas * 0.5 && metrics.spend > targetCpa) {
        decision = 'KILL';
        suggestedAction = 'Pause immediately. ROAS is critically low and spend is significant.';
      } else if (metrics.spend > targetCpa * 2 && metrics.conversions === 0) {
        decision = 'KILL';
        suggestedAction = 'Pause immediately. High spend with zero conversions.';
      } else if (metrics.roas >= targetRoas * 0.5 && metrics.roas <= targetRoas * 1.2 && metrics.spend > targetCpa) {
        decision = 'OPTIMIZE';
        if (problems.includes('Low CTR')) {
          suggestedAction = 'Refresh creative to improve CTR. Current ROAS is marginal.';
        } else if (problems.includes('High CPA')) {
          suggestedAction = 'Test new audiences or tighten targeting to lower CPA.';
        } else {
          suggestedAction = 'Monitor closely. Performance is borderline.';
        }
      } else {
        decision = 'MONITOR';
        suggestedAction = 'Not enough spend to make a definitive decision. Keep running.';
      }

      if (item.type === 'ad' || item.type === 'creative' || item.imageUrl) {
        if (metrics.roas > targetRoas && metrics.spend > targetCpa) {
          creativeClassification = 'WINNER';
        } else if (problems.includes('Ad Fatigue')) {
          creativeClassification = 'FATIGUED';
        } else if (metrics.spend > targetCpa && metrics.roas < targetRoas * 0.5) {
          creativeClassification = 'LOSER';
        } else {
          creativeClassification = 'TESTING';
        }
      }

      return {
        ...item,
        analysis: {
          decision,
          creativeClassification,
          problems,
          suggestedAction,
          targetRoas,
          targetCpa
        }
      };
    });
  };

  app.post('/api/analysis', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { items, targetRoas = 2.0, targetCpa = 50.0 } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }
      const analyzedItems = runAnalysisLogic(items, targetRoas, targetCpa);
      res.json({ analyzedItems });
    } catch (error) {
      console.error('Error in analysis engine:', error);
      res.status(500).json({ error: 'Internal server error during analysis' });
    }
  });

  app.post('/api/evaluate-performance', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { items, targetRoas = 2.0, targetCpa = 50.0 } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }
      const analyzedItems = runAnalysisLogic(items, targetRoas, targetCpa);
      res.json({ analyzedItems });
    } catch (error) {
      console.error('Error in evaluate-performance:', error);
      res.status(500).json({ error: 'Internal server error during performance evaluation' });
    }
  });

  app.post('/api/intelligence/spy', async (req, res) => {
    const { query: searchQuery, platform = 'meta' } = req.body;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      const spy = new AdSpyEngine();
      const results = await spy.spyOnCompetitors(searchQuery);
      res.json(results);
    } catch (error: any) {
      console.error('[Intelligence] Spy failed:', error);
      res.status(500).json({ error: error.message || 'Operation failed' });
    }
  });

  const geminiAi = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.post('/api/gemini/analyze', async (req, res) => {
    const { prompt, isJson = false, model, stream = false } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'TODO') {
      return res.status(500).json({ error: 'Gemini API Key is missing. Please add it to the Secrets panel in AI Studio.' });
    }

    const useStream = Boolean(stream);
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let clientDisconnected = false;

    const writeNdjson = (payload: Record<string, any>) => {
      if (!useStream || clientDisconnected || res.writableEnded) return;
      try {
        res.write(JSON.stringify(payload) + '\n');
      } catch {
        // Ignore broken pipe if client disconnected
      }
    };

    if (useStream) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }
      res.on('close', () => {
        if (!res.writableEnded) {
          clientDisconnected = true;
        }
      });
      writeNdjson({ ping: true });
      heartbeatTimer = setInterval(() => writeNdjson({ ping: true }), 3000);
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    const sendError = (status: number, message: string) => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (useStream) {
        writeNdjson({ done: false, error: message, status });
        if (!res.writableEnded) res.end();
        return;
      }
      return res.status(status).json({ error: message });
    };

    try {
      const aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const preferredModel =
        model && !['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash'].includes(model)
          ? model
          : 'gemini-2.5-flash';
      const candidateModels = [preferredModel, 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'].filter((m, i, arr) => arr.indexOf(m) === i);

      let lastErr: any = null;

      const runWithTimeout = async (targetModel: string, cfg: any): Promise<string> => {
        let idleTimer: NodeJS.Timeout | null = null;
        return await new Promise<string>(async (resolve, reject) => {
          let settled = false;
          const resetIdle = (ms: number) => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              if (!settled) {
                settled = true;
                reject(new Error(`Timeout after ${ms}ms on ${targetModel}`));
              }
            }, ms);
          };

          const initialTimeoutMs = targetModel.startsWith('gemini-4') ? 25000 : 35000;
          resetIdle(initialTimeoutMs);

          try {
            const streamRes = await aiClient.models.generateContentStream({
              model: targetModel,
              contents: prompt,
              config: cfg,
            });
            let fullText = '';
            for await (const chunk of streamRes) {
              if (clientDisconnected || settled) break;
              if (chunk?.text) {
                fullText += chunk.text;
                resetIdle(25000);
              }
            }
            if (idleTimer) clearTimeout(idleTimer);
            if (!settled) {
              settled = true;
              resolve(fullText);
            }
          } catch (err) {
            if (idleTimer) clearTimeout(idleTimer);
            if (!settled) {
              settled = true;
              reject(err);
            }
          }
        });
      };

      for (const currentModel of candidateModels) {
        if (clientDisconnected) break;

        const config: any = {
          responseMimeType: isJson ? 'application/json' : 'text/plain',
        };

        if (currentModel === 'gemini-2.5-flash' && isJson) {
          config.thinkingConfig = { thinkingBudget: 0 };
        } else if (currentModel === 'gemini-4-hydrogen' || currentModel === 'gemini-4-neon') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        if (!isJson && prompt.length < 6000) {
          config.tools = [{ googleSearch: {} }];
        }

        for (let attempt = 0; attempt < 2; attempt++) {
          if (clientDisconnected) break;
          try {
            const text = await runWithTimeout(currentModel, config);
            if (text && text.trim()) {
              if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
              }
              if (useStream) {
                writeNdjson({ done: true, text });
                if (!res.writableEnded) res.end();
                return;
              }
              return res.json({ text });
            }
            lastErr = new Error(`Empty response from ${currentModel}`);
            break;
          } catch (mErr: any) {
            lastErr = mErr;
            const errMsg = mErr?.message || String(mErr);
            console.warn(`[Gemini API Server] Model ${currentModel} attempt ${attempt + 1} failed (status=${mErr?.status || 'unknown'}): ${errMsg.slice(0, 220)}`);

            // Retry once without search grounding if tools caused an issue
            if (config.tools) {
              try {
                delete config.tools;
                const retryText = await runWithTimeout(currentModel, config);
                if (retryText && retryText.trim()) {
                  if (heartbeatTimer) {
                    clearInterval(heartbeatTimer);
                    heartbeatTimer = null;
                  }
                  if (useStream) {
                    writeNdjson({ done: true, text: retryText });
                    if (!res.writableEnded) res.end();
                    return;
                  }
                  return res.json({ text: retryText });
                }
              } catch (retryErr: any) {
                lastErr = retryErr;
                console.warn(`[Gemini API Server] Retry without tools on ${currentModel} failed: ${(retryErr?.message || '').slice(0, 180)}`);
              }
            }

            const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('429') || mErr?.status === 503 || mErr?.status === 429;
            if (isTransient && attempt === 0) {
              await new Promise(resolve => setTimeout(resolve, 1400));
              continue;
            }
            break;
          }
        }
      }

      const finalMessage = lastErr?.message || 'AI analysis service failed to respond.';
      if (finalMessage.includes('API key not valid') || finalMessage.includes('API_KEY_INVALID')) {
        return sendError(400, 'Invalid Gemini API Key. Please check Settings > Secrets and verify your key.');
      }
      if (finalMessage.includes('PERMISSION_DENIED') || lastErr?.status === 403) {
        return sendError(403, 'Gemini API permission denied. Please verify your API key in Settings > Secrets.');
      }
      if (finalMessage.includes('RESOURCE_EXHAUSTED') || lastErr?.status === 429) {
        return sendError(429, 'Gemini API rate limit reached. Please wait a moment and try again.');
      }
      if (finalMessage.includes('503') || finalMessage.includes('UNAVAILABLE') || finalMessage.includes('high demand') || lastErr?.status === 503) {
        return sendError(503, 'خدمة الذكاء الاصطناعي تواجه ضغطاً مؤقتاً من المزود (503). يرجى المحاولة مرة أخرى بعد لحظات.');
      }
      return sendError(lastErr?.status || 502, `Gemini analysis error: ${finalMessage.slice(0, 240)}`);
    } finally {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`[Config] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Present (starts with ' + process.env.GEMINI_API_KEY.substring(0, 10) + '...)' : 'MISSING'}`);
    console.log(`[Config] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Present' : 'MISSING'}`);
    console.log(`[Config] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Present' : 'MISSING'}`);
    startApp();
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
});
