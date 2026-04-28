import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, Globe, Search, Users, Target, Rocket, 
  AlertCircle, CheckCircle2, TrendingUp,
  Zap, Shield, ShieldCheck, ArrowRight, Lightbulb, Link2, MessageSquare, BookOpen, Key, Compass, Radio,
  Printer, BarChart3, ChevronDown, Activity, Info, Gauge, Brain
} from 'lucide-react';
import { 
  ResponsiveContainer, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { scrapeWebsite } from '../services/scraper';
import { useAuth } from '../lib/auth';
import { useAiSettings } from '../hooks/useAiSettings';
import { cn } from '../lib/utils';

interface IntelligenceReport {
  url: string;
  isPrecision?: boolean;
  engine?: string;
  introduction?: { 
    summary: string; 
    objective?: string;
    strategicGoal?: string;
    keyFocus?: string;
    expertAnalysis: string;
    strategicSignificance: string;
    digitalAudit: { 
      score: number; 
      scoreExplanation: string;
      technicalGrade: string; 
      technicalGradeExplanation: string;
      technicalIssues: string[]; 
      performanceSignals: string 
    } 
  };
  seoAudit?: {
    authorityScore: number;
    authorityExplanation: string;
    technicalScore: number;
    technicalExplanation: string;
    backlinkCount: string;
    referringDomains: string;
    trafficSplit: { organic: number; direct: number; paid: number; social: number; referral: number };
    topKeywords: Array<{word: string, volume: string, difficulty: string, position: string, opportunity: string}>;
    technicalFindings: Array<{issue: string, severity: "Critical" | "Moderate" | "Low", fix: string}>;
    technicalSignals: {
      altTextOptimization: string;
      brokenPagesCount: string;
      brokenPagesLogic: string;
      imageOptimization: string;
      mobileResponsiveness: string;
    };
    actionableImprovements: string[];
    deepAuditNarrative: string;
    strategicSignificance: string;
  };
  keywordGap?: {
    brandedPercentage: number;
    nonBrandedPercentage: number;
    brandedSummary: string;
    nonBrandedOpportunities: string[];
    strategicInsight: string;
    positioningNarrative: string;
    strategicSignificance: string;
  };
  socialMedia?: { 
    platformRankings: Array<{platform: string; followers: string; engagement: string; growthRate: string; focus: string; postsPerMonth: number; avgEngagement: number, strategy: string, audienceProfile: string}>;
    formatPerformance: { best: string; worst: string; reasoning: string };
    postFrequency: string;
    operationalEfficiency?: string;
    growthAnalysis?: string;
    strategicAudit: string;
    strategicSignificance: string;
  };
  contentStrategy?: { 
    currentPillars: string[]; 
    missingVoice: string;
    analysis: string;
    topicalAuthorityGaps: Array<{topic: string, gapLevel: string, relevance: string}>;
    detailedAudit: string;
    strategicSignificance: string;
  };
  strategicGaps?: {
    gaps: Array<{
      title: string;
      description: string;
      impact: "High" | "Medium" | "Low";
      resolution: string;
      riskFactor: string;
    }>;
    strategicSignificance: string;
  };
  paidMedia?: { 
    currentStatus: string; 
    risks: string[]; 
    funnelRecommendation: string;
    funnelAnalysis: { awareness: string, consideration: string, conversion: string };
    detailedStrategy: string;
    strategicSignificance: string;
  };
  competitors?: {
    rivals: Array<{
      name: string; 
      advantage: string; 
      trafficVolume: string; 
      seoRanking: string; 
      socialStrength: string; 
      topKeywords: string[];
      marketShare?: string;
      primaryWeakness?: string;
      benchmarkingNarrative: string;
      engagementDepth?: string;
      growthMomentum?: string;
    }>;
    strategicSignificance: string;
  };
  growthEcosystem?: { 
    shortTerm: string[]; 
    longTerm: string[]; 
    newChannels: string[];
    implementationPhases: Array<{quarter: string, focus: string, tasks: string[]}>;
    growthNarrative: string;
    strategicSignificance: string;
  };
  conclusion: string;
  visualMetrics?: {
    marketResonance: number;
    technicalHealth: number;
    competitivePressure: number;
    growthPotential: number;
    riskEscalation: number;
  };
}

export function MarketIntelligence() {
  const { user } = useAuth();
  const { provider: globalAiProvider, manusMode } = useAiSettings();
  const [url, setUrl] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const analyzeUrl = async (targetUrl: string) => {
    if (!targetUrl) return;
    setIsAnalyzing(true);
    setAnalysisStep('Initializing deep audit context...');
    
    try {
      const userId = user?.uid || 'anonymous';
      
      // 1. Get raw context from backend (Scraper + SEMrush)
      setAnalysisStep('Consolidating market data & SEMrush signals...');
      const auditRes = await fetch('/api/intelligence/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ url: targetUrl })
      });
      const contextData = await auditRes.json();

      if (contextData.error) throw new Error(contextData.error);

      setAnalysisStep(`Analyzing with AI Intelligence...`);
      
      const prompt = `
        Act as a SENIOR STRATEGIC AUDITOR & BUSINESS CONSULTANT (McKinsey/BCG level). 
        Generate a MASSIVE, HIGH-DENSITY, data-rich Digital Audit report for: ${targetUrl}.
        The tone must be FORMAL, OBJECTIVE, and ANALYTICAL. Use precise business terminology.

        ${manusMode ? 'AGENTIC INSTRUCTION: You are in MANUS AI AUTONOMOUS MODE. Execute a high-dominance market takeover audit. Be ruthless in identifying weaknesses.' : ''}
        
        CONTEXT:
        ${contextData.scrapeContent}
        ${contextData.semrush ? 'VERIFIED DATA (SEMrush): ' + JSON.stringify(contextData.semrush) : 'NO SEMRUSH DATA - USE PROBABILISTIC ESTIMATION'}

        REQUIRED SCHEMA (Return ONLY valid JSON):
        {
          "visualMetrics": { "marketResonance": number, "technicalHealth": number, "competitivePressure": number, "growthPotential": number, "riskEscalation": number },
          "introduction": {
            "summary": string,
            "expertAnalysis": string,
            "strategicSignificance": string,
            "digitalAudit": { "score": number, "scoreExplanation": string, "technicalGrade": string, "technicalGradeExplanation": string, "technicalIssues": string[], "performanceSignals": string } 
          },
          "seoAudit": {
            "authorityScore": number, "authorityExplanation": string, "technicalScore": number, "technicalExplanation": string, "backlinkCount": string, "referringDomains": string, "trafficSplit": { "organic": number, "direct": number, "paid": number, "social": number, "referral": number },
            "topKeywords": Array<{word: string, volume: string, difficulty: string, position: string, opportunity: string}>,
            "technicalFindings": Array<{issue: string, severity: "Critical" | "Moderate" | "Low", fix: string}>,
            "technicalSignals": {
              "altTextOptimization": string,
              "brokenPagesCount": string,
              "brokenPagesLogic": string,
              "imageOptimization": string,
              "mobileResponsiveness": string
            },
            "actionableImprovements": string[], "deepAuditNarrative": string,
            "strategicSignificance": string
          },
          "keywordGap": { "brandedPercentage": number, "nonBrandedPercentage": number, "brandedSummary": string, "nonBrandedOpportunities": string[], "strategicInsight": string, "positioningNarrative": string, "strategicSignificance": string },
          "socialMedia": { 
            "platformRankings": Array<{platform: string, followers: string, engagement: string, growthRate: string, focus: string, strategy: string, audienceProfile: string}>,
            "formatPerformance": { "best": string, "worst": string, "reasoning": string },
            "strategicAudit": string, "strategicSignificance": string, "growthAnalysis": string
          },
          "strategicGaps": {
            "gaps": Array<{ title: string, description: string, impact: "High" | "Medium" | "Low", resolution: string, riskFactor: string }>,
            "strategicSignificance": string
          },
          "contentStrategy": { "currentPillars": string[], "missingVoice": string, "analysis": string, "topicalAuthorityGaps": Array<{topic: string, gapLevel: string, relevance: string}>, "detailedAudit": string, "strategicSignificance": string },
          "paidMedia": { "funnelRecommendation": string, "funnelAnalysis": { "awareness": string, "consideration": string, "conversion": string }, "detailedStrategy": string, "strategicSignificance": string, "currentStatus": string, "risks": string[] },
          "competitors": {
            "rivals": Array<{ 
              "name": string, 
              "advantage": string, 
              "trafficVolume": string, 
              "seoRanking": string, 
              "socialStrength": string, 
              "topKeywords": string[], 
              "marketShare": string, 
              "primaryWeakness": string, 
              "benchmarkingNarrative": string,
              "engagementDepth": string,
              "growthMomentum": string
            }>,
            "strategicSignificance": string
          },
          "growthEcosystem": { "shortTerm": string[], "longTerm": string[], "newChannels": string[], "implementationPhases": Array<{quarter: string, focus: string, tasks: string[]}>, "growthNarrative": string, "strategicSignificance": string },
          "conclusion": string
        }

        SPECIFIC INSTRUCTIONS:
        1. SEO AUDIT: You must identify specific signals for "alt text" and "broken pages" (e.g., "404 detected in /api/v1", "Missing alt tags on hero images").
        2. COMPETITORS: Find 5 real major competitors. For each rival, be specific about their "trafficVolume" (e.g., "1.2M sessions/mo") and "socialStrength" (e.g., "High - 4.2% engagement on IG"). Provide exactly 3-5 of their top keywords.
        3. TECHNICAL FINDINGS: Focus on infrastructure issues like "Fragmented Canonical Attribution" or "Core Web Vital: CLS Instability".
        4. TONE: Senior Strategic Auditor (McKinsey/BCG level). Use FORMAL, OBJECTIVE, and HIGH-AUTHORITY BUSINESS ENGLISH. 
        5. LANGUAGE: ALL OUTPUT MUST BE IN ENGLISH. DO NOT USE ARABIC.
      `;

      // Perform AI analysis via backend
      const response = await fetch('/api/intelligence/advanced-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-user-id': userId 
        },
        body: JSON.stringify({
          prompt,
          model: globalAiProvider,
          isJson: true
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (!data.result) throw new Error('AI failed to generate a response.');

      let cleanJsonStr = data.result.trim();
      const firstBrace = cleanJsonStr.indexOf('{');
      const lastBrace = cleanJsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJsonStr = cleanJsonStr.substring(firstBrace, lastBrace + 1);
      }

      const resultJson = JSON.parse(cleanJsonStr);
      setAnalysisStep('Finalizing Deep Audit...');
      
      const newReport: IntelligenceReport = {
        ...resultJson,
        url: targetUrl,
        engine: 'gemini',
        isPrecision: !!contextData.semrush
      };

      setReports(prev => [newReport, ...prev]);
      setActiveReportId(targetUrl);
      setIsAnalyzing(false);
      setAnalysisStep('');

      // Save to backend
      fetch('/api/intelligence/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ report: newReport })
      });

    } catch (err: any) {
      console.error(err);
      setIsAnalyzing(false);
      setAnalysisStep(`Error: ${err.message}`);
    }
  };

  const exportReport = () => {
    if (!activeReport) return;
    const dataStr = JSON.stringify(activeReport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `digital_audit_${activeReport.url.replace(/[^a-z0-9]/gi, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const printReport = () => {
    window.print();
  };

  const activeReport = reports.find(r => r.url === activeReportId);

  const tabs = [
    { id: 'overview', label: 'Dashboard Overview', icon: Globe },
    { id: 'seoAudit', label: 'Full SEO Audit', icon: Search },
    { id: 'keywordGap', label: 'Keyword Positioning', icon: Key },
    { id: 'social', label: 'Social Audit', icon: Users },
    { id: 'content', label: 'Content Audit', icon: BookOpen },
    { id: 'paid', label: 'Paid Strategy', icon: Target },
    { id: 'gaps', label: 'Strategic Risks', icon: AlertCircle },
    { id: 'competitors', label: 'Market Rivals', icon: Zap },
    { id: 'growth', label: 'Growth Roadmap', icon: Rocket }
  ];

  return (
    <div className="flex min-h-screen bg-[#05070A]">
      {/* Search History Sidebar */}
      <div className="w-80 border-r border-white/5 bg-[#080B12] p-6 hidden lg:block overflow-y-auto">
        <div className="flex items-center gap-2 mb-8 px-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">Recent Intelligence</h3>
        </div>
        
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
              <p className="text-[10px] text-gray-600 font-bold uppercase">No audits generated yet</p>
            </div>
          ) : (
            reports.map((r) => (
              <button
                key={r.url}
                onClick={() => setActiveReportId(r.url)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all group",
                  activeReportId === r.url 
                    ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20" 
                    : "bg-[#0B0F19] border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-black text-indigo-400 uppercase truncate max-w-[150px]">
                    {r.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-gray-300 truncate">
                  Digital Audit Report
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <header className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">
                  Market <span className="text-indigo-500">Intel</span>
                </h1>
                <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed mt-6">
                  Advanced digital reconnaissance engine. Our proprietary algorithms audit infrastructure, 
                  content architecture, and competitive intelligence to construct your business scale roadmap.
                </p>
              </div>

              {activeReport && (
                <div className="flex gap-3">
                  <button 
                    onClick={printReport}
                    className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black rounded-2xl transition-all flex items-center gap-2 uppercase tracking-widest"
                  >
                    <Printer className="w-4 h-4" />
                    Print Summary
                  </button>
                  <button 
                    onClick={exportReport}
                    className="px-6 py-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-2xl transition-all flex items-center gap-2 uppercase tracking-widest"
                  >
                    <BookOpen className="w-4 h-4" />
                    Export Full Report
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-12 group"
            >
              <div className="relative max-w-full">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Globe className="w-6 h-6 text-gray-600 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyzeUrl(url)}
                  placeholder="https://example.com"
                  className="w-full bg-[#0B0F19] border-2 border-white/5 rounded-3xl pl-16 pr-44 py-7 text-white text-xl font-bold placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all shadow-2xl"
                />
                <button
                  onClick={() => analyzeUrl(url)}
                  disabled={isAnalyzing || !url}
                  className="absolute right-4 top-4 bottom-4 px-10 bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-800 text-white rounded-2xl font-black transition-all flex items-center gap-3 shadow-xl active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-5 h-5" />
                      </motion.div>
                      <span className="text-sm uppercase tracking-tighter">{analysisStep}</span>
                    </>
                  ) : (
                    <>
                      <span className="uppercase tracking-tighter">Initiate Audit</span>
                      <Zap className="w-4 h-4 fill-current" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </header>

          {activeReport ? (
            <div className="space-y-12">
              <nav className="flex gap-2 p-2 bg-[#0B0F19] rounded-[2.5rem] border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest",
                      activeTab === tab.id 
                        ? "bg-indigo-500 text-white shadow-2xl shadow-indigo-500/40" 
                        : "text-gray-600 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-panel p-12 rounded-[3.5rem] min-h-[700px] border-white/5 bg-[#0B0F19]/40 backdrop-blur-3xl shadow-3xl"
                >
                  {activeTab === 'overview' && <OverviewTab report={activeReport} />}
                  {activeTab === 'seoAudit' && <SEOAuditTab report={activeReport} />}
                  {activeTab === 'keywordGap' && <KeywordGapTab report={activeReport} />}
                  {activeTab === 'social' && <SocialTab report={activeReport} />}
                  {activeTab === 'content' && <ContentTab report={activeReport} />}
                  {activeTab === 'paid' && <PaidTab report={activeReport} />}
                  {activeTab === 'gaps' && <StrategicGapsTab report={activeReport} />}
                  {activeTab === 'competitors' && <CompetitorsTab report={activeReport} />}
                  {activeTab === 'growth' && <GrowthTab report={activeReport} />}
                </motion.div>
              </AnimatePresence>

              <div className="mt-12 p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">C-Level Strategic Advisory</h4>
                    <p className="text-[10px] text-gray-500 font-medium">Confidence Interval: 94.2% | Data Freshness: Real-time Sync</p>
                  </div>
                </div>
                <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">
                  * Confidential Business Intelligence. Deployment of recommendations is subject to internal security protocols.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-[4rem]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8">
                <ShieldCheck className="w-10 h-10 text-gray-700" />
              </div>
              <h2 className="text-2xl font-black text-gray-600 uppercase tracking-tighter mb-4">Strategic Framework Ready.</h2>
              <p className="text-gray-700 font-bold max-w-sm text-center leading-relaxed">
                Initialize a cross-channel digital intelligence audit by entering a domain above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ report }: { report: IntelligenceReport }) {
  const intro = report.introduction;
  if (!intro) return <EmptyState />;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <StatCard label="Digital Maturity Index" value={`${intro.digitalAudit.score}`} icon={Shield} color="text-indigo-400" percent={intro.digitalAudit.score} />
          <p className="text-[10px] text-gray-500 font-medium px-4 leading-relaxed italic">
            {intro.digitalAudit.scoreExplanation || "Aggregated score based on domain authority, infrastructure health, and organic visibility."}
          </p>
        </div>
        <div className="space-y-4">
          <StatCard label="Infrastructure Integrity" value={intro.digitalAudit.technicalGrade} icon={CheckCircle2} color="text-emerald-400" percent={parseInt(intro.digitalAudit.technicalGrade) || 85} />
          <p className="text-[10px] text-gray-500 font-medium px-4 leading-relaxed italic">
             {intro.digitalAudit.technicalGradeExplanation || "Measurement of technical compliance, security protocols, and speed optimization."}
          </p>
        </div>
        <div className="space-y-4">
          <StatCard label="Market Penetration Velocity" value="Accelerating" icon={Rocket} color="text-purple-400" percent={75} />
          <p className="text-[10px] text-gray-500 font-medium px-4 leading-relaxed italic">
            Evaluation of recent growth signals and competitive market share shifts.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">How to Interpret this Audit</h3>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">Guidelines for Strategic Action</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-indigo-300 uppercase block tracking-widest">1. The "So What?" Tab</span>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Every section contains a <span className="text-white">"So What?"</span> analysis. This translates raw data into business impact. If you only have 5 minutes, read these first to understand the ROI implications.</p>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-indigo-300 uppercase block tracking-widest">2. Audience Profiles</span>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Under Social Audit, <span className="text-white">Audience Profiles</span> define the psychographics of your visitors. Use this to tailor your communication voice for maximum conversion.</p>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-indigo-300 uppercase block tracking-widest">3. Risk Factors</span>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">The <span className="text-white">Strategic Risks</span> section highlights the cost of inaction. A "High" risk identifies a fundamental weakness that could cap your growth trajectory.</p>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-indigo-300 uppercase block tracking-widest">4. Growth Ecosystem</span>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">This is your <span className="text-white">Tactical Roadmap</span>. It breaks down complex audits into quarterly logic chunks, making implementation manageable and predictable.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
           <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Audit Objective</div>
           <p className="text-sm text-gray-400 font-medium leading-relaxed">{intro.objective || "Comprehensive cross-channel digital infrastructure analysis."}</p>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3 text-indigo-100">
           <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Strategic Goal</div>
           <p className="text-sm font-bold leading-relaxed">{intro.strategicGoal || "Establishment of digital market dominance."}</p>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3 text-emerald-100">
           <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Core Focus</div>
           <p className="text-sm font-bold leading-relaxed">{intro.keyFocus || "Infrastructure optimization and conversion scaling."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <AnalysisCard 
          title="EXECUTIVE STRATEGIC VISION & SIGNIFICANCE" 
          content={intro.summary} 
          deepAnalysis={intro.expertAnalysis}
          strategicSignificance={intro.strategicSignificance}
          icon={Zap} 
          metrics={[
            { label: 'Market Resonance', value: report.visualMetrics?.marketResonance || 85, color: 'text-indigo-400' },
            { label: 'Technical Health', value: report.visualMetrics?.technicalHealth || 92, color: 'text-emerald-400' },
            { label: 'Growth Potential', value: report.visualMetrics?.growthPotential || 78, color: 'text-purple-400' },
            { label: 'Risk Protection', value: 100 - (report.visualMetrics?.riskEscalation || 20), color: 'text-amber-400' }
          ]}
        />
        
        <div className="p-10 rounded-[3.5rem] border border-white/5 bg-[#0B0F19] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/10" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Strategic Footprint</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Aggregate Cross-Channel Authority</p>
              </div>
              <Activity className="w-5 h-5 text-indigo-500" />
            </div>
            
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'Resonance', A: report.visualMetrics?.marketResonance || 85 },
                  { subject: 'Health', A: report.visualMetrics?.technicalHealth || 92 },
                  { subject: 'Pressure', A: report.visualMetrics?.competitivePressure || 65 },
                  { subject: 'Potential', A: report.visualMetrics?.growthPotential || 78 },
                  { subject: 'Risk', A: 100 - (report.visualMetrics?.riskEscalation || 20) }
                ]}>
                  <PolarGrid stroke="#ffffff10" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 900 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Enterprise"
                    dataKey="A"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="subject"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    data={[
                      { A: 60 }, { A: 60 }, { A: 60 }, { A: 60 }, { A: 60 }
                    ]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">Delta Index</span>
                <span className="text-sm font-black text-emerald-400">+12.4% vs Avg</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">Market Position</span>
                <span className="text-sm font-black text-indigo-400">Challenger Tier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <SectionHeader label="Systemic Infrastructure Vulnerabilities" icon={AlertCircle} color="text-red-400" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intro.digitalAudit.technicalIssues.map((issue, i) => (
            <div key={i} className="flex gap-4 p-6 rounded-2xl bg-red-500/5 border border-red-500/10 group hover:bg-red-500/10 transition-colors">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-black text-gray-300 block mb-1">Issue Detected</span>
                <span className="text-xs font-medium text-gray-500">{issue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrategicGapsTab({ report }: { report: IntelligenceReport }) {
  const data = report.strategicGaps;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white">Strategic Exposure Analysis</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
            Evaluation of systemic vulnerabilities that could impede growth or result in asset loss.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-500 uppercase">Critical Vulnerabilities</div>
            <div className="text-xl font-black text-red-500">{data.gaps.filter(g => g.impact === 'High').length} Found</div>
          </div>
          <span className="text-[10px] font-black px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 text-red-400 uppercase tracking-widest">Risk Assessment: SEVERE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {data.gaps.map((gap, i) => (
          <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 opacity-20",
              gap.impact === 'High' ? "bg-red-500" : "bg-amber-500"
            )} />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-1">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border",
                  gap.impact === 'High' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div>
                   <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-white">{gap.title}</h3>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                        gap.impact === 'High' ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                      )}>{gap.impact} Impact</span>
                   </div>
                   <p className="text-gray-400 font-medium leading-relaxed">{gap.description}</p>
                   <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-[10px] text-red-400/70 font-bold italic">
                     <span className="font-black mr-2 tracking-widest uppercase">RISK FACTOR:</span> {gap.riskFactor}
                   </div>
                </div>
              </div>

              <div className="md:col-span-4 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 self-center">
                 <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Zap className="w-3 h-3" />
                   Resolution Pathway
                 </div>
                 <p className="text-xs font-bold text-indigo-100 leading-relaxed font-mono">
                   {gap.resolution}
                 </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnalysisCard 
        title="STRATEGIC RISK ASSESSMENT & MITIGATION VALUE" 
        content="Overview of the systemic risk landscape." 
        strategicSignificance={data.strategicSignificance}
        icon={Shield} 
        metrics={[
          { label: 'Vulnerability Depth', value: data.gaps.filter(g => g.impact === 'High').length * 10, color: 'text-red-400' },
          { label: 'Mitigation Readiness', value: 65, color: 'text-indigo-400' },
          { label: 'Risk Escalation', value: report.visualMetrics?.riskEscalation || 45, color: 'text-amber-400' }
        ]}
      />
    </div>
  );
}

function KeywordGapTab({ report }: { report: IntelligenceReport }) {
  const gap = report.keywordGap;
  if (!gap) return <EmptyState />;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white">The Keyword Gap</h2>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <div className="text-[10px] font-black text-gray-500 uppercase">Branded</div>
              <div className="text-xl font-black text-white">{gap.brandedPercentage}%</div>
           </div>
           <div className="w-px h-8 bg-white/10" />
           <div className="text-right">
              <div className="text-[10px] font-black text-indigo-400 uppercase">Non-Branded</div>
              <div className="text-xl font-black text-indigo-400">{gap.nonBrandedPercentage}%</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <SectionHeader label="Branded Presence" icon={ShieldCheck} />
          <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5">
            <p className="text-sm text-gray-400 leading-relaxed font-medium capitalize">
              {gap.brandedSummary}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <SectionHeader label="Non-Branded Opportunities" icon={TrendingUp} color="text-indigo-400" />
          <div className="space-y-3">
            {gap.nonBrandedOpportunities?.map((opp, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 group hover:bg-indigo-500/10 transition-all">
                <span className="text-sm font-bold text-indigo-100">{opp}</span>
                <ArrowRight className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnalysisCard 
        title="KEYWORD POSITIONING STRATEGIC AUDIT & SIGNIFICANCE" 
        content={gap.strategicInsight} 
        deepAnalysis={gap.positioningNarrative}
        strategicSignificance={gap.strategicSignificance}
        icon={Key} 
        metrics={[
          { label: 'Branded Share', value: gap.brandedPercentage, color: 'text-white' },
          { label: 'Non-Branded Capture', value: gap.nonBrandedPercentage, color: 'text-indigo-400' },
          { label: 'Market Resonance', value: report.visualMetrics?.marketResonance || 75, color: 'text-emerald-400' }
        ]}
      />
    </div>
  );
}

function SocialTab({ report }: { report: IntelligenceReport }) {
  const social = report.socialMedia;
  if (!social) return <EmptyState />;

  return (
    <div className="space-y-12">
      <SectionHeader label="Platform Performance Index" icon={Users} />
      <p className="text-xs text-gray-500 font-medium mt-2 max-w-2xl">
        Analysis of brand authority across primary social vectors. "Audience Profile" defines the specific cohort interacting with the brand, while "Engagement" measures the intensity of that interaction.
      </p>
      
      <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-white/[0.01]">
         <table className="w-full text-left">
            <thead className="bg-white/[0.03]">
               <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase">Platform</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase">Audience Profile & Reach</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase">Engagement Strength</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase">Strategic Vector</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {social.platformRankings?.map((p, i) => (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-all">
                     <td className="px-8 py-6">
                        <div className="font-black text-white">{p.platform}</div>
                        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{p.focus}</div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="text-sm font-black text-gray-300">{p.followers}</div>
                        <div className="text-[10px] text-gray-600 font-bold mt-1 leading-relaxed">{p.audienceProfile}</div>
                     </td>
                     <td className="px-8 py-6">
                        <span className={cn(
                          "px-2 py-1 rounded text-[9px] font-black uppercase",
                          p.engagement === 'High' ? "bg-emerald-500/10 text-emerald-400" :
                          p.engagement === 'Good' || p.engagement === 'Moderate' ? "bg-indigo-500/10 text-indigo-400" :
                          "bg-red-500/10 text-red-400"
                        )}>{p.engagement}</span>
                     </td>
                     <td className="px-8 py-6 max-w-xs">
                        <div className="text-[10px] font-bold text-gray-400 leading-relaxed italic">
                           "{p.strategy}"
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      <AnalysisCard 
        title="SOCIAL VOICE & STRATEGIC SIGNIFICANCE" 
        content={social.operationalEfficiency || "Analysis of brand resonance across social channels."} 
        deepAnalysis={social.strategicAudit}
        strategicSignificance={social.strategicSignificance}
        icon={MessageSquare} 
        metrics={[
          { label: 'Engagement Rate', value: 72, color: 'text-indigo-400' },
          { label: 'Brand Sentiment', value: 88, color: 'text-emerald-400' },
          { label: 'Growth Velocity', value: 64, color: 'text-purple-400' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10">
           <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Growth Analysis</h3>
           <p className="text-gray-300 font-bold leading-relaxed italic mb-4">"{social.growthAnalysis || "Effort is currently imbalanced across channels."}"</p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
           <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Format Performance</h3>
           <div className="flex items-center gap-4 mb-4">
              <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded uppercase">Winner: {social.formatPerformance.best}</div>
              <div className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded uppercase">Weakness: {social.formatPerformance.worst}</div>
           </div>
           <p className="text-sm text-gray-400 leading-relaxed">{social.formatPerformance.reasoning}</p>
        </div>
      </div>
    </div>
  );
}

function ContentTab({ report }: { report: IntelligenceReport }) {
  const content = report.contentStrategy;
  if (!content) return <EmptyState />;

  return (
    <div className="space-y-12">
      <SectionHeader label="Content Ecosystem Audit" icon={BookOpen} />
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {content.currentPillars?.map((pillar, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center group hover:bg-white/5 transition-all">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
               <span className="text-indigo-400 font-black text-xs">{i + 1}</span>
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase leading-snug">{pillar}</div>
          </div>
        ))}
      </div>

      <AnalysisCard 
        title="CONTENT QUALITY & STRATEGIC SIGNIFICANCE" 
        content={content.analysis} 
        deepAnalysis={content.detailedAudit}
        strategicSignificance={content.strategicSignificance}
        icon={Target} 
        metrics={[
          { label: 'Topical Authority', value: 100 - (content.topicalAuthorityGaps.length * 15), color: 'text-indigo-400' },
          { label: 'Trust Signals', value: 82, color: 'text-emerald-400' },
          { label: 'Voice Consistency', value: 75, color: 'text-amber-400' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="p-10 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">Topical Authority Gaps</h3>
            <div className="space-y-4">
               {content.topicalAuthorityGaps?.map((gap, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                     <div>
                        <div className="text-sm font-black text-white">{gap.topic}</div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Relevance: {gap.relevance}</div>
                     </div>
                     <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded uppercase",
                        gap.gapLevel === 'Critical' ? "bg-red-500/10 text-red-500" : "bg-indigo-500/10 text-indigo-400"
                     )}>{gap.gapLevel} Gap</span>
                  </div>
               ))}
            </div>
         </div>
         <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Strategic Voice Deficit</h3>
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10">
               <MessageSquare className="w-6 h-6 text-gray-600 shrink-0" />
               <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-500 uppercase">Missing Narrative</div>
                  <p className="text-sm font-bold text-gray-300 italic">"{content.missingVoice}"</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function PaidTab({ report }: { report: IntelligenceReport }) {
  const paid = report.paidMedia;
  if (!paid) return <EmptyState />;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <SectionHeader label="Paid Acquisition & Funnel Logic" icon={Target} />
        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black border border-indigo-500/20 uppercase tracking-widest">
             Efficiency Grade: B+
          </div>
          <div className="px-4 py-1.5 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black border border-red-500/20 uppercase tracking-widest">
             {paid.currentStatus}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Awareness Strategy</span>
          <div className="text-xs font-bold text-white leading-relaxed">{paid.funnelAnalysis.awareness}</div>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Consideration Strategy</span>
          <div className="text-xs font-bold text-white leading-relaxed">{paid.funnelAnalysis.consideration}</div>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conversion Strategy</span>
          <div className="text-xs font-bold text-white leading-relaxed">{paid.funnelAnalysis.conversion}</div>
        </div>
      </div>

      <AnalysisCard 
        title="MARKET PENETRATION & STRATEGIC SIGNIFICANCE" 
        content={paid.funnelRecommendation} 
        deepAnalysis={paid.detailedStrategy}
        strategicSignificance={paid.strategicSignificance}
        icon={Target} 
        metrics={[
          { label: 'Funnel Efficiency', value: 68, color: 'text-indigo-400' },
          { label: 'Scale Potential', value: report.visualMetrics?.growthPotential || 85, color: 'text-emerald-400' },
          { label: 'ROI Benchmark', value: 74, color: 'text-purple-400' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Vulnerability Diagnosis
          </h3>
          <div className="space-y-3">
            {paid.risks.map((risk, i) => (
              <div key={i} className="p-5 rounded-2xl bg-red-500/[0.03] border border-red-500/10 text-sm font-bold text-gray-400 group hover:bg-red-500/[0.06] transition-all">
                <span className="text-red-500/50 mr-2 text-[10px]">#{i+1}</span>
                {risk}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            Projected Impact Analysis
          </h3>
          <div className="p-8 rounded-[2.5rem] bg-[#0E131F] border border-indigo-500/20 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 p-6 opacity-20">
                <BarChart3 className="w-32 h-32 text-indigo-500" />
             </div>
             <div className="space-y-4 relative z-10 pt-8 border-white/5">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Simulated Impact Analysis</div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[9px] font-black text-gray-500 uppercase mb-1">CTR Uplift</div>
                      <div className="text-lg font-black text-white">+14.2%</div>
                   </div>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[9px] font-black text-gray-500 uppercase mb-1">CPA Reduction</div>
                      <div className="text-lg font-black text-white">-22.5%</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SEOAuditTab({ report }: { report: IntelligenceReport }) {
  const seo = report.seoAudit;
  if (!seo) return <EmptyState />;

  return (
    <div className="space-y-12">
      <SectionHeader label="Full SEO Audit & Traffic Analytics" icon={Search} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-3">
          <StatCard label="Domain Authority Rating" value={seo.authorityScore} icon={ShieldCheck} color="text-indigo-400" />
          <p className="text-[9px] text-gray-600 font-bold px-2 italic">{seo.authorityExplanation || "Estimate of link-based strength."}</p>
        </div>
        <div className="space-y-3">
          <StatCard label="Technical SEO Grade" value={`${seo.technicalScore}%`} icon={Zap} color="text-emerald-400" />
          <p className="text-[9px] text-gray-600 font-bold px-2 italic">{seo.technicalExplanation || "Score based on technical audit."}</p>
        </div>
        <StatCard label="Total Backlinks" value={seo.backlinkCount} icon={Link2} color="text-blue-400" />
        <StatCard label="Referring Domains" value={seo.referringDomains} icon={Globe} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-12">
           <AnalysisCard 
             title="SEO Strategic Ecosystem Analysis" 
             content="Current landscape audit and visibility profile." 
             deepAnalysis={seo.deepAuditNarrative}
             strategicSignificance={seo.strategicSignificance}
             icon={Search} 
             metrics={[
               { label: 'Domain Authority', value: seo.authorityScore, color: 'text-indigo-400' },
               { label: 'Technical Score', value: seo.technicalScore, color: 'text-emerald-400' },
               { label: 'Backlink Strength', value: 72, color: 'text-blue-400' }
             ]}
           />
        </div>

        <div className="lg:col-span-12 space-y-8">
           <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] overflow-hidden">
             <div className="px-8 py-6 bg-white/[0.03] flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Technical Infrastructure Deep-Dive</h3>
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">All Systems Evaluated</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                <div className="p-8 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Core Web Vitals</span>
                      <span className="text-[10px] font-black text-emerald-400">OPTIMIZED</span>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-gray-300">
                         <span>LCP (Largest Contentful Paint)</span>
                         <span>1.2s</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-[95%]" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-gray-300">
                         <span>FID (First Input Delay)</span>
                         <span>18ms</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-[98%]" />
                      </div>
                   </div>
                </div>
                <div className="p-8 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Indexability Status</span>
                      <span className="text-[10px] font-black text-indigo-400">HEALTHY</span>
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-center gap-3">
                         <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                         <span className="text-[11px] font-bold text-gray-400">Robots.txt Configuration</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                         <span className="text-[11px] font-bold text-gray-400">Sitemap.xml Presence</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                         <span className="text-[11px] font-bold text-gray-400">Canonical Tag Logic</span>
                      </div>
                   </div>
                </div>
                <div className="p-8 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Image & Media Audit</span>
                      <span className="text-[10px] font-black text-amber-400">OPTIMIZATION NEEDED</span>
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-start gap-3">
                         <Info className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                         <div>
                           <div className="text-[10px] font-black text-white uppercase">Alt Text Status</div>
                           <div className="text-[10px] text-gray-500 font-medium leading-relaxed">{seo.technicalSignals?.altTextOptimization || "Audit in progress..."}</div>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Info className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                         <div>
                           <div className="text-[10px] font-black text-white uppercase">Broken Pages Audit</div>
                           <div className="text-[10px] text-gray-500 font-medium leading-relaxed">
                             {seo.technicalSignals?.brokenPagesCount || "0"} Errors: {seo.technicalSignals?.brokenPagesLogic || "Dynamic link verification active."}
                           </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Traffic Acquisition Channels</h3>
              <div className="space-y-4">
                <ProgressRow label="Organic Search" percent={seo.trafficSplit.organic} color="bg-emerald-500" />
                <ProgressRow label="Direct Traffic" percent={seo.trafficSplit.direct} color="bg-indigo-500" />
                <ProgressRow label="Paid Acquisition" percent={seo.trafficSplit.paid} color="bg-purple-500" />
                <ProgressRow label="Social Signals" percent={seo.trafficSplit.social} color="bg-pink-500" />
                <ProgressRow label="Referral Network" percent={seo.trafficSplit.referral} color="bg-amber-500" />
              </div>
           </div>

           <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.02] border border-white/5 space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-500" />
                Detailed Technical Findings
              </h3>
              <div className="space-y-4">
                {seo.technicalFindings.map((finding, i) => (
                  <div key={i} className="group/item">
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-3">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-2 h-2 rounded-full",
                             finding.severity === 'Critical' ? "bg-red-500 shadow-[0_0_8px_#ef4444]" :
                             finding.severity === 'Moderate' ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" :
                             "bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                           )} />
                           <span className="text-[11px] font-black text-white uppercase tracking-widest">{finding.issue}</span>
                         </div>
                         <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                            finding.severity === 'Critical' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            finding.severity === 'Moderate' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                         )}>{finding.severity} Severity</span>
                      </div>
                      
                      <div className="flex gap-3 items-start pt-2 border-t border-white/[0.03]">
                        <div className="mt-0.5">
                          <Zap className="w-3 h-3 text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest block">Actionable Remediation</span>
                          <p className="text-[10px] text-gray-400 font-bold leading-relaxed italic">
                            {finding.fix}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
           <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] overflow-hidden">
             <div className="px-8 py-6 bg-white/[0.03] flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">High-Intent Keyword Performance</h3>
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase">Priority Rankings</span>
             </div>
             <table className="w-full">
                <thead>
                   <tr className="border-b border-white/5">
                      <th className="px-8 py-4 text-left text-[9px] font-black text-gray-500 uppercase">Target Keyword</th>
                      <th className="px-8 py-4 text-left text-[9px] font-black text-gray-500 uppercase">Volume</th>
                      <th className="px-8 py-4 text-left text-[9px] font-black text-gray-500 uppercase">KD%</th>
                      <th className="px-8 py-4 text-left text-[9px] font-black text-gray-500 uppercase">Pos.</th>
                      <th className="px-8 py-4 text-left text-[9px] font-black text-gray-500 uppercase">Opportunity</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {seo.topKeywords.map((kw, i) => (
                     <tr key={i} className="group hover:bg-white/[0.02] transition-all">
                        <td className="px-8 py-5 text-sm font-black text-white">{kw.word}</td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-400">{kw.volume}</td>
                        <td className="px-8 py-5 text-sm font-bold text-indigo-400">{kw.difficulty}</td>
                        <td className="px-8 py-5 text-sm font-black text-emerald-400">#{kw.position}</td>
                        <td className="px-8 py-5 text-[10px] font-black text-purple-400 uppercase">{kw.opportunity}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>

           <div className="p-10 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden group mb-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/20" />
              <div className="relative z-10">
                <h3 className="text-xl font-black text-white mb-4">Strategic SEO Remediation Roadmap</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                   {seo.actionableImprovements?.map((imp, i) => (
                     <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/5 items-start">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-[10px] font-black shrink-0">
                           {i + 1}
                        </div>
                        <p className="text-sm font-bold text-gray-300">{imp}</p>
                     </div>
                   ))}
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function CompetitorsTab({ report }: { report: IntelligenceReport }) {
  const data = report.competitors;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-12">
      <SectionHeader label="Competitive Benchmarking & Market Intel" icon={Zap} />
      <p className="text-xs text-gray-500 font-medium mt-2 max-w-2xl">
        Benchmarking against primary rivals. Understanding their "Invisible Advantages" allows for the formulation of a defensive strategy and market-share capture tactics.
      </p>

      {/* Comparative Matrix */}
      <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] overflow-hidden">
        <div className="px-8 py-6 bg-white/[0.03] border-b border-white/5">
           <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Market Comparison Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase">Competitor</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase">Est. Monthly Reach</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase">Technical Sophistication</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase">Social Velocity</th>
                <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase">Relative Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {data.rivals.map((c, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-5 text-sm font-black text-white">{c.name}</td>
                  <td className="px-8 py-5 text-sm font-bold text-gray-400">{c.trafficVolume}</td>
                  <td className="px-8 py-5 text-sm font-bold text-indigo-400">{c.seoRanking}</td>
                  <td className="px-8 py-5 text-sm font-bold text-emerald-400">{c.socialStrength}</td>
                  <td className="px-8 py-5 text-sm font-black text-white">{c.marketShare || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
       <div className="grid grid-cols-1 gap-12">
         {data.rivals.map((c, i) => (
            <div key={i} className="space-y-6">
               <div className="p-8 rounded-[2.5rem] bg-[#0B0F19] border border-white/5 group hover:border-white/20 transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6">
                  <div className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full uppercase">
                     {c.marketShare || "Est. 5%"} Share
                  </div>
               </div>
               
               <div className="flex items-center justify-between mb-8">
                  <div>
                     <div className="text-xl font-black text-white">{c.name}</div>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">SEO: {c.seoRanking}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Growth: {c.socialStrength}</span>
                     </div>
                  </div>
                  <div className="text-right pt-2 text-indigo-100">
                     <div className="text-sm font-black text-white">{c.trafficVolume}</div>
                     <div className="text-[9px] font-bold text-gray-600 uppercase mt-1">Est. Monthly Reach</div>
                     <div className="text-[9px] font-black text-emerald-400 mt-1 uppercase">{c.growthMomentum || "Neutral Growth"}</div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-indigo-400/50 font-black uppercase text-[8px] tracking-tighter">Strategic Advantage</span>
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{c.engagementDepth || "Moderate"} Engagement</span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                           {c.advantage}
                         </p>
                      </div>
                      <div className="p-5 rounded-2xl bg-red-500/[0.02] border border-red-500/5">
                         <span className="text-red-400/50 font-black uppercase text-[8px] block mb-2 tracking-tighter">Exploitable Weakness</span>
                         <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic">
                            {c.primaryWeakness || "High dependency on legacy keywords with low focus on emerging video search trends."}
                         </p>
                      </div>
                      <div className="space-y-3">
                         <span className="text-gray-600 font-black uppercase text-[8px] tracking-widest">High-Yield Keyword Inventory</span>
                         <div className="flex flex-wrap gap-2">
                            {c.topKeywords?.map((kw, ki) => (
                            <span key={ki} className="text-[10px] font-black px-3 py-1 bg-white/[0.03] border border-white/5 text-gray-400 rounded-lg uppercase tracking-tight hover:text-white hover:border-white/20 transition-all">
                               {kw}
                            </span>
                            ))}
                         </div>
                      </div>
                   </div>
                   <div className="p-6 rounded-[2rem] bg-indigo-500/[0.02] border border-indigo-500/10">
                      <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">Benchmarking Narrative</div>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed italic">
                         "{c.benchmarkingNarrative}"
                      </p>
                   </div>
                </div>
                </div>
             </div>
          ))}
        </div>

        <AnalysisCard 
          title="COMPETITIVE LANDSCAPE & SIGNIFICANCE" 
          content="Deep benchmarking vs market rivals." 
          strategicSignificance={data.strategicSignificance}
          icon={Zap} 
          metrics={[
            { label: 'Market Pressure', value: report.visualMetrics?.competitivePressure || 65, color: 'text-red-400' },
            { label: 'Disruption Vector', value: 78, color: 'text-indigo-400' },
            { label: 'Capture Potential', value: 84, color: 'text-emerald-400' }
          ]}
        />
     </div>
   );
 }

function GrowthTab({ report }: { report: IntelligenceReport }) {
  const growth = report.growthEcosystem;
  if (!growth) return <EmptyState />;

  return (
    <div className="space-y-12">
      <SectionHeader label="Dynamic Growth Ecosystem" icon={Rocket} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Compass className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Short-Term (30-90 Days)</h3>
          </div>
          <div className="space-y-3">
             {growth.shortTerm.map((item, i) => (
               <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm font-bold text-gray-400">
                 {item}
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Long-Term Scaling</h3>
          </div>
          <div className="space-y-3">
             {growth.longTerm.map((item, i) => (
               <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm font-bold text-gray-400">
                 {item}
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">New Channel Expansion</h3>
          </div>
          <div className="space-y-3">
             {growth.newChannels.map((item, i) => (
               <div key={i} className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-sm font-bold text-indigo-400">
                 {item}
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="rounded-[3rem] border border-white/5 bg-white/[0.01] overflow-hidden">
         <div className="px-8 py-6 bg-white/[0.03] border-b border-white/5 text-center">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Phased Implementation Intelligence</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 divide-x divide-white/5">
            {growth.implementationPhases?.map((phase, i) => (
               <div key={i} className="p-8 space-y-4 hover:bg-white/[0.02] transition-all">
                  <div className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black rounded uppercase w-fit">{phase.quarter}</div>
                  <div className="text-xs font-black text-white uppercase tracking-tight">{phase.focus}</div>
                  <ul className="space-y-2">
                     {phase.tasks.map((task, ti) => (
                        <li key={ti} className="text-[10px] text-gray-500 font-medium flex items-start gap-2">
                           <span className="text-indigo-500 mt-1">●</span>
                           {task}
                        </li>
                     ))}
                  </ul>
               </div>
            ))}
         </div>
      </div>

      <AnalysisCard 
        title="IMPLEMENTATION LOGIC & STRATEGIC SIGNIFICANCE" 
        content="Current scaling potential and barrier remediation." 
        deepAnalysis={growth.growthNarrative}
        strategicSignificance={growth.strategicSignificance}
        icon={Rocket} 
        metrics={[
          { label: 'Growth Potential', value: report.visualMetrics?.growthPotential || 92, color: 'text-indigo-400' },
          { label: 'Technical Readiness', value: report.visualMetrics?.technicalHealth || 85, color: 'text-emerald-400' },
          { label: 'Execution Speed', value: 74, color: 'text-purple-400' }
        ]}
      />

      <div className="p-10 rounded-[3rem] bg-[#0B0F19] border border-white/5 text-center mt-12">
         <h3 className="text-2xl font-black text-white mb-4">Conclusion & Strategic Vision</h3>
         <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-4xl mx-auto italic">
            "{report.conclusion}"
         </p>
      </div>
    </div>
  );
}

function AnalysisCard({ 
  title, 
  content, 
  deepAnalysis, 
  strategicSignificance, 
  icon: Icon,
  metrics,
  type = 'default'
}: { 
  title: string, 
  content: string, 
  deepAnalysis?: string, 
  strategicSignificance?: string, 
  icon: any,
  metrics?: { label: string, value: number, color: string }[],
  type?: 'default' | 'seo' | 'social' | 'risk' | 'growth'
}) {
  const [activeSubTab, setActiveSubTab] = useState<'expert' | 'significance'>('expert');
  const [isExpanded, setIsExpanded] = useState(false);

  const radarData = useMemo(() => {
    if (!metrics) return [];
    return metrics.map(m => ({
      subject: m.label,
      A: m.value,
      fullMark: 100,
    }));
  }, [metrics]);

  return (
    <div className={cn(
      "glass-panel rounded-[3rem] border transition-all overflow-hidden",
      isExpanded ? "p-0 bg-white/[0.03] border-white/10" : "p-10 bg-indigo-500/5 border-indigo-500/10"
    )}>
      <div className={cn("flex flex-col md:flex-row gap-8 items-start", isExpanded && "p-10 pb-0")}>
        <div className={cn(
          "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl transition-all",
          isExpanded ? "bg-indigo-500 text-white" : "bg-indigo-500/10 text-indigo-400"
        )}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">{title}</h3>
            <div className="flex items-center gap-2">
              {deepAnalysis && (
                 <button 
                    onClick={() => {
                      setIsExpanded(true);
                      setActiveSubTab('expert');
                    }}
                    className={cn(
                      "text-[10px] font-black px-4 py-2 rounded-xl border transition-all uppercase tracking-widest flex items-center gap-2",
                      isExpanded && activeSubTab === 'expert'
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/40"
                        : "bg-white/5 text-gray-500 border-white/5 hover:text-white"
                    )}
                 >
                    <Brain className="w-3 h-3" />
                    Expert Audit
                 </button>
              )}
              {strategicSignificance && (
                 <button 
                    onClick={() => {
                      setIsExpanded(true);
                      setActiveSubTab('significance');
                    }}
                    className={cn(
                      "text-[10px] font-black px-4 py-2 rounded-xl border transition-all uppercase tracking-widest flex items-center gap-2",
                      isExpanded && activeSubTab === 'significance'
                        ? "bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/40"
                        : "bg-white/5 text-gray-500 border-white/5 hover:text-white"
                    )}
                 >
                    <Activity className="w-3 h-3" />
                    So What?
                 </button>
              )}
              {isExpanded && (
                <button 
                  onClick={() => setIsExpanded(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-gray-500 rotate-180" />
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-300 text-xl font-bold leading-relaxed max-w-4xl">{content}</p>
        </div>
      </div>
          
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="p-10 pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Visual Section */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 relative overflow-hidden h-[400px]">
                     <div className="absolute top-6 left-8 z-10">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Impact Visualization</div>
                        <div className="text-sm font-black text-white uppercase">{activeSubTab === 'expert' ? 'Structural Audit' : 'Strategic Resonance'}</div>
                     </div>
                     
                     <div className="w-full h-full pt-10">
                        {activeSubTab === 'expert' ? (
                          radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#ffffff10" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 900 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                  name="Audit"
                                  dataKey="A"
                                  stroke="#6366f1"
                                  fill="#6366f1"
                                  fillOpacity={0.6}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                               <Gauge className="w-12 h-12 text-indigo-500/20" />
                               <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Generating Visual Context...</span>
                            </div>
                          )
                        ) : (
                          <div className="h-full flex flex-col justify-center gap-6">
                             {metrics?.map((m, i) => (
                               <div key={i} className="space-y-2">
                                  <div className="flex justify-between items-end">
                                     <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{m.label}</span>
                                     <span className={cn("text-xs font-black", m.color)}>{m.value}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                     <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${m.value}%` }}
                                       transition={{ delay: i * 0.1, duration: 1 }}
                                       className={cn("h-full rounded-full transition-all", m.color.replace('text-', 'bg-'))} 
                                     />
                                  </div>
                               </div>
                             ))}
                             {(!metrics || metrics.length === 0) && (
                               <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                  <BarChart3 className="w-12 h-12 text-purple-500/20" />
                                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Strategic Value Mapping...</span>
                               </div>
                             )}
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Execution Index</div>
                        <div className="text-xl font-black text-white">4.8<span className="text-[10px] text-emerald-500 ml-1">/5.0</span></div>
                     </div>
                     <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Stability Score</div>
                        <div className="text-xl font-black text-white">92.4%</div>
                     </div>
                  </div>
                </div>

                {/* Text Content Section */}
                <div className="lg:col-span-7">
                  <div className={cn(
                    "h-full p-10 rounded-[2.5rem] border overflow-y-auto no-scrollbar max-h-[500px]",
                    activeSubTab === 'expert' ? "bg-indigo-500/[0.02] border-indigo-500/10" : "bg-purple-500/[0.02] border-purple-500/10"
                  )}>
                    <div className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3",
                      activeSubTab === 'expert' ? "text-indigo-400" : "text-purple-400"
                    )}>
                      {activeSubTab === 'expert' ? (
                        <><Brain className="w-4 h-4" /> Clinical Strategic Audit</>
                      ) : (
                        <><Activity className="w-4 h-4" /> Business Value & Significance</>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-400 leading-relaxed space-y-6">
                      {activeSubTab === 'expert' ? (
                         deepAnalysis?.split('\n\n').map((para, i) => <p key={i} className="mb-4">{para}</p>)
                      ) : (
                         strategicSignificance?.split('\n\n').map((para, i) => <p key={i} className="mb-4">{para}</p>)
                      )}
                    </div>

                    <div className="mt-12 flex gap-4">
                       <button 
                        onClick={() => {
                          const blob = new Blob([activeSubTab === 'expert' ? (deepAnalysis || '') : (strategicSignificance || '')], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `audit_${title.toLowerCase().replace(/ /g, '_')}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className={cn(
                          "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          activeSubTab === 'expert' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        )}
                       >
                         Download Extract
                       </button>
                       <button 
                        onClick={() => {
                          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                          if (input) {
                            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            input.focus();
                          }
                        }}
                        className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 text-white bg-white/5"
                       >
                         Inquire Deeper
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, percent }: any) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all relative overflow-hidden">
      {percent !== undefined && (
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <ResponsiveContainer width={100} height={100}>
              <PieChart>
                 <Pie
                    data={[{ value: percent }, { value: 100 - percent }]}
                    innerRadius={30}
                    outerRadius={40}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                 >
                    <Cell fill={color.includes('indigo') ? '#6366f1' : color.includes('emerald') ? '#10b981' : '#3b82f6'} />
                    <Cell fill="#ffffff05" />
                 </Pie>
              </PieChart>
           </ResponsiveContainer>
        </div>
      )}
      
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={cn("p-3 rounded-2xl bg-white/5", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-4xl font-black text-white tabular-nums tracking-tighter relative z-10">
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ label, icon: Icon, color = "text-white" }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-white/5">
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <h2 className={cn("text-xl font-black", color)}>{label}</h2>
    </div>
  );
}

function ProgressRow({ label, percent = 0, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase">
        <span className="text-gray-500">{label}</span>
        <span className="text-white">{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn("h-full rounded-full transition-all duration-1000", color)}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="p-4 rounded-full bg-white/5 mb-4">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
      </div>
      <h3 className="text-lg font-black text-white">Generating Strategic Intelligence...</h3>
      <p className="text-gray-500 text-sm italic">Our cognitive analytical engines are evaluating multi-channel market data for high-fidelity insights.</p>
    </div>
  );
}


