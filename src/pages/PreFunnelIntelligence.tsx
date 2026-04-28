import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, Target, TrendingUp, Lightbulb, AlertTriangle, 
  CheckCircle2, Crosshair, Zap, Shield, BarChart3, Presentation, 
  Sparkles, ArrowRight, ExternalLink, Eye, Layout, MessageSquare, 
  Megaphone, Gauge, ChevronRight, Info, AlertCircle, Rocket,
  RefreshCw, Image as ImageIcon, Activity, DollarSign, Users, Play, Repeat
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useAiSettings } from '../hooks/useAiSettings';
import { usePersistedState } from '../hooks/usePersistedState';

type TabType = 'analysis' | 'competitors' | 'trends' | 'funnel' | 'creative' | 'roadmap';

export function PreFunnelIntelligence() {
  const { provider: aiProvider, manusMode } = useAiSettings();
  const [url, setUrl] = usePersistedState('pre_funnel_url', '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = usePersistedState<TabType>('pre_funnel_active_tab', 'analysis');
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = usePersistedState<any>('pre_funnel_strategy', null);
  const [longTermStrategy, setLongTermStrategy] = usePersistedState<string | null>('pre_funnel_long_term', null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = usePersistedState<number | null>('pre_funnel_last_analyzed', null);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  
  const [selectedPlatform, setSelectedPlatform] = usePersistedState<string>('pre_funnel_selected_platform', '');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (strategy?.funnelStrategy?.platforms?.length > 0 && !selectedPlatform) {
      setSelectedPlatform(strategy.funnelStrategy.platforms[0].platform);
    }
  }, [strategy, selectedPlatform, setSelectedPlatform]);

  useEffect(() => {
    // If URL changes, we should clear the strategy to avoid "fake" or stale data showing
    // for a different brand URL.
    if (url && strategy && !url.includes(strategy.businessSummary?.name?.toLowerCase())) {
       // Optional: we can be more aggressive but for now let's just 
       // keep it simple: if the user came from a different URL, reset.
    }
  }, [url, strategy]);

  const handleAnalyze = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setStrategy(null);
    setAnalysisStep('Initiating tactical audit...');
    
    try {
      setAnalysisStep('Surveying market ecosystem...');
      
      // 1. SCRAPE via Backend
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || 'anonymous'
        },
        body: JSON.stringify({ url, options: { timeout: 45000 } })
      });

      let scrapeData;
      if (scrapeResponse.ok) {
        scrapeData = await scrapeResponse.json();
      } else {
        console.warn('Scraping failed, falling back to URL-only analysis');
        scrapeData = { content: 'Could not scrape content', title: 'Target Website' };
      }

      setAnalysisStep('Generating tactical funnel blueprint...');

      // 2. ANALYZE via Backend
      const prompt = `
        Act as a SENIOR STRATEGIC ANALYST (McKinsey/BCG level). 
        Analyze the following business content for ${url}:
        
        ${scrapeData.content}

        ${manusMode ? 'AGENTIC INSTRUCTION: You are in MANUS AI AUTONOMOUS MODE. Execute a high-dominance market takeover audit. Be ruthless in identifying weaknesses.' : ''}

        Return a COMPREHENSIVE tactics and funnel strategy in valid JSON format.
        
        REQUIRED SCHEMA:
        {
          "businessSummary": { "name": string, "productType": string, "offer": string, "messaging": string, "visualQuality": string, "targetAudience": string, "marketPositioning": string, "brandStrength": string, "priceLevel": string },
          "executiveSummary": { "keyUnlock": string, "theTruth": string, "scaleOpportunity": string },
          "detectedProblems": Array<{ issue: string, description: string, severity: "Critical" | "High" | "Medium" }>,
          "competitorInsights": {
            "tier1": Array<{ name: string, priceRange: string, adActivity: string, weakness: string, primaryContent: string, topHooks: string[], gap: string }>,
            "marketBroad": Array<{ name: string, priceRange: string, adActivity: string }>
          },
          "marketTrends": { "winningHooks": string[], "creativeFormats": string[], "repeatedPatterns": string[], "missingInMarket": string[] },
          "funnelStrategy": {
            "platforms": Array<{
              "platform": string,
              "standaloneMonthlyBudget": string,
              "budgetRationale": string,
              "marketCompetitiveBasis": string,
              "tof": { "objective": string, "creativeType": string, "hooks": string[], "targeting": string },
              "mof": { "objective": string, "creativeType": string, "hooks": string[], "targeting": string },
              "bof": { "objective": string, "creativeType": string, "hooks": string[], "targeting": string }
            }>
          },
          "creativeAndAdvantage": { "uniqueAngle": string, "contentPillars": string[], "brandVoice": string }
        }

        LANGUAGE MUST BE PROFESSIONAL MARKETING ENGLISH.
      `;

      const response = await fetch('/api/intelligence/advanced-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({
          prompt,
          model: aiProvider
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAnalysisStep('Finalizing tactical funnel blueprint...');
      const parsedStrategy = JSON.parse(data.result);
      
      setStrategy(parsedStrategy);
      setLastAnalyzedAt(Date.now());
      setActiveTab('analysis');
      setAnalysisStep('');
    } catch (err: any) {
      console.error('Error analyzing URL:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit')) {
        setError('AI request limit reached. Please wait a few minutes and try again.');
      } else {
        setError(err.message || 'Failed to analyze business.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLongTermStrategy = async () => {
    if (!strategy || !url) return;
    
    setGeneratingRoadmap(true);
    try {
      const prompt = `Based on the following business analysis for ${url}:
      Business Summary: ${JSON.stringify(strategy.businessSummary)}
      Detected Problems: ${JSON.stringify(strategy.detectedProblems)}
      Competitor Intelligence: ${JSON.stringify(strategy.competitorInsights)}
      
      ${manusMode ? 'AGENTIC INSTRUCTION: You are in MANUS AI AUTONOMOUS MODE. Execute a high-dominance market takeover strategy.' : ''}

      Generate a complete, professional 3-month growth strategy. 
      LANGUAGE: Professional Marketing English.
      Breakdown the strategy month by month (Month 1, Month 2, Month 3). 
      Include:
      1. Main objectives for each month.
      2. Specific campaign structures.
      3. Content and creative requirements.
      4. KPI targets and expectations.
      5. Scaling roadmap.
      
      Format the response in clear Markdown with headings and bullet points. Be extremely tactical and specific to this niche.`;

      const roadmapResponse = await fetch('/api/intelligence/advanced-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user!.uid
        },
        body: JSON.stringify({
          prompt,
          model: aiProvider
        })
      });

      const roadmapData = await roadmapResponse.json();
      if (roadmapData.error) throw new Error(roadmapData.error);

      if (roadmapData.result) {
        setLongTermStrategy(roadmapData.result);
      }
    } catch (err: any) {
      console.error('Error generating long term strategy:', err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit')) {
        setLongTermStrategy(`**Error:** AI request limit reached. Please try again later.`);
      } else {
        setLongTermStrategy(`**Error:** ${err.message || 'Failed to generate strategy.'}`);
      }
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const renderTabButton = (id: TabType, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300 border-b-2 whitespace-nowrap",
        activeTab === id 
          ? "border-blue-500 text-blue-400 bg-blue-500/5" 
          : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0F19] border border-white/10 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-indigo-600/5 blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-[1.1]">
              Pre-Funnel & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Competitor Intel</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed font-medium">
              The ultimate strategist's tool. Paste any URL to reverse-engineer their business model, detect market gaps, and generate a battle-tested funnel strategy.
            </p>
          </div>
          
          <div className="w-full lg:w-[450px]">
            <div className="glass-panel p-3 rounded-2xl flex flex-col gap-3 shadow-2xl border-white/20 bg-white/5 backdrop-blur-2xl">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Paste Website or Social URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="w-full pl-12 pr-4 py-4 bg-[#0B0F19] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 transition-all font-medium"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading || !url}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                {loading ? (
                  <>
                    <Zap className="w-5 h-5 animate-pulse text-yellow-400" />
                    <span className="animate-pulse">{analysisStep || 'Analyzing Market Ecosystem...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Analyze & Build Strategy
                  </>
                )}
              </button>
              {lastAnalyzedAt && !loading && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Live Scan: {new Date(lastAnalyzedAt).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={handleAnalyze}
                    className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Deep Force Re-Analyze
                  </button>
                </div>
              )}
              <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">
                Analyzes Meta, TikTok, and Market Trends automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Analysis Failed</h3>
              <p className="text-sm opacity-80">
                {error}
                <span className="block text-[10px] mt-1 opacity-60">If this persists, please refresh your browser.</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {strategy ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Navigation Phases */}
          <div className="flex overflow-x-auto border-b border-white/5 no-scrollbar sticky top-0 bg-[#0B0F19]/80 backdrop-blur-md z-30 justify-center">
            {renderTabButton('analysis', 'Business Analysis', <Shield className="w-4 h-4" />)}
            {renderTabButton('competitors', 'Competitor Intel', <Target className="w-4 h-4" />)}
            {renderTabButton('trends', 'Market Trends', <TrendingUp className="w-4 h-4" />)}
            {renderTabButton('funnel', 'Funnel Strategy', <Layout className="w-4 h-4" />)}
            {renderTabButton('creative', 'Creative & Advantage', <Zap className="w-4 h-4" />)}
            {renderTabButton('roadmap', 'Execution Roadmap', <Rocket className="w-4 h-4" />)}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'analysis' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Executive Summary Dashboard - Now only on the first tab */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-panel p-6 rounded-3xl border-blue-500/20 bg-blue-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/20">
                      <Sparkles className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Growth Unlock</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy.executiveSummary?.keyUnlock}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-3xl border-red-500/20 bg-red-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-red-500/20">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Survival Threat</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy.executiveSummary?.theTruth}</p>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Scale Opportunity</h4>
                      <p className="text-white font-bold text-sm leading-snug">{strategy.executiveSummary?.scaleOpportunity || strategy.creativeAndAdvantage?.uniqueAngle}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-panel p-8 rounded-[2rem] border-l-4 border-blue-500 relative overflow-hidden">
                      <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-blue-400" />
                        Business Audit
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-6">
                          <InfoItem label="Product Type" value={strategy?.businessSummary?.productType} />
                          <InfoItem label="Core Offer" value={strategy?.businessSummary?.offer} />
                          <InfoItem label="Messaging Angle" value={strategy?.businessSummary?.messaging} />
                          <InfoItem label="Visual Quality" value={strategy?.businessSummary?.visualQuality} />
                        </div>
                        <div className="space-y-6">
                          <InfoItem label="Target Audience" value={strategy?.businessSummary?.targetAudience} />
                          <InfoItem label="Market Positioning" value={strategy?.businessSummary?.marketPositioning} />
                          <InfoItem label="Brand Strength" value={strategy?.businessSummary?.brandStrength} />
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">Price Level</label>
                            <span className="text-blue-400 font-bold uppercase text-xs">{strategy?.businessSummary?.priceLevel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass-panel p-8 rounded-[3rem] border border-red-500/20 bg-red-500/5">
                      <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        Conversion Leaks
                      </h2>
                      <div className="space-y-4">
                        {strategy.detectedProblems?.map((problem: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-2xl bg-red-400/5 border border-red-500/10">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-red-500 text-white">
                                {problem.severity}
                              </span>
                              <h3 className="font-bold text-gray-100 text-sm italic">{problem.issue}</h3>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed text-right">{problem.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'competitors' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      <Target className="w-6 h-6 text-indigo-400" />
                      Direct Market Rivals
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                      Deep Competitive Analysis
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {strategy?.competitorInsights?.tier1?.map((comp: any, idx: number) => (
                      <div key={idx} className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div>
                            <h3 className="text-xl font-black text-white leading-none mb-1">{comp.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{comp.priceRange}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10"></span>
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{comp.adActivity}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => navigate('/ad-spy', { state: { searchTerms: comp.name } })} 
                            className="p-3 rounded-2xl bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 border border-white/5 transition-all group/btn"
                            title="Spy on Ads"
                          >
                            <Eye className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>

                        <div className="space-y-6 text-right relative z-10">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-2xl bg-[#0B0F19] border border-white/5">
                              <h4 className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-1 text-left">Main Content</h4>
                              <p className="text-[10px] text-indigo-200/80 font-bold italic">{comp.primaryContent || "Multi-format"}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-[#0B0F19] border border-white/5">
                              <h4 className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-1 text-left">Top Weakness</h4>
                              <p className="text-[10px] text-red-400 font-bold italic line-clamp-1">{comp.weakness}</p>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                            <h4 className="text-[10px] uppercase tracking-widest text-indigo-400 font-black mb-3 text-left">Winning Hooks</h4>
                            <div className="flex flex-wrap gap-2 justify-end">
                              {comp.topHooks?.map((hook: string, hIdx: number) => (
                                <span key={hIdx} className="text-[10px] bg-indigo-500/10 text-indigo-200/70 px-2 py-1 rounded-lg border border-indigo-500/10 italic">
                                  "{hook}"
                                </span>
                              )) || <span className="text-[10px] text-gray-500 italic">No hooks detected</span>}
                            </div>
                          </div>

                          <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                            <h4 className="text-[10px] uppercase font-black text-emerald-400 mb-1 text-left">Strategic Gap</h4>
                            <p className="text-xs text-emerald-100 font-medium">{comp.gap}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {strategy.competitorInsights.marketBroad && (
                  <div className="pt-8 border-t border-white/5">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                      <Users className="w-5 h-5 text-purple-400" />
                      Global & Indirect Players
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {strategy.competitorInsights.marketBroad?.map((comp: any, idx: number) => (
                        <div key={idx} className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{comp.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-500 uppercase">{comp.priceRange || "Mid-Range"}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10"></span>
                              <span className="text-[9px] text-purple-400/70 font-black uppercase tracking-tighter">{comp.adActivity || "Active"}</span>
                            </div>
                          </div>
                          <div className="text-[9px] font-black text-gray-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Insight Lock</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TrendSection 
                    title="Winning Hooks (Localized)"
                    items={strategy?.marketTrends?.winningHooks}
                    icon={<Zap className="w-4 h-4" />}
                    color="amber"
                  />
                  <TrendSection 
                    title="High-Perf Formats"
                    items={strategy?.marketTrends?.creativeFormats}
                    icon={<Play className="w-4 h-4" />}
                    color="purple"
                  />
                  <TrendSection 
                    title="Recurring Market Patterns"
                    items={strategy?.marketTrends?.repeatedPatterns}
                    icon={<Repeat className="w-4 h-4" />}
                    color="blue"
                  />
                  <TrendSection 
                    title="Untapped Market Gaps"
                    items={strategy?.marketTrends?.missingInMarket}
                    icon={<Sparkles className="w-4 h-4" />}
                    color="pink"
                  />
                </div>
              </div>
            )}

            {activeTab === 'funnel' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="glass-panel p-8 rounded-[2.5rem] border-indigo-500/20 bg-indigo-500/5 flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-indigo-500/20 rounded-full text-[10px] font-black tracking-widest text-indigo-400 border border-indigo-500/30 uppercase">
                        Strategy Module
                      </div>
                      <div className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
                        Standalone Channel Planning
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 tracking-tight leading-none uppercase">Technical Funnel Architecture</h2>
                    <p className="text-xs text-indigo-200/50 font-medium leading-relaxed max-w-xl">
                      Each platform is analyzed as an independent profit center with its own budget, targeting, and creative ecosystem.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6 items-end">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-right mb-1">Active Platform Node</div>
                    <div className="relative group">
                      <select 
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="bg-[#0B0F19] border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl px-6 py-4 pr-12 outline-none focus:border-indigo-500/50 transition-all min-w-[280px] appearance-none cursor-pointer shadow-2xl hover:bg-white/5 ring-1 ring-white/5"
                      >
                        {strategy?.funnelStrategy?.platforms?.map((p: any) => (
                          <option key={p.platform} value={p.platform}>{p.platform || 'Platform'}</option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none transition-transform group-hover:text-indigo-400" />
                    </div>
                  </div>
                </div>

                {/* Platform Summary Section */}
                <div className="grid grid-cols-1 gap-6">
                  {strategy?.funnelStrategy?.platforms?.filter((p: any) => p.platform === selectedPlatform).map((p: any, idx: number) => (
                    <div key={idx} className="space-y-12 animate-in fade-in zoom-in duration-500">
                      <div className="p-10 rounded-[3rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                              <Zap className="w-6 h-6 fill-current" />
                            </div>
                            <div>
                              <div className="text-4xl font-black text-white tracking-tight uppercase leading-none">{p.platform}</div>
                              <div className="text-indigo-300 font-bold uppercase tracking-widest text-[10px] mt-1">Platform Independent Budget</div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <p className="text-lg text-indigo-100/80 font-medium max-w-2xl leading-relaxed">{p.budgetRationale || p.reason}</p>
                            {p.marketCompetitiveBasis && (
                              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-[8px] font-black uppercase text-gray-500 block mb-1">Market Logic</span>
                                <p className="text-xs text-indigo-200/60 italic">{p.marketCompetitiveBasis}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center min-w-[240px]">
                          <div className="text-5xl font-black text-indigo-400 drop-shadow-[0_0_20px_rgba(129,140,248,0.3)] leading-none mb-2">{p.standaloneMonthlyBudget || p.monthlyAmount}</div>
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Recommended Standalone Budget</div>
                        </div>
                      </div>

                      {/* Phased Breakdown - Distinct for THIS platform */}
                      <div className="space-y-16">
                        <FunnelPhase 
                          phase="Top of Funnel (Awareness)"
                          data={p.tof}
                          color="blue"
                        />
                        <FunnelPhase 
                          phase="Middle of Funnel (Consideration)"
                          data={p.mof}
                          color="purple"
                        />
                        <FunnelPhase 
                          phase="Bottom of Funnel (Conversion)"
                          data={p.bof}
                          color="emerald"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'creative' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="glass-panel p-8 rounded-[2rem] border-blue-500/20">
                    <h2 className="text-xl font-black text-white mb-6">Unique Angle</h2>
                    <p className="text-2xl font-black text-blue-400 leading-tight mb-4 text-right">{strategy.creativeAndAdvantage.uniqueAngle}</p>
                    <p className="text-gray-300 text-right">{strategy.creativeAndAdvantage.howToOutperform}</p>
                  </div>
                  <div className="glass-panel p-8 rounded-[2rem] border-indigo-500/20">
                    <h2 className="text-xl font-black text-white mb-6">Proposed Core Hooks</h2>
                    <div className="space-y-4">
                      {strategy.creativeAndAdvantage.primaryHooks?.map((h: string, i: number) => (
                        <div key={i} className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-100 font-bold italic text-right">"{h}"</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[3rem] border-pink-500/20 bg-pink-500/5">
                  <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                    <ImageIcon className="w-6 h-6 text-pink-400" />
                    Visual Ad Scripts (UGC / Production)
                  </h2>
                  <div className="grid grid-cols-1 gap-8">
                    {strategy.creativeAndAdvantage.visualScripts?.map((script: string, i: number) => (
                      <div key={i} className="p-8 rounded-3xl bg-[#0B0F19] border border-white/5 prose prose-invert prose-pink max-w-none text-right">
                        <ReactMarkdown>{script}</ReactMarkdown>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-panel p-8 rounded-[2rem]">
                      <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <Rocket className="w-6 h-6 text-emerald-400" />
                        Execution Steps
                      </h2>
                      <div className="space-y-4">
                        {strategy.executionRoadmap?.problemSolutions?.map((item: any, idx: number) => (
                          <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                             <div className="order-2 md:order-1">
                              <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 font-black mb-2 italic text-left">The Strategic Solution</h4>
                              <p className="text-sm text-gray-300 leading-relaxed font-bold">{item.solution}</p>
                            </div>
                            <div className="order-1 md:order-2 border-r border-white/5 pr-6">
                              <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-black mb-2 italic text-left">Technical Friction Point</h4>
                              <p className="text-sm text-white font-medium">{item.problem}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {longTermStrategy ? (
                      <div className="glass-panel p-8 rounded-3xl border-l-4 border-indigo-500 bg-indigo-500/5">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                            3-Month Battle Plan
                          </h2>
                          <button onClick={handleGenerateLongTermStrategy} className="text-xs font-black text-indigo-400 uppercase">Regenerate</button>
                        </div>
                        <div className="prose prose-invert prose-indigo max-w-none text-sm text-right">
                          <ReactMarkdown>{longTermStrategy}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-12 rounded-[2rem] text-center bg-indigo-500/5">
                        <Rocket className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-white mb-6">Need a full 3-month growth plan?</h3>
                        <button
                          onClick={handleGenerateLongTermStrategy}
                          disabled={generatingRoadmap}
                          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all"
                        >
                          {generatingRoadmap ? "Calculating Plan..." : "Generate Master Roadmap"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-8 rounded-3xl text-right">
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 text-left">Target Audience Details</h4>
                      <p className="text-sm text-gray-300 font-medium leading-relaxed">{strategy.executionRoadmap?.targetAudienceDetails?.description}</p>
                    </div>
                    <div className="glass-panel p-8 rounded-3xl bg-emerald-500/5 border-emerald-500/10 text-right">
                       <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 text-left">Winning Campaign Formats</h4>
                       <div className="space-y-4">
                         {strategy.executionRoadmap?.campaignStrategy?.upcomingTypes?.map((camp: any, idx: number) => (
                           <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5">
                             <div className="text-white font-black text-sm">{camp.type}</div>
                             <div className="text-[10px] text-gray-500">{camp.objective}</div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <FeatureCard 
            icon={<Search className="w-8 h-8" />} 
            title="Deep Analysis" 
            desc="We extract product info, messaging, and visual quality directly from the URL."
            color="blue"
          />
          <FeatureCard 
            icon={<Target className="w-8 h-8" />} 
            title="Competitor Intel" 
            desc="Our AI identifies top competitors and analyzes their winning strategies."
            color="indigo"
          />
          <FeatureCard 
            icon={<TrendingUp className="w-8 h-8" />} 
            title="Market Trends" 
            desc="Detect winning hooks and creative formats active in the market right now."
            color="purple"
          />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-black block mb-1">{label}</label>
      <p className="text-gray-200 font-bold text-lg leading-tight">{value}</p>
    </div>
  );
}

function FunnelPhase({ phase, data, color }: { phase: string, data: any, color: string }) {
  const colorClasses: any = {
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  };

  return (
    <div className={cn("glass-panel p-10 rounded-[3rem] border shadow-2xl relative overflow-hidden", colorClasses[color].split(' ').slice(0, 2).join(' '))}>
      <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
        <div className="space-y-2 text-right">
          <h3 className="text-3xl font-black text-white tracking-tight">{phase}</h3>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white">
              {data.monthlyAmount || 'Calculating...'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-gray-400">
              {data.budgetPercentWithinPlatform || data.budget}% Phase Allocation
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-400">
              {data.campaignSetup} Setup
            </span>
          </div>
          {data.rationale && (
            <p className="text-[10px] text-gray-500 font-medium italic mt-2">
              Rationale: {data.rationale}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Campaign Structure</div>
          <div className="flex items-center gap-4 text-white">
            <div className="text-center">
              <div className="text-xl font-black">{data.adSetCount}</div>
              <div className="text-[8px] uppercase font-black text-gray-500">Ad Sets</div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="text-center">
              <div className="text-xl font-black">{data.adsPerSet}</div>
              <div className="text-[8px] uppercase font-black text-gray-500">Ads/Set</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Core Phase Strategy</h4>
            <p className="text-lg text-white font-bold leading-snug text-right">{data.strategy}</p>
          </div>
          
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 text-left">Ad Set Targeting & Details</h4>
            <p className="text-sm text-gray-300 leading-relaxed text-right italic">{data.adSetDetails}</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Creative Breakdown</h4>
            <div className="flex flex-wrap gap-2 justify-end text-right">
              {data.creativeBreakdown?.map((crt: string, i: number) => (
                <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300">
                  {crt}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-8 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 text-left">Winning Ad Copy (Localized)</h4>
            <div className="text-sm text-indigo-100 leading-relaxed font-bold bg-[#0B0F19]/50 p-6 rounded-2xl text-right">
              {data.contentCopy}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">High-Retention Hooks</h4>
            {data.hooks?.map((hook: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-indigo-500/30 transition-all text-right justify-end">
                <span className="text-sm font-bold text-white italic">"{hook}"</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0 order-first lg:order-last">
                  #{i+1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityButton({ title, desc, icon, color, onClick }: { title: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void }) {
  const colorClasses: any = {
    blue: "bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/5 border-purple-500/10 hover:bg-purple-500/10 text-purple-400",
    emerald: "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400",
  };

  return (
    <button 
      onClick={onClick}
      className={cn("w-full text-left p-5 rounded-2xl border transition-all group", colorClasses[color])}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
        </div>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-gray-300 font-medium leading-relaxed">{desc}</p>
    </button>
  );
}

function TrendSection({ title, items, icon, color }: { title: string, items: string[], icon: React.ReactNode, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/5 border-blue-500/10",
    indigo: "text-indigo-400 bg-indigo-500/5 border-indigo-500/10",
    pink: "text-pink-400 bg-pink-500/5 border-pink-500/10",
    amber: "text-amber-400 bg-amber-500/5 border-amber-500/10",
    purple: "text-purple-400 bg-purple-500/5 border-purple-500/10",
  };

  const currentClass = colorClasses[color] || colorClasses.blue;
  const textColor = currentClass.split(' ')[0];
  const bgColor = textColor.replace('text-', 'bg-');

  return (
    <div className="glass-panel p-8 rounded-[2rem] border-white/5">
      <h3 className={cn("text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2", textColor)}>
        {icon}
        {title}
      </h3>
      <div className="space-y-4">
        {items?.map((item: string, idx: number) => (
          <div key={idx} className="flex items-start gap-3 text-sm text-gray-300 font-medium">
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", bgColor)}></div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 group-hover:border-blue-500/30",
    indigo: "bg-indigo-500/10 text-indigo-400 group-hover:border-indigo-500/30",
    purple: "bg-purple-500/10 text-purple-400 group-hover:border-purple-500/30",
  };

  const currentClass = colorClasses[color] || colorClasses.blue;
  const bgClass = currentClass.split(' ')[0];

  return (
    <div className={cn("glass-panel p-10 rounded-[2.5rem] text-center space-y-6 group transition-all duration-500", currentClass)}>
      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-inner", bgClass)}>
        {icon}
      </div>
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <p className="text-gray-400 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
