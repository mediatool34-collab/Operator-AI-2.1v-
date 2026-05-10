import { pgTable, text, timestamp, doublePrecision, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('displayName'),
  photoUrl: text('photoUrl'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  name: text('name').notNull(),
  status: text('status'),
  objective: text('objective'),
  dailyBudget: doublePrecision('daily_budget'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const campaignMetrics = pgTable('campaign_metrics', {
  id: text('id').primaryKey(), // We can use uuid or custom id
  campaignId: text('campaign_id').references(() => campaigns.id),
  date: timestamp('date'), // Daily metrics
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  spend: doublePrecision('spend').default(0),
  conversions: integer('conversions').default(0),
  revenue: doublePrecision('revenue').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const creatives = pgTable('creatives', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').references(() => campaigns.id),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  body: text('body'),
  status: text('status'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const alerts = pgTable('alerts', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type'), // e.g., 'anomaly', 'performance_drop'
  status: text('status').default('active'), // active, resolved
  createdAt: timestamp('created_at').defaultNow(),
});

export const optimizationLogs = pgTable('optimization_logs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  action: text('action').notNull(),
  reason: text('reason'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const adAccounts = pgTable('ad_accounts', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  adAccountId: text('ad_account_id').notNull(),
  platform: text('platform').notNull(),
  name: text('name'),
  accessToken: text('access_token').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const socialProfiles = pgTable('social_profiles', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  platform: text('platform').notNull(),
  url: text('url').notNull(),
  username: text('username'),
  followers: integer('followers'),
  engagementRate: doublePrecision('engagement_rate'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const competitorData = pgTable('competitor_data', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => socialProfiles.id),
  name: text('name').notNull(),
  dominantPlatform: text('dominant_platform'),
  pricingStrategy: text('pricing_strategy'),
  strength: text('strength'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contentAnalysis = pgTable('content_analysis', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => socialProfiles.id),
  contentType: text('content_type'), // best, worst
  url: text('url'),
  hookQuality: text('hook_quality'),
  retentionWeakness: text('retention_weakness'),
  reasonFailed: text('reason_failed'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const adsIntelligence = pgTable('ads_intelligence', {
  id: text('id').primaryKey(),
  competitorId: text('competitor_id').references(() => competitorData.id),
  adUrl: text('ad_url'),
  creativeUrl: text('creative_url'),
  hook: text('hook'),
  cta: text('cta'),
  adCopy: text('ad_copy'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const personas = pgTable('personas', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => socialProfiles.id),
  name: text('name').notNull(),
  interests: jsonb('interests'),
  painPoints: jsonb('pain_points'),
  buyingTriggers: jsonb('buying_triggers'),
  awarenessLevel: text('awareness_level'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaBuyingPlans = pgTable('media_buying_plans', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => socialProfiles.id),
  campaignsCount: integer('campaigns_count'),
  adsetsCount: integer('adsets_count'),
  adsCount: integer('ads_count'),
  aboVsCbo: text('abo_vs_cbo'),
  suggestedBudget: text('suggested_budget'),
  kpiExpectations: text('kpi_expectations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const connectedAccounts = pgTable('connected_accounts', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  platform: text('platform').notNull(), // e.g., 'meta', 'tiktok'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  pageId: text('page_id'),
  adAccountId: text('ad_account_id'),
  businessId: text('business_id'),
  scopes: text('scopes'),
  createdAt: timestamp('created_at').defaultNow(),
});



