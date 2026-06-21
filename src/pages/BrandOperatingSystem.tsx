import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Zap,
  Sparkles,
  Link as LinkIcon,
  Search,
  Compass,
  BrainCircuit,
  Layout,
  Target,
  Shield,
  ActivitySquare,
  AlertCircle,
  Gem,
  Award,
  Users,
  MessageSquare,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Eye,
  Database
} from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeWebsite, scrapeSocialPage } from '../services/scraper';
import { useAuth } from '../lib/auth';
import { useFilters } from '../lib/FilterContext';

interface BrandOSPlan {
  brandDna: {
    archetype: string;
    personality: string;
    emotionalPosition: string;
    marketPosition: string;
    identityGaps: string[];
  };
  perceivedValue: {
    valueScore: number;
    premiumPricingPotential: string;
    weakTrustSignals: string[];
    missingLuxurySignals: string[];
    emotionalDrivers: string[];
  };
  brandEquity: {
    equityScore: number;
    awarenessStrength: string;
    loyaltyIndicators: string[];
    memorabilityAnalysis: string;
  };
  brandPerception: {
    currentPerception: string;
    desiredPerception: string;
    gapAnalysis: string;
    repositioningRecommendations: string[];
  };
  experienceStrategy: {
    communicationStrategy: string;
    customerExperienceStyle: string;
    loyaltyBuildingStrategy: string;
    retentionPsychology: string;
  };
  culturalPositioning: {
    emotionalTerritory: string;
    lifestyleAssociation: string;
    culturalAngle: string;
    brandMovementStrategy: string;
  };
  longTermGrowth: {
    roadmap: Array<{ phase: string; strategy: string }>;
    growthStages: string[];
    audienceEvolutionStrategy: string;
  };
}

