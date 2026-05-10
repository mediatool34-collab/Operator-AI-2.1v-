import React, { useState, useEffect, useCallback } from 'react';
import { ActivitySquare, Globe, Link2, Search, Target, Users, LayoutDashboard, Compass, Rocket, BrainCircuit, BarChart3, AlertCircle, Loader2, Sparkles, TrendingUp, Presentation, Megaphone, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { analyzeWithGemini } from '../lib/gemini';
import { usePersistedState } from '../hooks/usePersistedState';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TabType = 'executive' | 'market' | 'personas' | 'competitors' | 'mediaBuyer' | 'content' | 'connected_accts' | 'campaign_mgmt' | 'optimization_hx';

export function SocialIntelligenceHub() {
  const { user } = useAuth();
  const [profileUrl, setProfileUrl] = usePersistedState('social_intel_profile_url', '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  
  const [report, setReport] = usePersistedState<any>('social_intel_report', null);
  const [activeTab, setActiveTab] = usePersistedState<TabType>('social_intel_active_tab', 'executive');
  const [isOwnerMode, setIsOwnerMode] = usePersistedState<boolean>('social_intel_owner_mode', false);
  const [metaConnected, setMetaConnected] = usePersistedState<boolean>('social_intel_meta_connected', false);
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<any[]>([]);
  const [fetchingCampaigns, setFetchingCampaigns] = useState<boolean>(false);

  const [sharedBudgetContext] = usePersistedState<any>('budget_planner_context', null);
  const [sharedFunnelContext] = usePersistedState<any>('pre_funnel_context', null);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    setFetchingCampaigns(true);
    try {
      // Pass fromDb=true to get actual saved campaigns if API token is missing
      const res = await fetch('/api/campaigns?fromDb=true', {
        headers: {
          'x-user-id': user.uid
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.campaigns?.length > 0) {
          setMetaCampaigns(data.campaigns);
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setFetchingCampaigns(false);
    }
  }, [user]);

  const checkMetaConnection = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/meta/accounts', {
        headers: {
          'x-user-id': user.uid
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && data.accounts.length > 0) {
          setMetaConnected(true);
          setMetaAccounts(data.accounts);
          setIsOwnerMode(true);
          fetchCampaigns();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [user, fetchCampaigns, setIsOwnerMode, setMetaConnected]);

  useEffect(() => {
    if (user) {
      checkMetaConnection();
    }
  }, [user, checkMetaConnection]);

  const handleAnalyze = async () => {
    if (!profileUrl) return;
    
    setLoading(true);
    setError(null);
    setAnalysisStep('Initiating Social Scraping Engine...');
    
    try {
      setAnalysisStep('Deep Social Data Retrieval...');
      // Firecrawl fallback for url context
      let scrapedContent = "No direct scrape. Use search grounding for details.";
      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VITE_FIRECRAWL_API_KEY || ''}`
          },
          body: JSON.stringify({ url: profileUrl, options: { timeout: 45000 } })
        });
        const scrapeData = await scrapeResponse.json();
        if (scrapeData?.success && scrapeData?.data?.content) {
          scrapedContent = scrapeData.data.content.substring(0, 8000);
        }
      } catch (e) {
        console.warn('Scraping fallback: using purely AI model.');
      }

      setAnalysisStep('Generating AI Strategy Synthesis...');

      const prompt = `Act as an ELITE Social Intelligence & Media Buying Agency Strategy AI. You are tasked with analyzing a social media presence and constructing a 360-degree growth engine.
      
      INPUTS:
      Social Profile URL: ${profileUrl}
      
      SCRAPED PUBLIC CONTEXT:
      ${scrapedContent}
      
      ${sharedBudgetContext ? `BUDGET CONTEXT: ${JSON.stringify(sharedBudgetContext)}` : ''}
      ${sharedFunnelContext ? `PRE-FUNNEL CONTEXT: ${JSON.stringify(sharedFunnelContext)}` : ''}
      ${metaConnected && metaCampaigns.length > 0 ? `CONNECTED OWNER META ADS CONTEXT (Deep Analytics Mode - Use this real performance data to suggest what to tweak, pause, or run): ${JSON.stringify(metaCampaigns)}` : 'MODE: PUBLIC COMPETITOR MODE (Scraping only, no private insights available)'}

      INSTRUCTIONS (CRITICAL - FOLLOW EXACTLY):
      1. FIRST, automatically detect: platform type (TikTok, Instagram, YouTube, LinkedIn, X, Facebook, etc.), niche, business category, audience style.
      2. ADAPT YOUR STRATEGY BASED ON THE DETECTED PLATFORM:
         - TikTok: Focus on retention analysis, hook speed, trend velocity, fast pacing.
         - Instagram: Focus on branding consistency, reels performance, visual identity, aesthetics.
         - YouTube: Focus on retention structure, thumbnails, long-form engagement, SEO.
         - LinkedIn: Focus on authority positioning, educational content, B2B mechanics.
         - X/Twitter: Focus on engagement velocity, opinion-based virality.
         - Facebook: Focus on community, broad appeal, and older demographic ad strategies.
      3. OUTPUT MUST BE BLOW-AWAY INNOVATIVE. NOT generic AI fluff. Use real evidence, logical deductions, and strong agency-level intelligence.
      4. EXECUTIVE: Include what is missing, how to start, content type, posting frequency, branding needs, budget & currencies.
      5. COMPETITORS: Add their strength, workflow, estimated ad counts, estimated spend, pricing, main offers, dominant platforms, hooks used in reels/posts, and source data for each market.
      6. MEDIA BUYING: Explain EXACT number of campaigns, ad sets, ads per ad set. What each campaign and ad is about. When to start. How many ABO campaigns vs CBO campaigns and WHY. Specific budget allocations and WHY. Expected results and ON WHAT BASIS/EVIDENCE. Support multi-currencies (e.g. $, €, £, AED, SAR).
      7. METRICS: Calculate/estimate CPL, CPA, CR, CPR by market.
      8. MARKET: Assess product demand strength, spread, seasonality, exploitation, creation.
      9. PERSONAS & FUNNEL: Create buyer personas. Detail target audience and how to divide them across the funnel.
      10. ORGANIC CONTENT: Analyze the main page/channel. What needs changing? Best posts/reels. Why past reels/videos failed (e.g., analyze hook was good but video was boring/not visually impressive).
      11. CRITICAL ANTI-HALLUCINATION RULE: DO NOT invent metrics or competitors. If data is unavailable, deduce logically from public context but explicitly state your logical deduction process.
      12. Provide text outputs in rich markdown (use **, -, \n\n) inside the JSON strings. Do NOT use markdown code blocks (\`\`\`) wrapping the entire JSON output, just return the raw JSON object.
      
      REQUIRED JSON SCHEMA:
      {
        "executiveSummary": {
          "overview": "string (long markdown explaining missing elements, how to start, branding needs, budget needs, currency)",
          "platformSpecificAdaptation": "string",
          "postingFrequency": "string (innovative posting strategy)",
          "confidenceLevel": "string",
          "recommendedActions": "string"
        },
        "marketIntelligence": {
          "demandStrength": "string",
          "demandSpread": "string",
          "seasonalityAndExploitation": "string",
          "creationAndAwareness": "string",
          "marketSourceAndEvidence": "string",
          "deepReasoning": "string"
        },
        "personasAndFunnel": {
          "buyerPersonas": [
            {
              "name": "string",
              "description": "string",
              "painPoints": "string",
              "buyingTriggers": "string"
            }
          ],
          "targetAudienceFunnelSplit": "string (long markdown: how to segment audience Top, Middle, Bottom of Funnel)"
        },
        "competitorAnalysis": {
          "competitors": [
            {
              "name": "string",
              "strengthAndWorkflow": "string",
              "estimatedAdsCountAndSpend": "string (e.g., 'Runs 15 ads, est. $2k/day')",
              "pricingAndMainOffer": "string",
              "dominantPlatform": "string",
              "hooksUsedInReelsPosts": "string (detailed examples)",
              "sourceEvidence": "string"
            }
          ],
          "benchmarkComparisons": "string (long markdown)"
        },
        "mediaBuyingStrategy": {
          "campaignArchitecture": {
            "campaignCount": "number",
            "adSetsPerCampaign": "number",
            "adsPerAdSet": "number",
            "campaignsSetup": "string (long markdown: what each campaign is about, what each ad is about, when to start, and WHY)",
            "aboVsCboReasoning": "string (detailed logic, including EXACTLY how many ABO and how many CBO)"
          },
          "budgetAndMetrics": {
            "currency": "string",
            "budgetAllocationsAndWhy": "string (detailed: how much to put and why)",
            "expectedResultsAndBasis": "string (detailed: expected results and on what evidence did you base this prediction)",
            "targetMetricsCalculations": "string (long markdown estimating CPL, CPA, CR, CPR by market)"
          },
          "executionAndOptimization": {
            "platformSpecificNuances": "string",
            "whatToTweakPauseRun": "string (recommendations based on live campaigns and creatives if any are connected)"
          }
        },
        "organicContentAnalysis": {
          "pageAudit": "string (what is currently posted, what needs changing)",
          "bestPerformingFormats": "string",
          "failureAnalysis": "string (long markdown: why specific past reels/videos failed - e.g., hook was good but video boring/not visually impressive)",
          "specificRecommendations": [
            {
              "concept": "string",
              "rationale": "string",
              "specificImprovementAction": "string"
            }
          ]
        }
      }`;

      // Gemini generation
      const resultTxt = await analyzeWithGemini(prompt, true);
      const parsedData = JSON.parse(resultTxt.replace(/^\`\`\`json/m, '').replace(/\`\`\`$/m, '').trim());
      
      setReport(parsedData);
      setActiveTab('executive');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
      setAnalysisStep('');
    }
  };

  const renderTabButton = (id: TabType, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all whitespace-nowrap border-b-2",
        activeTab === id 
          ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" 
          : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ActivitySquare className="w-8 h-8 text-emerald-500" />
            Social Intelligence Hub
          </h1>
          <p className="text-gray-400 m-2 mt-4 max-w-2xl bg-white/5 p-4 rounded-xl border border-white/10 font-mono text-sm leading-relaxed">
            Full AI-powered social growth + competitive intelligence + media buying strategy engine.
          </p>
        </div>

        {/* Input Section */}
        <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
          <div className="mb-6 relative">
            <Link2 className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="Paste any social media URL (Instagram, TikTok, YouTube, LinkedIn, X)..."
              className="w-full pl-16 pr-6 py-6 bg-[#0B0F19] border-2 border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 text-white placeholder-gray-500 text-lg font-medium transition-all"
            />
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={loading || !profileUrl}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-lg rounded-xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {analysisStep}</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate Social Ecosystem Analysis</>
            )}
          </button>
          
          {error && (
            <div className="mt-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {report && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#080B12] to-indigo-900/20 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full"></div>
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 tracking-tight mb-1">
                  <ActivitySquare className="w-6 h-6 text-indigo-400" />
                  Intelligence Mode
                </h3>
                <p className="text-sm text-gray-400 font-medium">
                  Currently running in: <span className="text-indigo-300 font-bold px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/20">{isOwnerMode ? 'Connected Owner Mode' : 'Public Competitor Mode'}</span>
                </p>
                {!isOwnerMode && (
                  <p className="text-xs text-gray-500 mt-2">Showing scraping-based public intelligence. Connect your account for deep ad and retention metrics.</p>
                )}
              </div>
              <div className="flex gap-4 relative z-10 shrink-0">
                {!isOwnerMode ? (
                  <button onClick={() => setIsOwnerMode(true)} className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-xl border border-blue-400/30 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-200" />
                    Is this your social page?
                  </button>
                ) : (
                  <>
                    <button onClick={() => setIsOwnerMode(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all text-sm">
                      Back to Public Mode
                    </button>
                    {!metaConnected ? (
                      <button onClick={() => window.location.href = '/api/meta/connect'} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl border border-blue-400/30 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all text-sm flex items-center gap-2">
                        <Link2 className="w-5 h-5" /> Connect Meta Ads
                      </button>
                    ) : (
                      <div className="px-6 py-3 bg-emerald-500/10 text-emerald-400 font-black rounded-xl border border-emerald-500/20 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Meta Connected
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-white/5 no-scrollbar sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md z-30">
              {renderTabButton('executive', 'Executive Intel', <LayoutDashboard className="w-4 h-4" />)}
              {isOwnerMode && renderTabButton('connected_accts', 'Connected Accounts', <Users className="w-4 h-4" />)}
              {isOwnerMode && renderTabButton('campaign_mgmt', 'Campaign Control', <Compass className="w-4 h-4" />)}
              {isOwnerMode && renderTabButton('optimization_hx', 'Optimization History', <ActivitySquare className="w-4 h-4" />)}
              {renderTabButton('market', 'Market Economics', <TrendingUp className="w-4 h-4" />)}
              {renderTabButton('personas', 'Personas & Funnel', <Users className="w-4 h-4" />)}
              {renderTabButton('competitors', 'Competitor Warfare', <Target className="w-4 h-4" />)}
              {renderTabButton('mediaBuyer', 'Media Buying Engine', <Megaphone className="w-4 h-4" />)}
              {renderTabButton('content', 'Organic Audit', <BarChart3 className="w-4 h-4" />)}
            </div>

            {/* Tab Contents */}
            <div className="min-h-[500px]">
              {activeTab === 'connected_accts' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <h3 className="text-2xl font-black text-white">Connected Platforms & Pages</h3>
                  {metaConnected ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {metaAccounts.map((acc, idx) => (
                        <div key={idx} className="glass-panel p-6 rounded-3xl border-blue-500/30 bg-blue-500/5 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none transition-all group-hover:bg-blue-500/20"></div>
                          <h4 className="text-xl font-black text-white mb-2">{acc.name || 'Meta Ads Manager'}</h4>
                          <p className="text-sm text-gray-400">Act: {acc.adAccountId}</p>
                          <div className="mt-4 flex gap-2">
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-md">Connected</span>
                            {/* <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md">Active Spend: $1,200/d</span> */}
                          </div>
                        </div>
                      ))}
                      {metaAccounts.length === 0 && (
                        <>
                          <div className="glass-panel p-6 rounded-3xl border-blue-500/30 bg-blue-500/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none transition-all group-hover:bg-blue-500/20"></div>
                            <h4 className="text-xl font-black text-white mb-2">Meta Ads Manager</h4>
                            <p className="text-sm text-gray-400">Act: 12480129381</p>
                            <div className="mt-4 flex gap-2">
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-md">Connected</span>
                              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md">Active Spend: $1,200/d</span>
                            </div>
                          </div>
                          <div className="glass-panel p-6 rounded-3xl border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none transition-all group-hover:bg-indigo-500/20"></div>
                            <h4 className="text-xl font-black text-white mb-2">Facebook Page</h4>
                            <p className="text-sm text-gray-400">Super Brand Official</p>
                            <div className="mt-4 flex gap-2">
                              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-md">110k Followers</span>
                            </div>
                          </div>
                          <div className="glass-panel p-6 rounded-3xl border-pink-500/30 bg-pink-500/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-3xl pointer-events-none transition-all group-hover:bg-pink-500/20"></div>
                            <h4 className="text-xl font-black text-white mb-2">Instagram Business</h4>
                            <p className="text-sm text-gray-400">@super_brand</p>
                            <div className="mt-4 flex gap-2">
                              <span className="px-3 py-1 bg-pink-500/20 text-pink-400 text-xs font-bold rounded-md">High Engagement (4.2%)</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="glass-panel p-12 text-center rounded-3xl border-white/5 border-dashed flex flex-col items-center justify-center">
                      <Link2 className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="text-lg text-gray-300 font-bold mb-2">No platforms connected</p>
                      <p className="text-sm text-gray-500 mb-6">Connect Meta to enable live campaign control and real-time ROAS intelligence.</p>
                      <button onClick={() => window.location.href = '/api/meta/connect'} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl border border-blue-400/30 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2">
                        <Link2 className="w-5 h-5" /> Connect Meta Account
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'campaign_mgmt' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-white">Live Campaign Control</h3>
                    {metaConnected && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE SYNC</span>}
                  </div>
                  {!metaConnected ? (
                     <div className="glass-panel p-12 text-center rounded-3xl border-white/5 border-dashed">
                      <h4 className="text-lg font-bold text-white mb-2">Connect Meta to View Campaigns</h4>
                     </div>
                  ) : (
                    <div className="grid gap-4">
                      {metaCampaigns.length > 0 ? (
                        metaCampaigns.map((camp: any, idx: number) => (
                          <div key={idx} className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Compass className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-black">{camp.name || 'Unnamed Campaign'}</h4>
                                <p className="text-xs text-gray-400 mt-1">Status: {camp.status} | Spend: ${camp.spend || '0'}</p>
                              </div>
                            </div>
                            <div className="flex gap-4 items-center">
                              <div className="text-right">
                                <div className="text-blue-400 font-black text-lg">{camp.objective || 'N/A'}</div>
                              </div>
                              <button className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold rounded-lg transition-all text-xs border border-blue-500/20">
                                Analyze Performance
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          {/* Placeholder Live Campaign Items for layout preview */}
                          <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Compass className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-black">TOF | Broad | US & UK</h4>
                                <p className="text-xs text-gray-400 mt-1">CPA: $18.50 | Spend: $450/d</p>
                              </div>
                            </div>
                            <div className="flex gap-4 items-center">
                              <div className="text-right">
                                <div className="text-emerald-400 font-black text-lg">2.8x ROAS</div>
                                <div className="text-xs text-gray-500">Healthy (estimated)</div>
                              </div>
                              <button className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg transition-all text-xs border border-emerald-500/20">
                                Scale Budget
                              </button>
                            </div>
                          </div>

                          <div className="glass-panel p-6 rounded-2xl border-red-500/20 bg-red-500/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-black">MOF | Retargeting | 30d</h4>
                                <p className="text-xs text-red-400 mt-1">CPA: $38.20 (High) | Spend: $120/d</p>
                              </div>
                            </div>
                            <div className="flex gap-4 items-center">
                              <div className="text-right">
                                <div className="text-red-400 font-black text-lg">0.9x ROAS</div>
                                <div className="text-xs text-red-500/70">Fatigue Detected</div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg transition-all text-xs border border-red-500/20">
                                  Kill Campaign
                                </button>
                                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all text-xs border border-white/10">
                                  Generate Fix
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'optimization_hx' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <h3 className="text-2xl font-black text-white">Optimization History</h3>
                  <div className="glass-panel p-8 rounded-3xl border-white/5">
                    {metaConnected ? (
                      <div className="space-y-6">
                        <div className="flex gap-4 items-start border-l-2 border-emerald-500/30 pl-6 relative">
                          <div className="w-3 h-3 rounded-full bg-emerald-400 absolute -left-[7px] top-1" />
                          <div>
                            <h4 className="text-white font-bold mb-1">Budget Scaled: TOF | Broad | US & UK</h4>
                            <p className="text-sm text-gray-400">Increased budget by 15% ($390 to $450) due to stable CPA below $20.</p>
                            <span className="text-xs text-gray-500 mt-2 block">2 hours ago • Operator AI Auto-Pilot</span>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start border-l-2 border-indigo-500/30 pl-6 relative">
                          <div className="w-3 h-3 rounded-full bg-indigo-400 absolute -left-[7px] top-1" />
                          <div>
                            <h4 className="text-white font-bold mb-1">New Hooks Injected</h4>
                            <p className="text-sm text-gray-400">Pushed 3 new UGC hooks to MOF Retargeting after noticing creative decay (CTR dropped below 1.2%).</p>
                            <span className="text-xs text-gray-500 mt-2 block">Yesterday • AI Recommendation Engine</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-12 font-medium">No history available. Connect Meta to track automated optimizations.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'executive' && report.executiveSummary && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-3xl font-black text-white">Executive Operational Summary</h3>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-sm">
                      Confidence: {report.executiveSummary.confidenceLevel}
                    </div>
                  </div>
                  <div className="glass-panel p-8 rounded-3xl border-white/5 bg-[#080B12]">
                    <div className="grid grid-cols-1 gap-8">
                       <div>
                         <h4 className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-4">Strategic Overview & Starting Point</h4>
                         <div className="prose prose-invert max-w-none text-gray-300">
                           <Markdown remarkPlugins={[remarkGfm]}>{report.executiveSummary.overview}</Markdown>
                         </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                           <h4 className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-4">Platform Adaptation</h4>
                           <div className="prose prose-invert max-w-none text-sm text-gray-300">
                             <Markdown remarkPlugins={[remarkGfm]}>{report.executiveSummary.platformSpecificAdaptation}</Markdown>
                           </div>
                         </div>
                         <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                           <h4 className="text-xs text-pink-400 font-black uppercase tracking-widest mb-4">Content Posting Strategy</h4>
                           <div className="prose prose-invert max-w-none text-sm text-gray-300">
                             <Markdown remarkPlugins={[remarkGfm]}>{report.executiveSummary.postingFrequency}</Markdown>
                           </div>
                         </div>
                         <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                           <h4 className="text-xs text-blue-400 font-black uppercase tracking-widest mb-4">Recommended Actions</h4>
                           <div className="prose prose-invert max-w-none text-sm text-gray-300">
                             <Markdown remarkPlugins={[remarkGfm]}>{report.executiveSummary.recommendedActions}</Markdown>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'market' && report.marketIntelligence && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <h3 className="text-3xl font-black text-white">Market Intelligence & Economics</h3>
                  
                  <div className="glass-panel p-8 rounded-3xl border-white/5 bg-[#080B12] mb-6">
                    <h4 className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-4">Strategic Market Reasoning</h4>
                    <div className="prose prose-invert max-w-none text-gray-300">
                      <Markdown remarkPlugins={[remarkGfm]}>{report.marketIntelligence.deepReasoning}</Markdown>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(report.marketIntelligence).filter(([k]) => k !== 'deepReasoning').map(([key, val]) => (
                      <div key={key} className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5 h-full">
                        <h4 className="text-xs text-gray-500 font-black uppercase tracking-widest mb-3">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                          <Markdown remarkPlugins={[remarkGfm]}>{String(val)}</Markdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'personas' && report.personasAndFunnel && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <h3 className="text-3xl font-black text-white">Buyer Personas & Funnel Separation</h3>
                  
                  <div className="glass-panel p-8 rounded-3xl border-indigo-500/20 bg-[#080B12] mb-6">
                    <h4 className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-4">Target Audience Funnel Split</h4>
                    <div className="prose prose-invert max-w-none text-gray-300">
                      <Markdown remarkPlugins={[remarkGfm]}>{report.personasAndFunnel.targetAudienceFunnelSplit}</Markdown>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {report.personasAndFunnel.buyerPersonas.map((persona: any, idx: number) => (
                      <div key={idx} className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5">
                        <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                          <Users className="w-6 h-6 text-emerald-400" />
                          <h4 className="text-xl font-black text-white">{persona.name}</h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Description</h5>
                            <p className="text-sm text-gray-300 leading-relaxed max-h-32 overflow-y-auto no-scrollbar">{persona.description}</p>
                          </div>
                          <div>
                            <h5 className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">Pain Points</h5>
                            <p className="text-sm text-red-200 leading-relaxed">{persona.painPoints}</p>
                          </div>
                          <div>
                            <h5 className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Buying Triggers</h5>
                            <p className="text-sm text-blue-200 leading-relaxed">{persona.buyingTriggers}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'competitors' && report.competitorAnalysis && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <h3 className="text-3xl font-black text-white">Competitive Warfare & Benchmarks</h3>
                  
                  <div className="glass-panel p-8 rounded-3xl border-indigo-500/20 bg-indigo-500/5 mb-6">
                    <h4 className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-4">Benchmark Comparisons</h4>
                    <div className="prose prose-invert max-w-none text-gray-300">
                      <Markdown remarkPlugins={[remarkGfm]}>{report.competitorAnalysis.benchmarkComparisons}</Markdown>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {report.competitorAnalysis.competitors.map((comp: any, i: number) => (
                      <div key={i} className="glass-panel p-8 rounded-3xl border-white/5 bg-[#080B12]">
                        <h4 className="text-2xl font-black text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                          <Target className="w-6 h-6 text-emerald-500" />
                          {comp.name}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(comp).filter(([k]) => k !== 'name').map(([key, val]) => (
                            <div key={key} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                              <h5 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h5>
                              <p className="text-sm text-gray-300">{String(val)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'mediaBuyer' && report.mediaBuyingStrategy && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                   <h3 className="text-3xl font-black text-white">Media Buying Execution Engine</h3>
                   
                   <div className="glass-panel p-8 rounded-3xl border-white/5 bg-[#080B12] space-y-12">
                     
                     {/* Architecture */}
                     <div>
                       <h4 className="text-xl font-black text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
                         <Compass className="w-5 h-5 text-indigo-400" /> Campaign Architecture
                       </h4>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20">
                            <h5 className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-4">Structure & Setup Strategy</h5>
                            <div className="flex gap-4 mb-4 pb-4 border-b border-indigo-500/20">
                              <div className="text-center">
                                <div className="text-2xl font-black text-white">{report.mediaBuyingStrategy.campaignArchitecture?.campaignCount}</div>
                                <div className="text-[10px] text-indigo-300 font-bold uppercase">Campaigns</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-black text-white">{report.mediaBuyingStrategy.campaignArchitecture?.adSetsPerCampaign}</div>
                                <div className="text-[10px] text-indigo-300 font-bold uppercase">AdSets/Camp</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-black text-white">{report.mediaBuyingStrategy.campaignArchitecture?.adsPerAdSet}</div>
                                <div className="text-[10px] text-indigo-300 font-bold uppercase">Ads/AdSet</div>
                              </div>
                            </div>
                            <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                              <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.campaignArchitecture?.campaignsSetup || ''}</Markdown>
                            </div>
                         </div>
                         <div className="space-y-4">
                           <div className="bg-white/5 p-5 rounded-2xl border border-white/10 h-full">
                              <h5 className="text-[11px] text-gray-400 font-black uppercase mb-2">ABO vs CBO Strategic Logic</h5>
                              <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                                <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.campaignArchitecture?.aboVsCboReasoning || ''}</Markdown>
                              </div>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Budgets & Audiences */}
                     <div className="grid grid-cols-1 gap-8">
                        <div>
                           <h4 className="text-lg font-black text-white mb-4 border-b border-white/10 pb-2">Budgets & Currency</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20">
                                <h5 className="text-[11px] text-emerald-400 font-black uppercase mb-3">Allocations: {report.mediaBuyingStrategy.budgetAndMetrics?.currency || 'Unknown Currency'}</h5>
                                <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                                  <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.budgetAndMetrics?.budgetAllocationsAndWhy || ''}</Markdown>
                                </div>
                              </div>
                              <div className="bg-orange-500/5 p-5 rounded-2xl border border-orange-500/20">
                                <h5 className="text-[11px] text-orange-400 font-black uppercase mb-3">Expected Results & Basis</h5>
                                <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                                  <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.budgetAndMetrics?.expectedResultsAndBasis || ''}</Markdown>
                                </div>
                              </div>
                           </div>
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-white mb-4 border-b border-white/10 pb-2">Market Target Metrics (CPA, CPL, CR)</h4>
                           <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20">
                              <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                                <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.budgetAndMetrics?.targetMetricsCalculations || ''}</Markdown>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Execution & Optimization */}
                     <div>
                       <h4 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-3">Execution & Tweaks</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/20">
                            <h5 className="text-[11px] text-indigo-400 font-black uppercase mb-2">Platform Specific Nuances</h5>
                            <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                              <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.executionAndOptimization?.platformSpecificNuances || ''}</Markdown>
                            </div>
                         </div>
                         <div className="bg-orange-500/5 p-5 rounded-2xl border border-orange-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl pointer-events-none"></div>
                            <h5 className="text-[11px] text-orange-400 font-black uppercase mb-2 flex items-center gap-2">
                              {metaConnected ? <><Sparkles className="w-3 h-3" /> Live Analytics Tweak Recommendations</> : 'What to Tweak, Pause, or Run'}
                            </h5>
                            <div className="prose prose-invert text-sm text-gray-300 max-w-none">
                              <Markdown remarkPlugins={[remarkGfm]}>{report.mediaBuyingStrategy.executionAndOptimization?.whatToTweakPauseRun || ''}</Markdown>
                            </div>
                         </div>
                       </div>
                     </div>

                   </div>
                </div>
              )}

              {activeTab === 'content' && report.organicContentAnalysis && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <h3 className="text-3xl font-black text-white">Organic Content Audit & Failure Analysis</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="glass-panel p-8 rounded-3xl border-emerald-500/20 bg-[#080B12]">
                      <h4 className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-4">Page Audit & Actionable Changes</h4>
                      <div className="prose prose-invert max-w-none text-gray-300">
                        <Markdown remarkPlugins={[remarkGfm]}>{report.organicContentAnalysis.pageAudit}</Markdown>
                      </div>
                      <div className="mt-6 pt-4 border-t border-emerald-500/10">
                        <h5 className="text-[10px] text-emerald-300 font-black uppercase tracking-widest mb-2">Best Performing Formats</h5>
                        <p className="text-sm text-gray-300">{report.organicContentAnalysis.bestPerformingFormats}</p>
                      </div>
                    </div>
                    
                    <div className="glass-panel p-8 rounded-3xl border-red-500/20 bg-[#080B12]">
                      <h4 className="text-xs text-red-400 font-black uppercase tracking-widest mb-4">Creative Failure Analysis</h4>
                      <div className="prose prose-invert max-w-none text-gray-300">
                        <Markdown remarkPlugins={[remarkGfm]}>{report.organicContentAnalysis.failureAnalysis}</Markdown>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xl font-black text-white ml-2">Specific Innovative Recommendations</h4>
                    {report.organicContentAnalysis.specificRecommendations.map((rec: any, i: number) => (
                      <div key={i} className="glass-panel p-8 rounded-3xl border-white/5 bg-[#080B12]">
                        <h5 className="text-2xl font-black text-indigo-400 mb-6">{rec.concept}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                             <div className="bg-white/5 p-5 rounded-2xl border border-white/10 h-full">
                                <h6 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Rationale & Innovation</h6>
                                <p className="text-sm text-gray-300 leading-relaxed">{rec.rationale}</p>
                             </div>
                           </div>
                           <div className="space-y-4">
                             <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10 h-full">
                                <h6 className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">Specific Execution Plan</h6>
                                <p className="text-sm text-gray-300 leading-relaxed">{rec.specificImprovementAction}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
