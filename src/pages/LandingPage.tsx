import React from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  ArrowRight, 
  Star,
  CheckCircle2,
  Globe,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function LandingPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-blue-500/30">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Target className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter">OPERATOR AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Strategic Features</a>
          <a href="/pricing" className="hover:text-white transition-colors text-blue-500">Pricing</a>
          <a href="#results" className="hover:text-white transition-colors">Success Metrics</a>
        </div>
        <button 
          onClick={login}
          className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gray-200 transition-all active:scale-95 shadow-xl"
        >
          Login / Access Terminal
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
            <Zap className="w-3 h-3 fill-current" /> Next-Gen Ad Orchestration • Enterprise Intelligence
          </span>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8">
            PRECISION <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">MARKETING</span> <br />
            AUTONOMY.
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Stop guessing. Start orchestrating. <br className="hidden md:block" />
            Operator AI is the high-precision command layer for specialized marketing teams 
            demanding architectural perfection and aggressive scaling.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="w-full sm:w-auto bg-blue-600 px-10 py-5 rounded-2xl text-lg font-black hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-[0.98]"
            >
              Start Free Performance Audit <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={login}
              className="w-full sm:w-auto border border-white/10 bg-white/5 backdrop-blur-md px-10 py-5 rounded-2xl text-lg font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              Access Terminal
            </button>
          </div>
          <p className="mt-8 text-sm text-gray-500 font-medium">Use your Google account for secure instant access.</p>
        </motion.div>
      </section>

      {/* Proof Section */}
      <section className="relative z-10 py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { label: 'Total Managed Spend', value: '$840M+' },
            { label: 'Scale Efficiency', value: '94.2%' },
            { label: 'Audits Processed', value: '12,400+' },
            { label: 'Avg ROAS Growth', value: '42%' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-4xl font-black text-blue-500 mb-2">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating UI Teaser */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-6xl mx-auto p-2 md:p-4 rounded-[3rem] bg-gradient-to-b from-gray-800/30 to-transparent border border-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden group">
          <div className="aspect-video rounded-[2.5rem] bg-[#030712] border border-white/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-transparent pointer-events-none" />
            {/* Simulated UI Content */}
            <div className="p-4 md:p-12 h-full flex flex-col">
              <div className="flex justify-between items-start mb-12">
                <div className="space-y-1">
                  <h4 className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.2em]">SYSTEM STATUS: OPERATIONAL</h4>
                  <div className="h-1 w-12 bg-blue-500 rounded-full" />
                </div>
                <div className="hidden md:flex gap-2">
                  <div className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-[10px] font-black border border-green-500/20 uppercase tracking-widest">Growth Potential: High</div>
                  <div className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/20 uppercase tracking-widest">Asset Audit Active</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 flex-1">
                {[
                  { label: 'Yield Sentiment', value: 'BULLISH', sub: 'Strong Scaling Signals', icon: TrendingUp, color: 'text-green-500' },
                  { label: 'Creative IQ', value: 'A+ RATING', sub: 'Optimal Performance', icon: Cpu, color: 'text-blue-500' },
                  { label: 'Protocol Defense', value: 'ACTIVE', sub: 'Preventing Waste', icon: ShieldCheck, color: 'text-indigo-500' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 p-6 md:p-8 rounded-[2rem] flex flex-col justify-between group-hover:bg-white/[0.05] transition-all">
                    <stat.icon className={`w-10 h-10 ${stat.color} mb-6`} />
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2">{stat.label}</div>
                      <div className="text-2xl md:text-3xl font-black mb-1">{stat.value}</div>
                      <div className="text-xs text-gray-600">{stat.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* English Transformation Section */}
      <section className="relative z-10 py-32 bg-blue-600">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight">
              TRANSFORM DATA INTO <br />
              <span className="text-blue-200">STRATEGIC POWER.</span>
            </h2>
            <p className="text-xl text-blue-100/80 mb-12 leading-relaxed">
              Operator AI is more than a dashboard. It is the intelligence core that decodes 
              market behavior, identifies growth leakage, and builds the roadmap to 8-figure scaling.
            </p>
            <div className="space-y-6">
              {[
                "Strategic capital allocation analysis",
                "Real-time autonomous performance safeguards",
                "Creative structural performance scoring",
                "Predictive yield forecasting algorithms"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-white font-bold">
                  <CheckCircle2 className="w-6 h-6 text-blue-200" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative group">
             <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full group-hover:scale-110 transition-all duration-500" />
             <div className="relative bg-[#030712] p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  <div className="h-4 w-1/2 bg-blue-500/20 rounded-full" />
                  <div className="h-32 w-full bg-white/[0.03] rounded-3xl" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-white/[0.03] rounded-2xl" />
                    <div className="h-20 bg-blue-600/20 rounded-2xl border border-blue-500/30" />
                  </div>
                  <div className="h-4 w-3/4 bg-blue-500/20 rounded-full" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-3xl md:text-6xl font-black mb-6">ARCHITECTURAL COMMAND.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Stop sacrificing margin to inefficiency. Deploy Operator AI to monitor, 
            diagnose, and optimize your entire portfolio autonomously.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Strategic Roadmap Engine",
              desc: "Deep analysis of your performance patterns and automated roadmap generation for the next 30 days.",
              icon: Target,
              sub: "PRECISION PLANNING"
            },
            {
              title: "Portfolio Surveillance",
              desc: "Tactical oversight of your ad accounts to catch budget spikes or targeting failures before they drain capital.",
              icon: Zap,
              sub: "REAL-TIME PROTECTION"
            },
            {
              title: "Creative Integrity Core",
              desc: "A proprietary scoring system that ranks your creatives and suggests structural improvements.",
              icon: BarChart3,
              sub: "CONTENT OPTIMIZATION"
            }
          ].map((feature, i) => (
            <div key={i} className="group p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20">
                <feature.icon className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-2xl font-black mb-2">{feature.title}</h3>
              <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-6">{feature.sub}</p>
              <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-6xl font-black mb-6 uppercase tracking-tighter">Enterprise Access</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Professional-grade intelligence for teams scaling beyond $100k/mo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Monthly Plan */}
            <div className="relative group p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black mb-2">Monthly Command</h3>
                  <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Flexible Monthly Access</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black">$499</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Per Month</div>
                </div>
              </div>
              <ul className="space-y-4 mb-12">
                {[
                  "Unlimited Account Audits",
                  "Strategic Roadmap Engine",
                  "Creative Intelligence Core",
                  "Market Surveillance Alerts",
                  "Autonomous Performance Safeguards",
                  "Priority Support Link"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="w-full py-5 rounded-2xl bg-white text-black font-black hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                Start Monthly Plan
              </button>
            </div>

            {/* Yearly Plan */}
            <div className="relative group p-12 rounded-[3.5rem] bg-blue-600 border border-blue-500 shadow-2xl shadow-blue-500/20">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Best Value • 20% Off</div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black mb-2">Annual Dominance</h3>
                  <p className="text-blue-100/60 text-sm font-bold uppercase tracking-widest">Full Yearly Protocol</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-white">$399</div>
                  <div className="text-[10px] text-blue-100 font-bold uppercase">Billed Yearly</div>
                </div>
              </div>
              <ul className="space-y-4 mb-12">
                {[
                  "Everything in Monthly",
                  "Strategic Onboarding Audit",
                  "Dedicated Success Liaison",
                  "Custom Reporting Templates",
                  "Early Access to Lab Tools",
                  "Institutional Data Archiving",
                  "MENA Performance Gateways"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-blue-200" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="w-full py-5 rounded-2xl bg-white text-blue-600 font-black hover:bg-blue-50 transition-all active:scale-[0.98]"
              >
                Claim Yearly Dominance
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto bg-white text-black rounded-[4rem] p-12 md:p-32 text-center shadow-[0_40px_100px_rgba(255,255,255,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tighter">ELITE ACCESS <br /> ONLY.</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-16 text-xl leading-relaxed">
            We don't sell tools. We sell dominance. Join the elite advertisers who have 
            already automated their path to 8-figures.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-20">
            <div className="flex items-center gap-4">
              <Star className="w-6 h-6 text-blue-600 fill-current" />
              <span className="font-black text-sm uppercase tracking-widest">Enterprise Intel</span>
            </div>
            <div className="flex items-center gap-4">
              <Star className="w-6 h-6 text-blue-600 fill-current" />
              <span className="font-black text-sm uppercase tracking-widest">24/7 Surveillance</span>
            </div>
            <div className="flex items-center gap-4">
              <Star className="w-6 h-6 text-blue-600 fill-current" />
              <span className="font-black text-sm uppercase tracking-widest">Strategic Roadmap</span>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/pricing'}
            className="bg-black text-white px-16 py-6 rounded-3xl text-2xl font-black hover:bg-gray-900 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 mx-auto"
          >
            Claim Dominance • Access Command <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-16">
          <div className="flex flex-col items-start gap-6">
            <div className="flex items-center gap-2">
              <Target className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-black tracking-tighter">OPERATOR AI</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed font-medium">
              The precision orchestration layer for high-performance marketing teams. 
              Built for architectural scale.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-16 md:gap-32">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic</h5>
              <div className="flex flex-col gap-2 text-sm text-gray-400 font-medium">
                 <a href="#" className="hover:text-white transition-colors">Audit Engine</a>
                 <a href="#" className="hover:text-white transition-colors">Roadmaps</a>
                 <a href="#" className="hover:text-white transition-colors">Alerts</a>
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Corporation</h5>
              <div className="flex flex-col gap-2 text-sm text-gray-400 font-medium">
                 <a href="#" className="hover:text-white transition-colors">Privacy</a>
                 <a href="#" className="hover:text-white transition-colors">Terms</a>
                 <a href="#" className="hover:text-white transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-32 flex justify-between items-center text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
           <span>© 2026 Operator Intelligence Group. All Rights Reserved.</span>
           <div className="flex gap-8">
              <span>Secure Command Link</span>
              <span>Global Intelligence Network</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
