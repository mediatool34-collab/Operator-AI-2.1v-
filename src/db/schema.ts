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