export function BrandOperatingSystem() {
  const { user } = useAuth();
  const { selectedAccountId, platform, metaSubPlatform, datePreset, metaToken, googleToken, tiktokToken, adAccounts } = useFilters();
  const [url, setUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState('');
  const [niche, setNiche] = useState('');
  const [targetCountry, setTargetCountry] = useState('Global');
  const [targetAudience, setTargetAudience] = useState('');
  
  const [slogan, setSlogan] = useState('');
  const [currentPositioning, setCurrentPositioning] = useState('');
  const [brandStory, setBrandStory] = useState('');
  
  const [showOptional, setShowOptional] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BrandOSPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dna' | 'value' | 'equity' | 'perception' | 'experience' | 'culture' | 'growth'>('dna');

  const countries = ['Global', 'Egypt', 'Saudi Arabia', 'UAE', 'USA', 'UK', 'France', 'Germany', 'China', 'Japan', 'Brazil', 'Kuwait', 'Qatar'];

  const getToken = useCallback(() => {
    if (platform === 'meta') return metaToken;
    if (platform === 'google') return googleToken;
    if (platform === 'tiktok') return tiktokToken;
    return null;
  }, [platform, metaToken, googleToken, tiktokToken]);

  const activeAccount = selectedAccountId ? adAccounts.find(a => a.id === selectedAccountId) : null;

  const handleAnalyze = async () => {
    if (!url) {
      setError("Please provide at least the main website URL.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      let scrapedData = "";
      try {
        const webData = await scrapeWebsite(url);
        scrapedData += JSON.stringify(webData).substring(0, 50000); // Truncate to avoid token limits
      } catch (err) {
        console.warn("Could not scrape main URL", err);
      }

      let socialScraped = "";
      if (socialUrl) {
        try {
          const platformType = socialUrl.includes('facebook') ? 'facebook' : socialUrl.includes('instagram') ? 'instagram' : 'tiktok';
          socialScraped = JSON.stringify(await scrapeSocialPage(socialUrl, platformType as any)).substring(0, 30000); // Truncate
        } catch (err) {
          console.warn("Could not scrape social URL", err);
        }
      }

      let campaignContext = "";
      const token = getToken();

      if (token && selectedAccountId && user) {
        try {
          const headers = { 'x-user-id': user.uid, [`x-${platform}-token`]: token };
          const q = `accountId=${selectedAccountId}&platform=${platform}&subPlatform=${metaSubPlatform}`;
          const [campRes, insightRes] = await Promise.all([
            fetch(`/api/campaigns?${q}`, { headers }),
            fetch(`/api/insights?${q}&datePreset=${datePreset}`, { headers })
          ]);
          
          const campData = await safeJson(campRes);
          const insightData = await safeJson(insightRes);
          
          if (campData.campaigns && insightData.insights) {
            const combined = campData.campaigns.map((c: any) => {
              const metrics = insightData.insights.find((i: any) => i.id === c.id)?.metrics;
              return { name: c.name, status: c.status, budget: c.raw?.daily_budget, metrics };
            }).filter((c: any) => c.status !== 'ARCHIVED');
            
            campaignContext = JSON.stringify(combined).substring(0, 50000);
          }
        } catch (fetchErr) {
          console.warn('Could not fetch live campaign data', fetchErr);
        }
      }


      const prompt = `
        You are an ELITE GLOBAL BRAND STRATEGIST and CONSUMER PSYCHOLOGIST.
        
        MISSION:
        Create a 🧠 Brand Operating System for the described brand. 
        Your goal is to help this brand become more memorable, achieve higher perceived value, become emotionally addictive, and charge premium pricing.
        Do NOT give generic branding advice. Be scientific, analytical, and brutally realistic.

        INPUT DATA:
        Target URL Content: ${scrapedData}
        Social Content: ${socialScraped}
        Competitor URLs provided: ${competitorUrls}
        Niche: ${niche}
        Target Country: ${targetCountry}
        Target Audience: ${targetAudience}
        Existing Slogan: ${slogan}
        Current Positioning: ${currentPositioning}
        Brand Story: ${brandStory}
        
        ${campaignContext ? `REAL AD CAMPAIGN DATA:\n${campaignContext}\n(Use this real data to inform how the brand currently positions itself in its ads based on CTR, CPA, and scale)` : `Note: No live ad account connected.`}

        You must output ONLY valid JSON using exactly this schema:
        {
          "brandDna": {
            "archetype": "string",
            "personality": "string",
            "emotionalPosition": "string",
            "marketPosition": "string",
            "identityGaps": ["string"]
          },
          "perceivedValue": {
            "valueScore": 0, // Number 1-100
            "premiumPricingPotential": "string",
            "weakTrustSignals": ["string"],
            "missingLuxurySignals": ["string"],
            "emotionalDrivers": ["string"]
          },
          "brandEquity": {
            "equityScore": 0, // Number 1-100
            "awarenessStrength": "string",
            "loyaltyIndicators": ["string"],
            "memorabilityAnalysis": "string"
          },
          "brandPerception": {
            "currentPerception": "string",
            "desiredPerception": "string",
            "gapAnalysis": "string",
            "repositioningRecommendations": ["string"]
          },
          "experienceStrategy": {
            "communicationStrategy": "string",
            "customerExperienceStyle": "string",
            "loyaltyBuildingStrategy": "string",
            "retentionPsychology": "string"
          },
          "culturalPositioning": {
            "emotionalTerritory": "string",
            "lifestyleAssociation": "string",
            "culturalAngle": "string",
            "brandMovementStrategy": "string"
          },
          "longTermGrowth": {
            "roadmap": [{"phase": "Month 1-3", "strategy": "string"}],
            "growthStages": ["string"],
            "audienceEvolutionStrategy": "string"
          }
        }
      `;

      const result = await analyzeWithGemini(prompt, true);
      
      let sanitizedResult = result.trim();
      sanitizedResult = sanitizedResult.replace(/^`{3}json\s*|\s*`{3}$/g, '').trim();
      
      const firstBrace = sanitizedResult.indexOf('{');
      const lastBrace = sanitizedResult.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        sanitizedResult = sanitizedResult.substring(firstBrace, lastBrace + 1);
      }
      
      sanitizedResult = sanitizedResult
        .replace(/,\s*([}\]])/g, '$1') 
        .replace(/([}\]])\s*([{\["'])/g, '$1, $2');

      try {
        const parsed = JSON.parse(sanitizedResult);
        setAnalysisResult(parsed);
        setActiveTab('dna');
      } catch (parseErr) {
        console.error("JSON Parse Error. Raw result:", result);
        throw new Error("The AI returned an invalid structure. Please try simplifying your inputs.");
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to analyze brand. Please check parameters.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 overflow-x-hidden">
      <section className="relative pt-12 pb-20 px-6 border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-500/5 -skew-x-12 translate-x-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest">
              <BrainCircuit className="w-3 h-3" />
              Strategic Engine 1.0
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 uppercase">
              Brand Operating <br />
              <span className="text-indigo-400">System</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl font-medium">
              A scientific brand psychology + positioning + market perception engine designed to make your brand memorable, emotionally addictive, and highly valued.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50">
                  <div className="pl-6 text-muted-foreground shrink-0"><LinkIcon className="w-5 h-5" /></div>
                  <input type="text" placeholder="Main Website URL (Required)" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50">
                  <div className="pl-6 text-gray-500 shrink-0"><LinkIcon className="w-5 h-5" /></div>
                  <input type="text" placeholder="Social Media URL (Optional)" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative group">
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50">
                  <input type="text" placeholder="Niche (e.g. Luxury Skincare)" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={niche} onChange={(e) => setNiche(e.target.value)} />
                </div>
              </div>
              <div className="relative group">
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50">
                  <select value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)} className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold outline-none appearance-none cursor-pointer">
                    {countries.map(c => <option key={c} value={c} className="bg-brand-panel">{c}</option>)}
                  </select>
                  <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="relative group">
                <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50">
                  <input type="text" placeholder="Target Audience" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 w-fit"
              >
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Optional Advanced Inputs
              </button>
              
              <AnimatePresence>
                {showOptional && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden"
                  >
                    <input type="text" placeholder="Competitor URLs (comma separated)" className="bg-brand-panel border border-white/10 py-3 px-4 rounded-xl text-white font-medium focus:border-indigo-500/50 outline-none" value={competitorUrls} onChange={(e) => setCompetitorUrls(e.target.value)} />
                    <input type="text" placeholder="Existing Slogan" className="bg-brand-panel border border-white/10 py-3 px-4 rounded-xl text-white font-medium focus:border-indigo-500/50 outline-none" value={slogan} onChange={(e) => setSlogan(e.target.value)} />
                    <input type="text" placeholder="Current Positioning" className="bg-brand-panel border border-white/10 py-3 px-4 rounded-xl text-white font-medium focus:border-indigo-500/50 outline-none" value={currentPositioning} onChange={(e) => setCurrentPositioning(e.target.value)} />
                    <input type="text" placeholder="Brief Brand Story" className="bg-brand-panel border border-white/10 py-3 px-4 rounded-xl text-white font-medium focus:border-indigo-500/50 outline-none" value={brandStory} onChange={(e) => setBrandStory(e.target.value)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="pt-2">
               <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Brand Context Pipeline</p>
               {activeAccount ? (
                 <div className="flex items-center gap-4 bg-brand-panel p-4 rounded-xl border border-indigo-500/30 w-fit">
                   <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                     <Database className="w-5 h-5 text-indigo-400" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white">Live Ad Sync Active</p>
                     <p className="text-xs text-gray-400">Assessing market positioning via <span className="text-indigo-400 font-bold">{activeAccount.name}</span> metrics</p>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10 w-fit">
                   <AlertCircle className="w-5 h-5 text-red-400" />
                   <p className="text-sm text-muted-foreground">No active ad account. Assessing based purely on website data.</p>
                 </div>
               )}
            </div>

            <div className="flex justify-start pt-4">
               <button 
                 onClick={handleAnalyze}
                 disabled={isAnalyzing || !url}
                 className={cn(
                   "h-auto py-4 px-8 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl min-w-[240px]",
                   isAnalyzing ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/20"
                 )}
               >
                 {isAnalyzing ? (
                   <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ANALYZING...</>
                 ) : (
                   <><Zap className="w-5 h-5" /> GENERATE BRAND OS</>
                 )}
               </button>
            </div>
            
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="font-bold text-sm tracking-tight">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {analysisResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto mt-12 px-6">
            <div className="flex flex-wrap gap-1 bg-brand-panel p-1.5 rounded-[2rem] border border-white/5 mb-12 w-fit">
              {[
                { id: 'dna', label: 'Brand DNA', icon: Shield },
                { id: 'value', label: 'Perceived Value', icon: Gem },
                { id: 'equity', label: 'Brand Equity', icon: Award },
                { id: 'perception', label: 'Market Perception', icon: Eye },
                { id: 'experience', label: 'Experience Strategy', icon: MessageSquare },
                { id: 'culture', label: 'Cultural Positioning', icon: Globe },
                { id: 'growth', label: 'Long Term Growth', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                
                {activeTab === 'dna' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-indigo-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Shield className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Brand DNA Analysis</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brand Archetype</p>
                           <p className="text-xl font-bold text-foreground">{analysisResult.brandDna.archetype}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Personality</p>
                           <p className="text-xl font-bold text-gray-200">{analysisResult.brandDna.personality}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Emotional Position</p>
                           <p className="text-gray-300 font-medium">{analysisResult.brandDna.emotionalPosition}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Market Position</p>
                           <p className="text-gray-300 font-medium">{analysisResult.brandDna.marketPosition}</p>
                        </div>
                     </div>

                     <div className="p-6 bg-red-500/5 rounded-3xl border border-red-500/10 relative z-10">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">Identity Gaps Detected</p>
                        <ul className="space-y-2">
                           {analysisResult.brandDna.identityGaps.map((gap, i) => (
                             <li key={i} className="text-sm text-red-200 flex items-start gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                               {gap}
                             </li>
                           ))}
                        </ul>
                     </div>
                  </div>
                )}

                {activeTab === 'value' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-emerald-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Gem className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Perceived Value Engine</h3>
                     
                     <div className="flex items-center gap-6 relative z-10">
                        <div className="w-32 h-32 rounded-full border-8 border-emerald-500/20 flex items-center justify-center relative">
                           <div className="absolute inset-0 rounded-full border-4 border-emerald-400 border-l-transparent animate-spin-slow"></div>
                           <span className="text-4xl font-black text-emerald-400">{analysisResult.perceivedValue.valueScore}</span>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Perceived Value Score</p>
                           <p className="text-sm text-gray-400 max-w-md">How strongly the market values your brand proposition above your functional utility.</p>
                        </div>
                     </div>

                     <div className="p-6 bg-white/5 rounded-3xl border border-white/10 relative z-10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Premium Pricing Potential</p>
                        <p className="text-gray-300 leading-relaxed font-medium">{analysisResult.perceivedValue.premiumPricingPotential}</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Emotional Drivers</p>
                           <ul className="space-y-2">
                              {analysisResult.perceivedValue.emotionalDrivers.map((driver, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                  {driver}
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="space-y-6">
                           <div className="p-6 bg-orange-500/5 rounded-3xl border border-orange-500/10">
                              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Missing Luxury Signals</p>
                              <ul className="space-y-2">
                                 {analysisResult.perceivedValue.missingLuxurySignals.map((signal, i) => (
                                   <li key={i} className="text-sm text-orange-200 flex gap-2"><span className="text-orange-500">-</span> {signal}</li>
                                 ))}
                              </ul>
                           </div>
                           <div className="p-6 bg-red-500/5 rounded-3xl border border-red-500/10">
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Weak Trust Signals</p>
                              <ul className="space-y-2">
                                 {analysisResult.perceivedValue.weakTrustSignals.map((signal, i) => (
                                   <li key={i} className="text-sm text-red-200 flex gap-2"><span className="text-red-500">-</span> {signal}</li>
                                 ))}
                              </ul>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'equity' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-blue-500/20 space-y-8 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Award className="w-40 h-40" /></div>
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 relative z-10">Brand Equity Analysis</h3>
                     
                     <div className="flex items-center gap-6 relative z-10 mb-8">
                        <div className="w-24 h-24 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center flex-col">
                           <span className="text-3xl font-black text-blue-400">{analysisResult.brandEquity.equityScore}</span>
                           <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">Equity Score</span>
                        </div>
                        <div className="flex-1 p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Awareness Strength</p>
                           <p className="text-gray-300 leading-relaxed font-medium">{analysisResult.brandEquity.awarenessStrength}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Loyalty Indicators</p>
                           <ul className="space-y-3">
                              {analysisResult.brandEquity.loyaltyIndicators.map((ind, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-3">
                                  <div className="px-2 py-1 bg-blue-500/10 rounded-lg text-blue-400 text-xs font-black">{i+1}</div>
                                  <span className="mt-0.5">{ind}</span>
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Memorability Analysis</p>
                           <p className="text-gray-300 leading-relaxed text-sm">{analysisResult.brandEquity.memorabilityAnalysis}</p>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'perception' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Current Perception</p>
                           <p className="text-xl font-bold text-white text-center italic py-10 px-4 bg-[#0B0F19]/50 rounded-2xl border border-white/5">"{analysisResult.brandPerception.currentPerception}"</p>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Desired Perception</p>
                           <p className="text-xl font-bold text-indigo-100 text-center italic py-10 px-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">"{analysisResult.brandPerception.desiredPerception}"</p>
                        </div>
                     </div>
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-orange-500/20">
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">Perception Gap Analysis</p>
                        <p className="text-gray-300 leading-relaxed font-medium">{analysisResult.brandPerception.gapAnalysis}</p>
                     </div>
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-emerald-500/20">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Repositioning Roadmap</p>
                        <div className="space-y-3">
                           {analysisResult.brandPerception.repositioningRecommendations.map((rec, i) => (
                             <div key={i} className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-black shrink-0">{i+1}</div>
                                <p className="text-sm text-gray-200 mt-0.5 leading-relaxed">{rec}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'experience' && (
                  <div className="space-y-6">
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/10">
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-6">Brand Experience Strategy</h3>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Communication Strategy</p>
                              <p className="text-gray-300 leading-relaxed p-5 bg-white/5 rounded-2xl">{analysisResult.experienceStrategy.communicationStrategy}</p>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Customer Experience Style</p>
                              <p className="text-gray-300 leading-relaxed p-5 bg-white/5 rounded-2xl">{analysisResult.experienceStrategy.customerExperienceStyle}</p>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Loyalty Building</p>
                                 <p className="text-sm text-gray-400 leading-relaxed p-5 bg-white/5 rounded-2xl h-full">{analysisResult.experienceStrategy.loyaltyBuildingStrategy}</p>
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Retention Psychology</p>
                                 <p className="text-sm text-gray-400 leading-relaxed p-5 bg-white/5 rounded-2xl h-full">{analysisResult.experienceStrategy.retentionPsychology}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'culture' && (
                  <div className="p-10 rounded-[2.5rem] bg-brand-panel border border-brand-accent/20 space-y-8">
                     <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 border-l-4 border-brand-accent pl-4">Cultural & Emotional Positioning</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3 hover:border-brand-accent/30 transition-colors">
                           <p className="text-[10px] font-black text-primary uppercase tracking-widest">Emotional Territory</p>
                           <p className="text-lg font-bold text-gray-200">{analysisResult.culturalPositioning.emotionalTerritory}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3 hover:border-brand-accent/30 transition-colors">
                           <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Lifestyle Association</p>
                           <p className="text-lg font-bold text-gray-200">{analysisResult.culturalPositioning.lifestyleAssociation}</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                           <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Cultural Angle</p>
                           <p className="text-gray-300 font-medium leading-relaxed">{analysisResult.culturalPositioning.culturalAngle}</p>
                        </div>
                        <div className="p-6 bg-[#0B0F19]/80 rounded-3xl border border-brand-accent/30 space-y-3 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="w-20 h-20 text-brand-accent" /></div>
                           <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest relative z-10">Brand Movement Strategy</p>
                           <p className="text-gray-200 font-bold leading-relaxed relative z-10 italic">"{analysisResult.culturalPositioning.brandMovementStrategy}"</p>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'growth' && (
                  <div className="space-y-6">
                     <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-emerald-500/20">
                        <h3 className="text-2xl font-black text-emerald-400 uppercase italic tracking-tighter mb-6">Long Term RoadMap</h3>
                        <div className="space-y-4">
                           {analysisResult.longTermGrowth.roadmap.map((stage, i) => (
                             <div key={i} className="flex flex-col md:flex-row gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                                <div className="md:w-32 shrink-0">
                                   <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                     {stage.phase}
                                   </span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed font-medium">{stage.strategy}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-brand-panel border border-white/10">
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Growth Stages expected</p>
                           <ul className="space-y-2">
                              {analysisResult.longTermGrowth.growthStages.map((stage, i) => (
                                <li key={i} className="text-sm text-gray-400 flex items-center gap-3">
                                  <TrendingUp className="w-4 h-4 text-emerald-500/50" />
                                  {stage}
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="p-6 rounded-3xl bg-brand-panel border border-white/10">
                           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Audience Evolution</p>
                           <p className="text-sm text-gray-300 leading-relaxed">{analysisResult.longTermGrowth.audienceEvolutionStrategy}</p>
                        </div>
                     </div>
                  </div>
                )}

              </div>
              
              <div className="lg:col-span-4 space-y-6">
                 {/* Quick Summary Panel */}
                 <div className="p-8 rounded-[2.5rem] bg-brand-panel border border-white/5 space-y-6 shadow-2xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Brand Signature</h3>
                    
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Core Archetype</p>
                          <p className="text-sm font-bold text-white">{analysisResult.brandDna.archetype}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Value Score</p>
                          <div className="w-full bg-white/5 rounded-full h-2 mt-2">
                             <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${analysisResult.perceivedValue.valueScore}%` }} />
                          </div>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Equity Score</p>
                          <div className="w-full bg-white/5 rounded-full h-2 mt-2">
                             <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${analysisResult.brandEquity.equityScore}%` }} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Key Directives */}
                 <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-brand-accent/20 space-y-4">
                    <h3 className="text-xs font-black text-brand-accent uppercase tracking-widest">Cultural Directive</h3>
                    <p className="text-sm text-gray-300 italic font-medium leading-relaxed">
                      "{analysisResult.culturalPositioning.brandMovementStrategy}"
                    </p>
                 </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!analysisResult && !isAnalyzing && (
        <section className="max-w-7xl mx-auto mt-20 px-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { title: 'Brand Equity', desc: 'Identify emotional triggers that create lifelong customers.', icon: Award },
                { title: 'Perceived Value', desc: 'Find the hidden levers to justify premium pricing.', icon: Gem },
                { title: 'Culture Shift', desc: 'Build a movement, not just a marketing campaign.', icon: Globe },
                { title: 'Perception Gap', icon: Eye, desc: 'Align how you want to be seen with how you truly are.' }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-brand-panel border border-white/5 space-y-4 hover:border-indigo-500/30 transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-indigo-400" />
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
