import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Globe, 
  Zap, 
  Sparkles, 
  Link as LinkIcon, 
  ChevronRight, 
  Twitter, 
  Facebook, 
  Instagram, 
  Video, 
  Languages, 
  TrendingUp, 
  Layout, 
  Palette, 
  AlertCircle,
  CheckCircle2,
  Share2,
  Plus,
  ArrowRight,
  Flame,
  MessageSquare,
  Maximize2,
  Clock,
  Compass,
  BrainCircuit
} from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeWebsite, scrapeSocialPage } from '../services/scraper';
import { usePersistedState } from '../hooks/usePersistedState';

interface ContentPlan {
  competitorAnalysis: {
    topCompetitors: string[];
    rivalStrategies: string[];
    gapOpportunity: string;
    rationale: string;
    marketSophistication: string; // Stage 1-5
  };
  audiencePersonas: Array<{
    title: string;
    demographics: string;
    painPoints: string[];
    psychographicTrigger: string;
    buyingObjection: string;
    bridgeToSolution: string;
  }>;
  creativeMatrix: Array<{
    style: 'Clinical' | 'Viral' | 'Lifestyle' | 'Urgent' | 'Brutalist';
    creativeDirection: string;
    visualCues: string[];
    tonality: string;
    exampleHook: string;
  }>;
  angles: Array<{
    title: string;
    description: string;
    psychologicalDriver: string;
    strategicDepth: string;
    rationale: string;
  }>;
  hooks: {
    aggressive: string[];
    curiosity: string[];
    emotional: string[];
    patternInterrupt: string[];
  };
  adIntelligence: {
    copies: Array<{
      hook: string;
      body: string;
      cta: string;
      platform: 'Meta' | 'TikTok' | 'Google';
      rationale: string;
    }>;
    creativeAngles: string[];
  };
  ugcConcepts: Array<{
    scenario: string;
    vibe: string;
    keyMessage: string;
    rationale: string;
  }>;
  prAdsIdeas: Array<{
    headline: string;
    narrative: string;
    impact: string;
    rationale: string;
  }>;
  trends: string[];
  culturalAdaptations: Array<{
    region: string;
    language: string;
    nuance: string;
    suggestedHook: string;
  }>;
  productFocus: {
    features: string[];
    benefits: string[];
    uniqueSellingPoint: string;
  };
}

