import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Rocket, Target, LayoutDashboard, Copy, Check } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useAiSettings } from '../hooks/useAiSettings';
import { analyzeWithGemini } from '../lib/gemini';
import Markdown from 'react-markdown';

export function GrowthPlanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { provider: aiProvider } = useAiSettings();
  
  const [strategyData, setStrategyData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.strategyData) {
      setStrategyData(location.state.strategyData);
      generateMonthPlan(location.state.strategyData);
    } else {
      setError("No initial context provided. Please run a Pre-Funnel Scan first.");
    }
  }, [location.state]);

  const generateMonthPlan = async (data: any) => {
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = `
        Based on the following deep competitive analysis and market scan, generate a comprehensive 30-day Growth & Content Strategy playbook.

        CONTEXT:
        Competitors: ${JSON.stringify(data.competitorInsights?.tier1)}
        Market Trends: ${JSON.stringify(data.marketTrends)}
        Funnel Strategy: ${JSON.stringify(data.funnelStrategy)}
        
        TASK:
        Provide a highly actionable, week-by-week (4 weeks) execution plan.
        Include:
        - Week 1: Setup & Testing (Angles to test, budgets to allocate)
        - Week 2: Content Optimization & Creative Formats
        - Week 3: Scaling & Budget Shifts
        - Week 4: Retargeting & Advanced Market Capture
        
        Write the plan entirely in Arabic, with a professional media buyer tone. Use markdown formatting.
      `;

      let aiResult = '';
      if (aiProvider === 'gemini') {
        aiResult = await analyzeWithGemini(prompt, false);
      } else {
        const response = await fetch('/api/intelligence/advanced-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user!.uid },
          body: JSON.stringify({ prompt, model: aiProvider || 'gemini' })
        });
        
        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType || !contentType.includes('application/json')) {
           const errText = await response.text();
           throw new Error(`Server returned ${response.status}: ${errText.slice(0, 100)}`);
        }
        const parsed = await response.json();
        if (parsed.error) throw new Error(parsed.error);
        aiResult = parsed.result;
      }
      
      setPlan(aiResult);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (plan) {
      navigator.clipboard.writeText(plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
              <Calendar className="w-6 h-6 text-pink-400" />
            </div>
            30-Day Growth Planner
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">Auto-generated strategic execution playbook based on your competitor intelligence scan.</p>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <p className="text-red-400 font-bold">{error}</p>
          <button onClick={() => navigate('/pre-funnel')} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-all">Go back to Pre-Funnel</button>
        </div>
      ) : isGenerating ? (
        <div className="flex flex-col items-center justify-center p-24 bg-[#0B0F19] rounded-3xl border border-white/5 shadow-2xl">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-pink-500/20 blur-xl rounded-full"></div>
            <Sparkles className="w-12 h-12 text-pink-400 animate-pulse relative z-10" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Architecting 30-Day Playbook...</h3>
          <p className="text-sm tracking-widest text-muted-foreground font-bold uppercase animate-pulse">Running advanced market compilation</p>
        </div>
      ) : plan ? (
        <div className="bg-[#0B0F19] rounded-3xl border border-white/5 shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] pointer-events-none"></div>
          
          <div className="flex justify-end mb-6">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Strategy'}
            </button>
          </div>

          <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-headings:text-white max-w-none text-right" dir="auto">
            <Markdown>{plan}</Markdown>
          </div>
        </div>
      ) : null}
    </div>
  );
}
