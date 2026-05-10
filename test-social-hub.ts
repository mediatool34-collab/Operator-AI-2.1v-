import { db } from './src/db/index.js';
import { socialProfiles, competitorData, contentAnalysis, adsIntelligence, personas, mediaBuyingPlans } from './src/db/schema.js';
import { v4 as uuidv4 } from 'uuid';

async function runTest() {
  console.log("=== STARTING REAL DB INSERTION TEST ===");
  try {
    const profileId = uuidv4();
    
    // 1. Insert Profile
    console.log("Inserting social_profiles row...");
    await db.insert(socialProfiles).values({
      id: profileId,
      platform: 'Instagram',
      url: 'https://instagram.com/real_test_brand',
      username: 'real_test_brand',
      followers: 125000,
      engagementRate: 3.2,
      bio: 'Authentic brand building test'
    });
    
    // 2. Insert Competitor
    console.log("Inserting competitor_data row...");
    const compId = uuidv4();
    await db.insert(competitorData).values({
      id: compId,
      profileId,
      name: 'Rival Brand Co',
      dominantPlatform: 'TikTok',
      pricingStrategy: 'Premium ($99+)',
      strength: 'Viral UGC Content'
    });
    
    // 3. Insert Content Analysis
    console.log("Inserting content_analysis row...");
    await db.insert(contentAnalysis).values({
      id: uuidv4(),
      profileId,
      contentType: 'worst',
      url: 'https://instagram.com/p/12345',
      hookQuality: 'Weak, boring product shot',
      retentionWeakness: 'Dropped at 3 seconds due to slow pacing',
      reasonFailed: 'Missing emotional trigger'
    });
    
    // 4. Insert Ads Intel
    console.log("Inserting ads_intelligence row...");
    await db.insert(adsIntelligence).values({
      id: uuidv4(),
      competitorId: compId,
      adUrl: 'https://fb.com/ads/lib/123',
      creativeUrl: 'https://scontent.xx.fbcdn.net/creative.mp4',
      hook: 'Tired of XYZ problem? Do this.',
      cta: 'Shop Now',
      adCopy: 'Get 50% off today!'
    });
    
    // 5. Insert Persona
    console.log("Inserting personas row...");
    await db.insert(personas).values({
      id: uuidv4(),
      profileId,
      name: 'Stressed Professional',
      interests: ['productivity', 'coffee', 'tech'],
      painPoints: ['no time', 'burnout'],
      buyingTriggers: ['efficiency promise', 'time-saving deal'],
      awarenessLevel: 'Problem Aware'
    });
    
    // 6. Insert Media Buying Plan
    console.log("Inserting media_buying_plans row...");
    await db.insert(mediaBuyingPlans).values({
      id: uuidv4(),
      profileId,
      campaignsCount: 2,
      adsetsCount: 6,
      adsCount: 18,
      aboVsCbo: 'ABO for testing, CBO for scaling',
      suggestedBudget: '$50/day TOF, $20/day BOF',
      kpiExpectations: 'Target CPA: $15, Expected ROAS: 2.5x'
    });
    
    console.log("\n=== ✅ ALL ROWS SUCCESSFULLY INSERTED INTO POSTGRES ===");
    
    console.log("\n--- VERIFYING DATA ---");
    const profiles = await db.select().from(socialProfiles);
    console.log("social_profiles:", profiles);
    
    const comps = await db.select().from(competitorData);
    console.log("competitor_data:", comps);
    
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

runTest();