export function ContentArchitect() {
  const [url, setUrl] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedCountry, setSelectedCountry] = useState('Global');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ContentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'ads' | 'ugc' | 'market' | 'deep'>('market');
  const [preFunnelStrategy] = usePersistedState<any>('pre_funnel_strategy', null);

  const languages = ['English', 'Arabic', 'French', 'Spanish', 'German', 'Chinese', 'Japanese', 'Russian', 'Portuguese', 'Hindi'];
  const countries = ['Global', 'Egypt', 'Saudi Arabia', 'UAE', 'USA', 'UK', 'France', 'Germany', 'China', 'Japan', 'Brazil'];

  const handleAnalyze = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      // Step 1: Scrape content
      let scrapedData;
      if (url.includes('facebook.com') || url.includes('instagram.com') || url.includes('tiktok.com')) {
        const platform = url.includes('facebook') ? 'facebook' : url.includes('instagram') ? 'instagram' : 'tiktok';
        scrapedData = await scrapeSocialPage(url, platform as any);
      } else {
        scrapedData = await scrapeWebsite(url);
      }

      // Step 2: Analysis with Gemini
      const prompt = `
        You are an ELITE GLOBAL GROWTH ARCHITECT (Tier-1 Growth Lead from companies like Meta, Google, or high-tier agencies like Ogilvy/VaynerMedia). 
        
        MISSION: 
        Transform the provided raw data into a Battle-Tested Growth Blueprint. 
        Your output must be COLD, ANALYTICAL, and BRUTALLY REALISTIC. No generic AI fluff.
        SOURCE DATA:
        Website/Brand Content: ${JSON.stringify(scrapedData)}
        ${preFunnelStrategy ? `Strategic Pre-Funnel Context (USE THIS FOR CONSISTENCY): ${JSON.stringify({
          businessSummary: preFunnelStrategy.businessSummary,
          competitorInsights: preFunnelStrategy.competitorInsights,
          marketTrends: preFunnelStrategy.marketTrends
        })}` : ''}
        
        TARGET PARAMETERS:
        Geo: ${selectedCountry}
        Language: ${selectedLanguage}
        
        PHASE 1: THE MARKET TRUTH (SITUATIONAL ANALYSIS)
        - Determine "Market Sophistication" (Eugene Schwartz Stage 1-5). Be precise.
        - Identify 3 ACTUAL direct competitors that are currently scaling.
        - Analyze why they are winning and find the "Update Gap" where we can strike.

        PHASE 2: DEEP INTEL (HUMAN PSYCHOLOGY)
        1. SITUATIONAL PERSONAS: Do not give me generic demos. Give me "Triggering Moments".
           - Example: "The 2:00 AM Anxiety Session" or "The Mid-Meeting Comparison Loop".
           - Define their exact "Friction Point" and the "Psychographic Lever" we need to pull.
        2. CREATIVE MATRIX: 5 Distinct stylistic war-rooms.
           - Clinical (Data-heavy, trust), Viral (High-energy, hook-first), Lifestyle (Aspirational, smooth), Urgent (Direct, loss-aversion), Brutalist (Raw, honest, high-trust).
           - Provide specific Visual Cues and Tonality.

        PHASE 3: AD OPS & VIRAL LAB
        - AD COPIES: Write professionally localized ad copies using Direct Response (PAS/AIDA).
        - UGC SCRIPTS: Scenarios that feel NATIVE to the platform (Meta/TikTok).
        - HOOKS: A specialized matrix of Aggressive, Curiosity, and Pattern-Interrupt hooks.

        MANDATORY RULES:
        - Output MUST be valid JSON.
        - RATIONALE: Every tactical recommendation MUST reference a psychological principle or market data signal.
        - TONE: High-end consulting style. Actionable, not inspirational.
        - Use single quotes (') for quotes within strings to avoid JSON breaks.
        - LANGUAGE: Professional ${selectedLanguage} (Using industry terms properly).

        JSON SCHEMA (REQUIRED):
        {
          "competitorAnalysis": {
            "topCompetitors": ["Names only"],
            "rivalStrategies": ["Specific tactics they use"],
            "gapOpportunity": "Winning gap description",
            "rationale": "Market principle backing this gap",
            "marketSophistication": "Stage X + logic"
          },
          "audiencePersonas": [
            {
              "title": "Trigger Situation Title",
              "demographics": "Detailed context",
              "painPoints": ["Raw emotional pains"],
              "psychographicTrigger": "The deep psychological lever",
              "buyingObjection": "The internal barrier to buying",
              "bridgeToSolution": "Tactical hook to overcome it"
            }
          ],
          "creativeMatrix": [
            {
              "style": "Clinical/Viral/Lifestyle/Urgent/Brutalist",
              "creativeDirection": "Visual architecture",
              "visualCues": ["Specific visual elements"],
              "tonality": "Voice description",
              "exampleHook": "Headline/Hook"
            }
          ],
          "angles": [{"title": "...", "description": "...", "strategicDepth": "...", "psychologicalDriver": "...", "rationale": "..."}],
          "hooks": {"aggressive": ["..."], "curiosity": ["..."], "emotional": ["..."], "patternInterrupt": ["..."]},
          "adIntelligence": {
            "copies": [{"hook": "...", "body": "...", "cta": "...", "platform": "Meta/TikTok/Google", "rationale": "..."}],
            "creativeAngles": ["..."]
          },
          "ugcConcepts": [{"scenario": "...", "vibe": "...", "keyMessage": "...", "rationale": "..."}],
          "prAdsIdeas": [{"headline": "...", "narrative": "...", "impact": "...", "rationale": "..."}],
          "trends": ["Trending keywords/themes"],
          "culturalAdaptations": [{"region": "...", "language": "...", "nuance": "...", "suggestedHook": "..."}],
          "productFocus": {"features": ["..."], "benefits": ["..."], "uniqueSellingPoint": "..."}
        }
      `;

      const result = await analyzeWithGemini(prompt, true);
      
      // Sanitization step
      let sanitizedResult = result.trim();
      
      // Remove markdown blocks if they still appear despite JSON mode
      if (sanitizedResult.includes('```')) {
        sanitizedResult = sanitizedResult.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      // Final attempt to find the JSON object if there's surrounding text
      const firstBrace = sanitizedResult.indexOf('{');
      const lastBrace = sanitizedResult.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        sanitizedResult = sanitizedResult.substring(firstBrace, lastBrace + 1);
      }
      
      try {
        setAnalysisResult(JSON.parse(sanitizedResult));
        setActiveTab('market');
      } catch (parseErr) {
        console.error("JSON Parse Error. Raw result:", result);
        throw new Error("The AI returned an invalid content structure. This usually happens with very long responses. Please try again.");
      }
    } catch (err: any) {
       console.error("Analysis failed:", err);
       setError(err.message || "Failed to architect content. Please check the URL and your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-20 overflow-x-hidden">
      {/* Header Section */}
      <section className="relative pt-12 pb-20 px-6 border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-accent/5 -skew-x-12 translate-x-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Global Engine 5.0
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 uppercase">
              THE CONTENT <br />
              <span className="text-brand-accent">ARCHITECT</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl font-medium">
              Transform any URL into a production-ready ad ecosystem. Competitor auditing, multi-cultural angles, and high-conversion ad copies.
            </p>
          </motion.div>

          <div className="mt-12 flex flex-col xl:flex-row gap-4 items-stretch">
             <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-brand-accent/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative h-full flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all focus-within:border-brand-accent/50">
                  <div className="pl-6 text-gray-500 shrink-0">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter Product URL, Instagram ID, or Sales Page..."
                    className="w-full bg-transparent border-none py-6 px-6 text-white text-lg focus:outline-none placeholder:text-gray-600 font-bold"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative min-w-[180px]">
                   <div className="absolute top-3 left-4 text-[9px] font-black uppercase text-gray-500 tracking-widest z-10">Language</div>
                   <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full h-full bg-brand-panel border border-white/10 rounded-2xl pt-8 pb-3 px-4 text-white font-bold appearance-none cursor-pointer focus:outline-none focus:border-brand-accent/50 transition-all shadow-xl"
                   >
                      {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                   </select>
                   <Languages className="absolute right-4 bottom-4 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                <div className="relative min-w-[180px]">
                   <div className="absolute top-3 left-4 text-[9px] font-black uppercase text-gray-500 tracking-widest z-10">Target Country</div>
                   <select 
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full h-full bg-brand-panel border border-white/10 rounded-2xl pt-8 pb-3 px-4 text-white font-bold appearance-none cursor-pointer focus:outline-none focus:border-brand-accent/50 transition-all shadow-xl"
                   >
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <Globe className="absolute right-4 bottom-4 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !url}
                  className={cn(
                    "h-auto py-6 px-12 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shrink-0 min-w-[240px]",
                    isAnalyzing 
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                      : "bg-brand-accent text-white hover:bg-brand-accent-hover hover:shadow-brand-accent/20"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      ARCHITECTING...
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      BUILD ENGINE
                    </>
                  )}
                </button>
             </div>
          </div>
          
          {error && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500"
            >
               <AlertCircle className="w-5 h-5" />
               <p className="font-bold text-sm tracking-tight">{error}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Main Results Area */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto mt-12 px-6"
          >
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 bg-brand-panel p-1.5 rounded-[2rem] border border-white/5 mb-12 w-fit">
              {[
                { id: 'market', label: 'Market Pulse', icon: Compass },
                { id: 'deep', label: 'Deep Intel', icon: BrainCircuit },
                { id: 'plan', label: 'Strategic Plan', icon: Layout },
                { id: 'ads', label: 'Ad Intelligence', icon: PenTool },
                { id: 'ugc', label: 'Viral Lab (UGC)', icon: Video }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-8 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id 
                      ? "bg-brand-accent text-white shadow-xl" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Display */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* MARKET PULSE TAB */}
                {activeTab === 'market' && (
                  <div className="space-y-8">
                    <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-brand-accent/20 space-y-6">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Competitor Audit</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <p className="text-xs font-black text-brand-accent uppercase tracking-widest">Identified Rivals</p>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.competitorAnalysis.topCompetitors.map((c, i) => (
                              <span key={i} className="px-4 py-2 bg-white/5 rounded-xl text-sm font-bold text-gray-300 border border-white/10">{c}</span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-xs font-black text-brand-accent uppercase tracking-widest">Rival Tactics</p>
                          <ul className="space-y-2">
                             {analysisResult.competitorAnalysis.rivalStrategies.map((s, i) => (
                               <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1 shrink-0" />
                                 {s}
                               </li>
                             ))}
                          </ul>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Market Gap Opportunity</p>
                            <p className="text-lg text-gray-300 font-medium italic">"{analysisResult.competitorAnalysis.gapOpportunity}"</p>
                          </div>
                          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Flame className="w-3 h-3" />
                                Sophistication Level
                             </p>
                             <p className="text-xs text-indigo-200 font-black">{analysisResult.competitorAnalysis.marketSophistication || "Stage 3: Market Expansion"}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                             <CheckCircle2 className="w-3 h-3 text-brand-accent" />
                             Strategic Rationale (Evidence)
                          </p>
                          <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{analysisResult.competitorAnalysis.rationale || "Based on cross-channel saturation data and niche search intent analysis."}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-4">
                         <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Active Trends
                         </h3>
                         <div className="flex flex-wrap gap-2">
                            {analysisResult.trends.map((t, i) => (
                              <span key={i} className="text-sm font-bold text-gray-500">#{t}</span>
                            ))}
                         </div>
                      </div>
                      <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-4">
                         <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Compass className="w-5 h-5 text-brand-accent" />
                            Core USP
                         </h3>
                         <p className="text-brand-accent font-black text-xl italic">{analysisResult.productFocus.uniqueSellingPoint}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* DEEP INTELLIGENCE TAB */}
                {activeTab === 'deep' && (
                  <div className="space-y-12">
                    {/* Audience Personas */}
                    <div className="space-y-6">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <Plus className="w-6 h-6 text-brand-accent" />
                        Audience Personas
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {analysisResult.audiencePersonas.map((persona, i) => (
                          <div key={i} className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
                              <BrainCircuit className="w-20 h-20" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">{persona.demographics}</p>
                              <h4 className="text-xl font-black text-white">{persona.title}</h4>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase">Pain Points</p>
                                <ul className="space-y-1">
                                  {persona.painPoints.map((p, idx) => (
                                    <li key={idx} className="text-[11px] text-gray-400 font-medium flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-brand-accent mt-1.5 shrink-0" />
                                      {p}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="pt-4 border-t border-white/5 space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase">Psychological Trigger</p>
                                <p className="text-xs text-gray-300 font-bold italic">"{persona.psychographicTrigger}"</p>
                                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                  <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter mb-1">Objection</p>
                                  <p className="text-[10px] text-gray-500">{persona.buyingObjection}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter mb-1">Conversion Bridge</p>
                                  <p className="text-[10px] text-gray-500">{persona.bridgeToSolution}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Creative Matrix */}
                    <div className="space-y-6">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                         <Palette className="w-6 h-6 text-emerald-400" />
                         Creative Direction Matrix
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analysisResult.creativeMatrix.map((item, i) => (
                          <div key={i} className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 flex flex-col">
                             <div className="flex justify-between items-center">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                  item.style === 'Clinical' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                  item.style === 'Viral' && "bg-pink-500/10 text-pink-400 border-pink-500/20",
                                  item.style === 'Lifestyle' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                  item.style === 'Urgent' && "bg-orange-500/10 text-orange-400 border-orange-500/20",
                                  item.style === 'Brutalist' && "bg-white/10 text-white border-white/20"
                                )}>
                                  {item.style} Approach
                                </span>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.tonality}</div>
                             </div>
                             <div className="space-y-4 flex-1">
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Direction</p>
                                   <p className="text-gray-300 font-medium leading-relaxed">{item.creativeDirection}</p>
                                </div>
                                <div className="space-y-2">
                                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Visual Cues</p>
                                   <div className="flex flex-wrap gap-2">
                                      {item.visualCues.map((v, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-gray-400 border border-white/5">
                                          {v}
                                        </span>
                                      ))}
                                   </div>
                                </div>
                             </div>
                             <div className="pt-6 border-t border-white/5">
                                <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-2">Benchmark Hook</p>
                                <p className="text-sm font-black text-white italic">"{item.exampleHook}"</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STRATEGIC PLAN TAB */}
                {activeTab === 'plan' && (
                  <div className="space-y-8">
                    {analysisResult.angles.map((angle, i) => (
                      <div key={i} className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 group hover:border-brand-accent/20 transition-all overflow-hidden relative shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl group-hover:opacity-10 transition-opacity">0{i+1}</div>
                        <div className="relative z-10 space-y-6">
                           <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-full text-[10px] font-black uppercase tracking-widest">
                                Theory: {angle.psychologicalDriver}
                              </span>
                           </div>
                           <h3 className="text-4xl font-black text-white leading-none">{angle.title}</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                              <div className="space-y-4">
                                 <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Concept</p>
                                    <p className="text-gray-300 font-medium leading-relaxed">{angle.description}</p>
                                 </div>
                                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest mb-1">Psychological Rationale</p>
                                    <p className="text-[11px] text-gray-500 italic">{angle.rationale || "Logic derived from target demographic behavioral triggers."}</p>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic Implementation</p>
                                 <p className="text-gray-400 text-sm leading-relaxed italic">{angle.strategicDepth}</p>
                              </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AD INTELLIGENCE TAB */}
                {activeTab === 'ads' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {analysisResult.adIntelligence.copies.map((ad, i) => (
                         <div key={i} className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 flex flex-col h-full">
                           <div className="flex justify-between items-center">
                              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase">Format: {ad.platform}</span>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                              </div>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-500 uppercase">Hook</p>
                              <p className="text-lg font-black text-white leading-tight">"{ad.hook}"</p>
                           </div>
                           <div className="flex-1 space-y-4">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase">Body Copy</p>
                                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{ad.body}</p>
                              </div>
                              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl group-hover:bg-indigo-500/10 transition-colors">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <BrainCircuit className="w-2 h-2" />
                                  Foundational Rationale
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium italic leading-relaxed tracking-tight select-none">
                                  {ad.rationale || "Direct response trigger designed to bypass consumer skepticism using established psychological levers."}
                                </p>
                              </div>
                           </div>
                           <div className="pt-4 mt-auto">
                              <button className="w-full py-4 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-black uppercase tracking-widest text-xs hover:bg-brand-accent hover:text-white transition-all">
                                CTA: {ad.cta}
                              </button>
                           </div>
                         </div>
                       ))}
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-brand-accent/5 border border-brand-accent/20 space-y-4">
                       <h3 className="text-lg font-black text-white uppercase tracking-tighter">Strategic Ad Angles</h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {analysisResult.adIntelligence.creativeAngles.map((angle, i) => (
                            <div key={i} className="p-4 bg-white/5 rounded-2xl text-xs text-gray-400 font-bold border border-white/5">
                               {angle}
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}

                {/* VIRAL LAB TAB */}
                {activeTab === 'ugc' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <h3 className="text-2xl font-black text-white uppercase flex items-center gap-3">
                             <Video className="w-6 h-6 text-pink-500" />
                             UGC Viral Scenarios
                          </h3>
                          <div className="space-y-4">
                             {analysisResult.ugcConcepts.map((concept, i) => (
                               <div key={i} className="p-6 rounded-3xl bg-brand-panel border border-white/5 space-y-3 hover:border-pink-500/20 transition-all group">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-black text-pink-500 uppercase">Vibe: {concept.vibe}</span>
                                     <span className="text-[9px] font-black text-gray-600">SCENARIO {i+1}</span>
                                  </div>
                                  <p className="text-gray-300 font-bold leading-relaxed">{concept.scenario}</p>
                                  <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl">
                                     <p className="text-[9px] font-black text-pink-400 uppercase mb-1">Viral Rationale</p>
                                     <p className="text-[10px] text-gray-500 italic">{concept.rationale || "Utilizes 'Native Content' feel to maximize retention."}</p>
                                  </div>
                                  <div className="pt-2 border-t border-white/5">
                                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Final Message: <span className="text-white">{concept.keyMessage}</span></p>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h3 className="text-2xl font-black text-white uppercase flex items-center gap-3">
                             <TrendingUp className="w-6 h-6 text-brand-accent" />
                             PR & Disruptive Ads
                          </h3>
                          <div className="space-y-4">
                             {analysisResult.prAdsIdeas.map((ad, i) => (
                               <div key={i} className="p-6 rounded-3xl bg-brand-panel border border-white/5 space-y-4 hover:border-brand-accent/20 transition-all group">
                                  <h4 className="text-xl font-black text-white leading-tight group-hover:text-brand-accent transition-colors italic">"{ad.headline}"</h4>
                                  <p className="text-gray-400 text-sm leading-relaxed">{ad.narrative}</p>
                                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                     <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">PR/Media Rationale</p>
                                     <p className="text-[10px] text-gray-500 italic">{ad.rationale || "Leverages disruptive narrative styles to earn organic reach."}</p>
                                  </div>
                                  <div className="px-3 py-1.5 bg-brand-accent/10 rounded-lg text-brand-accent text-[9px] font-black uppercase tracking-widest w-fit">
                                     Expected Impact: {ad.impact}
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="lg:col-span-4 space-y-8">
                 {/* Hook Matrix */}
                 <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 shadow-2xl">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                       <Zap className="w-5 h-5 text-brand-accent" />
                       Hook Matrix 5.0
                    </h3>
                    <div className="space-y-4">
                       {[
                         { label: 'Aggressive', items: analysisResult.hooks.aggressive, color: 'text-red-400' },
                         { label: 'Curiosity', items: analysisResult.hooks.curiosity, color: 'text-blue-400' },
                         { label: 'Interrupt', items: analysisResult.hooks.patternInterrupt, color: 'text-brand-accent' }
                       ].map((cat, i) => (
                         <div key={i} className="space-y-2">
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", cat.color)}>{cat.label}</p>
                            <div className="space-y-1">
                               {cat.items.slice(0, 3).map((h, idx) => (
                                 <p key={idx} className="text-[11px] text-gray-400 font-bold leading-relaxed border-l-2 border-white/5 pl-3 py-1 italic">"{h}"</p>
                               ))}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Cultural Nodes */}
                 <div className="p-8 rounded-[2.5rem] bg-emerald-500/[0.03] border border-emerald-500/10 space-y-6">
                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                       <Languages className="w-4 h-4" />
                       Cultural Adaptations
                    </h3>
                    <div className="space-y-4">
                       {analysisResult.culturalAdaptations.map((adapt, i) => (
                         <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 tracking-tighter">
                               <span>{adapt.region}</span>
                               <span className="text-emerald-500">{adapt.language}</span>
                            </div>
                            <p className="text-xs font-black text-white leading-tight">"{adapt.suggestedHook}"</p>
                            <p className="text-[10px] text-gray-500 italic leading-relaxed">{adapt.nuance}</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State / Initial View */}
      {!analysisResult && !isAnalyzing && (
        <section className="max-w-7xl mx-auto mt-20 px-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { title: 'Global Nuance', desc: 'Analyzes regional behaviors and slang for localized impact.', icon: Globe },
                { title: 'Psychology First', desc: 'Built on primal drivers: Status, Fear, Freedom, and Altruism.', icon: BrainCircuit },
                { title: 'Format Adaptive', desc: 'Hooks optimized for Reels, Static Posts, and Long-form Video.', icon: Maximize2 },
                { title: 'Trend Splicer', icon: Clock, desc: 'Injects real-time viral triggers into your product DNA.' }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-brand-panel border border-white/5 space-y-4 hover:border-brand-accent/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-brand-accent" />
                   </div>
                   <h3 className="text-lg font-black text-white tracking-widest uppercase">{feature.title}</h3>
                   <p className="text-sm text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              ))}
           </div>
        </section>
      )}
    </div>
  );
}
