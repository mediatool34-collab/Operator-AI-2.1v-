/**
 * KPI Engine - Centralized metric calculations for the Ad Spy System.
 * Ensures consistent handling of divisions, nulls, and defaults.
 */

export interface RawMetrics {
  spend?: number | null;
  clicks?: number | null;
  impressions?: number | null;
  conversions?: number | null;
  revenue?: number | null;
  reach?: number | null;
  [key: string]: any;
}

export interface CalculatedMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  cpm: number;
}

export class KPIEngine {
  /**
   * Safely calculates a ratio between two numbers.
   * Returns 0 if denominator is 0 or null.
   */
  private static safeRatio(numerator: number | null | undefined, denominator: number | null | undefined): number {
    const n = Number(numerator) || 0;
    const d = Number(denominator) || 0;
    if (d === 0) return 0;
    return n / d;
  }

  /**
   * Extracts and calculates clean metrics from raw data source.
   */
  static calculate(raw: RawMetrics): CalculatedMetrics {
    const spend = Number(raw.spend) || 0;
    const clicks = Number(raw.clicks) || 0;
    const impressions = Number(raw.impressions) || 0;
    const conversions = Number(raw.conversions) || 0;
    const revenue = Number(raw.revenue) || 0;

    return {
      spend,
      clicks,
      impressions,
      conversions,
      revenue,
      // CTR: clicks / impressions
      ctr: this.safeRatio(clicks, impressions),
      // CPC: spend / clicks
      cpc: this.safeRatio(spend, clicks),
      // CPA: spend / conversions
      cpa: this.safeRatio(spend, conversions),
      // ROAS: revenue / spend
      roas: this.safeRatio(revenue, spend),
      // CPM: (spend / impressions) * 1000
      cpm: this.safeRatio(spend, impressions) * 1000
    };
  }

  /**
   * Formats a metric for display (rounded to 2+ decimals)
   */
  static format(value: number, type: 'percent' | 'currency' | 'number' = 'number'): string {
    if (type === 'percent') return `${(value * 100).toFixed(2)}%`;
    if (type === 'currency') return `$${value.toFixed(2)}`;
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
