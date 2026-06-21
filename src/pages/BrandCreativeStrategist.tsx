import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Link as LinkIcon,
  Crosshair,
  MessageSquareHeart,
  Palette,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clapperboard,
  Compass
} from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { scrapeWebsite } from '../services/scraper';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TONE_PRESETS = [
  'Luxury', 'Emotional', 'Premium', 'Minimal', 'Feminine', 'Bold', 
  'Gen Z', 'Clinical', 'Soft luxury', 'Confident', 'High-end beauty'
];

export function BrandCreativeStrategist() {
  const [brandUrl, setBrandUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState('');
  const [brandingDirection, setBrandingDirection] = useState('');
  const [tonePreset, setTonePreset] = useState('');
  const [toneExamples, setToneExamples] = useState('');
  const [funnelFilter, setFunnelFilter] = useState('All');
  const [outputLanguage, setOutputLanguage] = useState('Arabic');
  
  const [showOptional, setShowOptional] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!brandUrl) {
      setError("Please provide at least a Brand Website URL.");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    try {
      let scrapedData = "";
      try {
        const webData = await scrapeWebsite(brandUrl);
        scrapedData += JSON.stringify(webData).substring(0, 50000); 
      } catch (err) {
        console.warn("Could not scrape Brand URL", err);
      }

      let compScrapedData = "";
      if (competitorUrls) {
        compScrapedData = "Competitor URLs to consider: " + competitorUrls;
      }

      const prompt = `
You are an elite AI Growth Strategist specialized in building full-funnel branding and performance marketing systems for beauty, fashion, skincare, lifestyle, b2b, b2c, and ecommerce brands.

Your job is to deeply analyze a brand from its website URL and generate a complete branding + advertising ecosystem for Meta and TikTok.

You do NOT generate generic marketing ideas. You think like:
- Brand Strategist
- Creative Director
- Performance Marketing Lead
- Consumer Psychologist
- Media Buyer

Your output must feel like agency-level strategic work.

==================================================
INPUT
==================================================
Brand Website Content: ${scrapedData}
${competitorUrls ? "Competitor Context: " + compScrapedData : ""}
Branding Direction Vision: ${brandingDirection || "Use best judgment based on website"}
Tone Preset: ${tonePreset || "Determine from brand"}
Tone Examples/Copy: ${toneExamples}
Target Funnel Stage Request: ${funnelFilter}
Language Requirement: ALL generated text values MUST BE in ${outputLanguage} language.

==================================================
OUTPUT STRUCTURE (Use Markdown Format)
==================================================
You MUST format your output in Markdown. Use the following EXACT structure and stylistic layout. Do not deviate from this outline:

# [Brand Name] — Full Branding Funnel Strategy

## الهدف
[Explain the goal, e.g., building a premium brand around self-care, etc.]

مش:
* [What not to do 1]
* [What not to do 2]
[Add more if needed]

---

# 🎯 الـ Funnel Structure

## TOF — Top Of Funnel
### الهدف: 
* [Goal 1]
* [Goal 2]
### الرسالة: 
> "[Core Message]"
### نوع المحتوى: 
* [Content Type 1]
* [Content Type 2]
### AIDA هنا: 
* A = [Attention]
* I = [Interest]
* D = [Desire]
* A = [Action]

## MOF — Middle Of Funnel
### الهدف: 
* [Goal]
### الرسالة: 
> "[Core Message]"
### نوع المحتوى: 
* [Content Types]
### AIDA هنا: 
* A = [Attention]
* I = [Interest]
* D = [Desire]
* A = [Action]

## BOF — Bottom Of Funnel
### الهدف: 
* [Goal]
### الرسالة: 
> "[Core Message]"
### نوع المحتوى: 
* [Content Types]
### AIDA هنا: 
* A = [Attention]
* I = [Interest]
* D = [Desire]
* A = [Action]

---

# META ADS STRATEGY

# Campaign 1 — TOF Awareness
## Objective: 
[E.g., Video Views]
## Budget Split: 
[E.g., 40%]

## Ad Sets:
### 1) [Audience Name, e.g., Women 18-24]
#### Interests: 
* [List interests]

### 2) [Audience Name]
#### Interests: 
* [List interests]

### 3) [Audience Name]
[Details, e.g., بدون interests / broad]

---

## Each Ad Set Contains:
### [X] Ads
#### Ad 1
* [Format: Reel / Static / Carousel]
* [Angle / Approach]

#### Ad 2
* [Format: Reel / Static / Carousel]
* [Angle / Approach]

[Create Campaign 2 - MOF Consideration, Campaign 3 - BOF Conversion following the EXACT SAME structural format above]

---

# TikTok Strategy
⚠️ TikTok مختلف عن Meta
Meta:
* [Differences]
TikTok:
* [Differences]

---

# TikTok Funnel
# Campaign 1 — Broad Testing
## Objective: 
[Objective]
## Audience: 
[Audience details]

---

## داخل الحملة:
### [X] Creatives
#### انواع الكريتيف: 
* [Creative styles]

[Add Campaign 2 - Engagement Retargeting, Campaign 3 - Conversion for TikTok matching the identical structure]

---

# Creative System Rules
## Meta
* [List rules]
## TikTok
* [List rules]

---

# Content Ratio
## Every [X] Creatives:
### [X] TOF
[Branding explanation]
### [X] MOF
[Needs + solution explanation]
### [X] BOF
[Conversion explanation]

---

# Positioning Sentence
البراند لازم يتمركز حوالين:
> "[Core positioning sentence]"

مش:
> "[Commodity explanation]"

وده الفرق بين:
* brand
و
* commodity product.

---

## campaign 1 — TOF awareness
### ad set 1 — [Audience]
#### interests
[List interests]

---

### ad 1 — reel
#### angle
[Angle name]

[Copy/Description paragraph]

### reel script
scene 1
[Description]

vo:
"[Voice Over line]"

scene 2
[Description]

vo:
"[Voice Over line]"

---

### ad 2 — static
#### angle
[Angle name]

copy:
> [Copy text]

---

[Repeat the script/copy breakdown format for MOF Ads and BOF Ads using exactly the headings and styling above]

---

# tiktok creatives style
## TOF
* [Styles]

hook examples:
* "[Hook 1]"
* "[Hook 2]"

---

## MOF
* [Styles]

---

## BOF
* [Styles]

---

# important creative rule
## meta
بيع:
* [Core value 1]
* [Core value 2]

## tiktok
بيع:
* [Core value 1]
* [Core value 2]

==================================================
IMPORTANT RULES
==================================================
- Output should feel like a premium growth agency strategy deck.
- DO NOT use markdown code blocks \`\`\`markdown, just output the raw markdown directly.
- The tone should match the requested Tone Preset.
- Adhere firmly to the ${outputLanguage} language requested (if Arabic, mix Franco/English industry terms naturally just like the structural example).
- Use proper line breaks and list bullet points formatting.
      `;

      const result = await analyzeWithGemini(prompt, false);
      
      let sanitizedResult = result.trim();
      if (sanitizedResult.startsWith('\`\`\`markdown')) {
        sanitizedResult = sanitizedResult.replace(/^\`\`\`markdown\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
      } else if (sanitizedResult.startsWith('\`\`\`')) {
        sanitizedResult = sanitizedResult.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '').trim();
      }

      setAnalysisResult(sanitizedResult);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to analyze. Please check parameters.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 overflow-x-hidden">
      <section className="relative pt-12 pb-20 px-6 border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/5 skew-x-12 translate-x-1/2 blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              B.C AI Strategist
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 uppercase">
              Brand Creative <br />
              <span className="text-indigo-400">Strategist</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl font-medium">
              Transform into a premium agency creative director. Analyze brand positioning, find emotional gaps, and generate cinematic, need-based creative strategies.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl focus-within:border-indigo-500/50">
                <div className="pl-6 text-muted-foreground shrink-0"><LinkIcon className="w-5 h-5" /></div>
                <input type="text" placeholder="Enter Brand Website URL" className="w-full bg-transparent border-none py-4 px-6 text-white focus:outline-none font-bold placeholder:font-normal" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 w-fit"
              >
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Positioning & Competitors (Optional)
              </button>
              
              <AnimatePresence>
                {showOptional && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden focus-within:border-indigo-500/50">
                        <div className="pl-4 text-gray-500 shrink-0"><Crosshair className="w-5 h-5" /></div>
                        <input type="text" placeholder="Competitor URLs (comma separated)" className="w-full bg-transparent border-none py-4 px-4 text-white focus:outline-none text-sm placeholder:text-muted-foreground font-medium" value={competitorUrls} onChange={(e) => setCompetitorUrls(e.target.value)} />
                      </div>
                      <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden focus-within:border-indigo-500/50">
                        <div className="pl-4 text-gray-500 shrink-0"><Palette className="w-5 h-5" /></div>
                        <select className="w-full bg-transparent border-none py-4 px-4 text-white focus:outline-none text-sm font-medium outline-none appearance-none cursor-pointer" value={tonePreset} onChange={(e) => setTonePreset(e.target.value)}>
                          <option value="" className="bg-brand-panel">Select Tone Preset (Auto)</option>
                          {TONE_PRESETS.map(t => <option key={t} value={t} className="bg-brand-panel">{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      <div className="relative flex items-center bg-brand-panel border border-white/10 rounded-2xl overflow-hidden focus-within:border-indigo-500/50">
                        <div className="pl-4 text-gray-500 shrink-0"><MessageSquareHeart className="w-5 h-5" /></div>
                        <select className="w-full bg-transparent border-none py-4 px-4 text-white focus:outline-none text-sm font-medium outline-none appearance-none cursor-pointer" value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)}>
                          <option value="Arabic" className="bg-brand-panel">Arabic (العربية)</option>
                          <option value="English" className="bg-brand-panel">English</option>
                          <option value="Spanish" className="bg-brand-panel">Spanish (Español)</option>
                          <option value="French" className="bg-brand-panel">French (Français)</option>
                          <option value="German" className="bg-brand-panel">German (Deutsch)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <textarea 
                        placeholder="Branding Direction (e.g. 'I want the brand to feel feminine, elegant, premium, emotionally comforting...')"
                        className="w-full bg-brand-panel border border-white/10 py-4 px-6 rounded-2xl text-white font-medium focus:border-indigo-500/50 outline-none text-sm h-20 resize-none"
                        value={brandingDirection}
                        onChange={(e) => setBrandingDirection(e.target.value)}
                      />
                      <textarea 
                        placeholder="Paste existing copy or tone examples here..."
                        className="w-full bg-brand-panel border border-white/10 py-4 px-6 rounded-2xl text-white font-medium focus:border-indigo-500/50 outline-none text-sm h-20 resize-none"
                        value={toneExamples}
                        onChange={(e) => setToneExamples(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-4 py-2">
               <span className="text-xs font-black text-gray-500 uppercase tracking-widest shrink-0">Focus Funnel:</span>
               <div className="flex gap-2 bg-brand-panel p-1 rounded-xl border border-white/10">
                 {['All', 'TOF', 'MOF', 'BOF'].map(f => (
                   <button 
                     key={f} 
                     onClick={() => setFunnelFilter(f)}
                     className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", funnelFilter === f ? "bg-indigo-500/20 text-indigo-400" : "text-gray-500 hover:text-muted-foreground")}
                   >
                     {f}
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex justify-start pt-4">
               <button 
                 onClick={handleAnalyze}
                 disabled={isAnalyzing || !brandUrl}
                 className={cn(
                   "h-auto py-5 px-10 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl",
                   isAnalyzing ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/20"
                 )}
               >
                 {isAnalyzing ? (
                   <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ARCHITECTING...</>
                 ) : (
                   <><Sparkles className="w-5 h-5" /> GENERATE BRAND STRATEGY</>
                 )}
               </button>
            </div>
            
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 w-fit text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="font-bold text-sm tracking-tight">{error}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {analysisResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto mt-12 px-6">
             <div className="p-8 md:p-14 rounded-[3rem] bg-brand-panel border border-white/10 shadow-2xl relative overflow-hidden mb-20 relative">
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                
                <div dir="auto" className="markdown-body prose prose-invert max-w-none 
                  prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:font-black prose-h1:tracking-tighter prose-h1:uppercase prose-h1:mb-10 prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-4 prose-h1:text-white
                  prose-h2:text-2xl prose-h2:font-black prose-h2:text-indigo-400 prose-h2:mt-12 prose-h2:mb-6 prose-h2:tracking-wider
                  prose-h3:text-lg prose-h3:font-bold prose-h3:text-emerald-400 prose-h3:mt-8 prose-h3:uppercase prose-h3:tracking-widest
                  prose-h4:text-base prose-h4:font-bold prose-h4:text-foreground
                  prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-base
                  prose-li:text-gray-300 prose-li:text-base prose-li:my-1
                  prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-white prose-blockquote:font-bold prose-blockquote:text-lg
                  prose-strong:text-white prose-strong:font-bold
                  prose-hr:border-white/10 prose-hr:my-12
                  relative z-10"
                >
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>
                     {analysisResult}
                   </ReactMarkdown>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!analysisResult && !isAnalyzing && (
        <section className="max-w-7xl mx-auto mt-20 px-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Brand Intelligence', desc: 'Identifies exactly where your brand stands in market sophistication and awareness.', icon: Compass },
                { title: 'Emotional Archetyping', desc: 'Detects the hidden emotional gaps your competitors are completely ignoring.', icon: MessageSquareHeart },
                { title: 'Cinematic Strategy', desc: 'Generates robust, need-based AIDA structures for high-converting social campaigns.', icon: Clapperboard }
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
