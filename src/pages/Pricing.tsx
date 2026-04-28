import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Zap, Globe, CreditCard, Bitcoin, ArrowRight, Target } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { CheckoutModal } from '../components/CheckoutModal';

const PricingPage: React.FC = () => {
  const { login, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const plans = [
    {
      name: "Tactical Command",
      price: "499",
      billing: "per month",
      desc: "For growing teams scaling to $50k-$100k/mo.",
      features: [
        "Unlimited Ad Account Audits",
        "Strategic 30-Day Roadmap Engine",
        "Creative Intelligence Benchmarking",
        "Real-time Spend Anomaly Alerts",
        "Standard API Integration",
        "24/7 System Surveillance"
      ],
      button: "Start Monthly Protocol",
      popular: false
    },
    {
      name: "Elite Dominance",
      price: "3,999",
      billing: "per year",
      desc: "For institutional advertisers scaling beyond $500k/mo.",
      features: [
        "Everything in Tactical Command",
        "Advanced Market Intelligence Engine",
        "Proprietary Creative Score Laboratory",
        "Dedicated Performance Architect",
        "Institutional Data Archiving",
        "Early Access to Beta Scaling Tools",
        "White-Glove Onboarding Audit"
      ],
      button: "Claim Annual Dominance",
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter">OPERATOR AI</span>
          </div>
          <button 
            onClick={login}
            className="text-xs font-black uppercase tracking-widest bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all"
          >
            Login / Access Terminal
          </button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8"
          >
            Enterprise Access Protocols
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter uppercase leading-[0.9]">
            Architectural <br /> Pricing.
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-16 leading-relaxed">
            Professional-grade intelligence is an investment, not a cost. Choose your command 
            level and automate your path to 8-figure dominance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 text-left">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-10 rounded-[3rem] border transition-all ${
                  plan.popular 
                    ? 'bg-blue-600 border-blue-400 shadow-2xl shadow-blue-600/20' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                    Institutional Choice • 20% Saved
                  </div>
                )}
                
                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                <p className={`${plan.popular ? 'text-blue-100' : 'text-gray-500'} text-xs font-bold uppercase tracking-widest mb-10`}>
                  {plan.desc}
                </p>

                <div className="flex items-baseline gap-2 mb-10">
                  <span className="text-5xl font-black tracking-tighter">${plan.price}</span>
                  <span className={`text-sm font-bold uppercase tracking-widest ${plan.popular ? 'text-blue-200' : 'text-gray-500'}`}>
                    {plan.billing}
                  </span>
                </div>

                <ul className="space-y-4 mb-12">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className={`w-5 h-5 ${plan.popular ? 'text-blue-200' : 'text-blue-500'}`} />
                      <span className={plan.popular ? 'text-white' : 'text-gray-300'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => user ? setSelectedPlan(plan) : login()}
                  className={`w-full py-5 rounded-2xl font-black transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                    plan.popular 
                      ? 'bg-white text-blue-600 hover:bg-blue-50' 
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {plan.button} <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Payment Methods Section */}
          <div className="border-t border-white/5 pt-20">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-12">SECURE PAYMENT INFRASTRUCTURE</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 items-center opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <div className="flex flex-col items-center gap-3 group">
                <CreditCard className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs">STRIPE / VISA</span>
              </div>
              <div className="flex flex-col items-center gap-3 group">
                <Shield className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs uppercase">Fawry / Meeza</span>
              </div>
              <div className="flex flex-col items-center gap-3 group">
                <Zap className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs uppercase">Vodafone Cash</span>
              </div>
              <div className="flex flex-col items-center gap-3 group">
                <Target className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs uppercase">Instapay Egypt</span>
              </div>
              <div className="flex flex-col items-center gap-3 group md:col-span-2 lg:col-span-1">
                <Bitcoin className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs uppercase">Crypto / USDT</span>
              </div>
            </div>
            <p className="mt-12 text-sm text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              All transactions are encrypted via 256-bit SSL protocol. 
              Supports local gateways in Egypt (Fawry, Vodafone Cash) and the GCC region.
            </p>
          </div>

          {/* New: Payment Flow Explanation */}
          <div className="mt-32 max-w-4xl mx-auto grid md:grid-cols-3 gap-12 text-left">
            {[
              { 
                step: "01", 
                title: "Protocol Selection", 
                desc: "Choose your access tier based on your monthly ad spend objectives." 
              },
              { 
                step: "02", 
                title: "Identity Verification", 
                desc: "Authenticate your business through our secure auth layer powered by Google." 
              },
              { 
                step: "03", 
                title: "Gateway Execution", 
                desc: "Finalize payment via Stripe's encrypted infrastructure or Crypto direct link." 
              }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="text-4xl font-black text-white/5 mb-4 group-hover:text-blue-500/20 transition-colors">{item.step}</div>
                <h4 className="text-lg font-black mb-2 uppercase">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Quote */}
      <section className="py-32 bg-white text-black text-center px-6">
        <div className="max-w-4xl mx-auto">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-8 block">Architecture Review</span>
          <p className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] mb-12 italic">
            "Operator AI replaced three of our full-time analysts and increased our ROAS by 42% in the first quarter. It's the only tool we trust with an eight-figure budget."
          </p>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-black w-12 h-12 rounded-full" />
            <div className="font-black text-sm uppercase tracking-widest">Growth Director • Tier 1 Agency</div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto">
           <div className="flex justify-center gap-8 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Security Protocol</a>
           </div>
           <p className="text-[10px] font-black text-gray-700 tracking-[0.2em]">© 2026 OPERATOR INTELLIGENCE GROUP</p>
        </div>
      </footer>

      {selectedPlan && (
        <CheckoutModal 
          plan={selectedPlan} 
          onClose={() => setSelectedPlan(null)} 
        />
      )}
    </div>
  );
};

export default PricingPage;
