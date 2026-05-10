import React, { useState } from 'react';
import { Calculator, Globe, Building2, Coins, MapPin, Sparkles, Loader2, Link2, Target } from 'lucide-react';
import { cn, safeJson } from '../lib/utils';
import { analyzeWithGemini } from '../lib/gemini';
import { usePersistedState } from '../hooks/usePersistedState';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function BudgetPlanner() {
  const [budget, setBudget] = useState<number>(30000);
  const [currency, setCurrency] = useState<string>('ج.م');
  const [market, setMarket] = useState<string>('مصر');
  const [businessUrl, setBusinessUrl] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sharedFunnelContext] = usePersistedState<any>('pre_funnel_context', null);
  const [, setSharedBudgetContext] = usePersistedState<any>('budget_planner_context', null);

  const generatePlan = async () => {
    if (!budget || !market || !businessUrl) {
      setError('Please fill in all required fields (Budget, Market, Business URL).');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      // 1. Scrape the URL
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: businessUrl, 
          options: { screenshot: false, parseProducts: false } 
        })
      });

      let scrapedContent = '';
      if (scrapeRes.ok) {
        const data = await safeJson(scrapeRes);
        scrapedContent = data.content ? data.content.substring(0, 5000) : (data.description || 'No detailed content found, but URL accessed.');
      } else {
        console.warn('Failed to scrape URL, continuing with URL only.');
        scrapedContent = 'Could not fetch detailed data from the website.';
      }

      // 2. Generate Prompt
      const prompt = `بناءً على الميزانية الإعلانية (${budget} ${currency}) الموجهة لسوق: ${market} لموقع ${businessUrl}.

معلومات الموقع المتاحة (للفهم فقط):
${scrapedContent}

${sharedFunnelContext ? `
PRE-FUNNEL DIAGNOSIS SIGNALS (Use this as SECONDARY context, do not base your entire budget on it):
${JSON.stringify(sharedFunnelContext)}
Explain inside your plan how these funnel readiness signals influenced your budget confidence or testing splits.
` : ''}

قدم خطة تسويقية مبنية على بيانات حقيقية من السوق باستخدام أداة بحث جوجل (Google Search Grounding) المتاحة لك لجمع معلومات حقيقية وغير تكهنية. يجب أن تذكر مصادرك (روابط أو أسماء معروفة) لضمان الدقة وتجنب التكهنات.

الرجاء تقديم تقريرك بتنسيق Markdown نظيف ومنظم كالتالي:

### 1- النتائج المتوقعة ومؤشرات القياس (Benchmarks)
أرقام تقديرية للمبيعات والرسائل استناداً إلى متوسطات تكلفة الإعلانات الحقيقية (مثل CPC, CPA, CPM) في سوق ${market} لقطاع هذا الموقع. **(يجب ذكر المصادر التي اعتمدت عليها للأرقام)**.

### 2- توزيع الميزانية المقترح
جدول واضح يضم: القناة الإعلانية | النسبة من الميزانية | المبلغ (${currency}) | الهدف الأساسي.

### 3- تحليل المنافسين وتدقيق السوق (Competitor Audit)
قم بالبحث الفعلي عن المنافسين المحليين (في ${market}) والدوليين لنفس المنتج/الخدمة، وقدم:
- **أقوى المنافسين وروابطهم:** من هم وأين يمكن العثور عليهم.
- **أسعارهم ومقارتنها:** كيف تسعر منتجاتها/خدماتها مقارنة بباقي السوق.
- **استراتيجيات التسويق:** ما هي الزوايا البيعية (Angles) التي يركزون عليها؟
- **أفضل المنصات:** ما هي أكثر المنصات التي يتواجدون ويحققون مبيعات عليها؟
- **نشاطهم الإعلاني:** تقديرات لعدد حملاتهم، أو معلومات عن حجم الإنفاق المستنتجة من التقارير والمقالات أو أدوات رصد الإعلانات. **(يجب دعم هذا بمصدر موثوق ولا تعتمد على التكهنات فقط)**.

### 4- تحليل الإعلانات (Facebook & TikTok Ads Library)
بالاعتماد على بيانات مشابهة لما هو موجود في مكتبات إعلانات فيسبوك وتيك توك، قدم بحثاً عن أفضل الإعلانات والـ Reels للمنتجات المشابهة:
- **تحليل المحتوى الناجح:** ما هو شكل الـ Reels أو الصور التي تحقق أعلى تفاعل للمنافسين (كيف يبدأ الإعلان، الاستدعاء للعمل).
- **أمثلة لمحتوى منافس:** اذكر أسماء علامات تجارية حقيقية أو استشهد بحملات فعلية رأيتها في بحثك لتؤكد صحة تحليلك.

### 5- السياق المشترك (Shared Context for Intelligence Module)
في نهاية التقرير تماماً وبعد انتهاء نص الـ Markdown، أضف كود JSON بالشكل التالي **ويجب أن يكون بتنسيق JSON صحيح وقابل للتحليل**:
\`\`\`json
{
  "highCpaCampaigns": boolean,
  "scalingFailures": boolean,
  "inefficientChannels": ["channel1", "channel2"],
  "creativeFatigueCosts": number,
  "rationale": "Why you chose these values based on the data"
}
\`\`\`
الرد باللغة العربية، بأسلوب عملي مهني مباشر، وتجنب المقدمات.`;

      // 3. Call Gemini
      const generatedReport = await analyzeWithGemini(prompt, false);
      
      // Extract JSON context
      const jsonMatch = generatedReport.match(/\`\`\`json\s*([\s\S]*?)\s*\`\`\`/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsedContext = JSON.parse(jsonMatch[1]);
          setSharedBudgetContext({
            ...parsedContext,
            updatedAt: Date.now()
          });
        } catch (e) {
          console.warn("Failed to parse shared context JSON from BudgetPlanner output", e);
        }
      }
      
      // Remove JSON block from markdown report to render
      const cleanMarkdown = generatedReport.replace(/\`\`\`json\s*([\s\S]*?)\s*\`\`\`/g, '');
      setReport(cleanMarkdown);
    } catch (err: any) {
      console.error('Failed to generate budget plan:', err);
      setError(err.message || 'An error occurred while generating the plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Calculator className="w-8 h-8 text-brand-accent" />
            Strategic Budget Orchestration
          </h1>
          <p className="text-gray-400 mt-2">Generate AI-powered marketing blueprints based on your business URL.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Inputs */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl"></div>
            
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Business Profile
            </h2>
            
            <div className="space-y-5 relative z-10">
              {/* Budget */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-yellow-500" />
                  Monthly Budget
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={budget} 
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="glass-input w-full pl-4 pr-16 bg-white/5 border-white/10 text-white font-mono text-lg"
                    placeholder="e.g. 30000"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-transparent border-l border-white/10 h-full px-3 text-sm text-gray-300 outline-none focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="ج.م">EGP</option>
                      <option value="ر.س">SAR</option>
                      <option value="د.إ">AED</option>
                      <option value="$">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Market */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Target Market
                </label>
                <input 
                  type="text" 
                  value={market} 
                  onChange={(e) => setMarket(e.target.value)}
                  className="glass-input w-full bg-white/5 border-white/10 text-white"
                  placeholder="e.g. مصر, السعودية, الإمارات"
                />
              </div>

              {/* Business URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-purple-400" />
                  Website / Store URL
                </label>
                <input 
                  type="url" 
                  value={businessUrl} 
                  onChange={(e) => setBusinessUrl(e.target.value)}
                  className="glass-input w-full bg-white/5 border-white/10 text-white"
                  placeholder="https://example.com"
                />
              </div>

              {/* Shared Funnel Context (Strategic Impact) */}
              {sharedFunnelContext && (
                <div className="mt-6 p-5 rounded-2xl bg-[#0B0F19] border border-blue-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-xl pointer-events-none"></div>
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase flex items-center gap-2 mb-4 relative z-10">
                    <Target className="w-3.5 h-3.5" />
                    Pre-Funnel Strategic Impact
                  </h3>
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400">Funnel Readiness Impact</span>
                      <span className={cn("text-xs font-black", 
                        sharedFunnelContext.readinessScore >= 8 ? 'text-emerald-400' :
                        sharedFunnelContext.readinessScore >= 5 ? 'text-yellow-400' : 'text-red-400'
                      )}>{sharedFunnelContext.readinessScore}/10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400">Complexity Impact</span>
                      <span className="text-xs font-black text-indigo-400">{sharedFunnelContext.funnelComplexity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400">Risk Level</span>
                      <span className="text-xs font-black text-purple-400">{sharedFunnelContext.acquisitionDifficulty}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={generatePlan}
                disabled={loading || !businessUrl}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accent/90 hover:to-indigo-500 text-white px-6 py-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Market & Generating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Generate Orchestration Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Generated Report */}
        <div className="xl:col-span-2">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 min-h-[500px] h-full relative">
            {!report && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-60">
                <Target className="w-16 h-16 text-gray-500 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Awaiting Parameters</h3>
                <p className="text-gray-400 max-w-sm">
                  Enter your budget, select your target market, and provide your business URL to generate a hyper-customized AI orchestration plan.
                </p>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-brand-accent animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white animate-pulse">Scanning URL & Engineering Plan...</h3>
                <p className="text-gray-400 text-sm mt-2 max-w-xs">Our AI is fetching your website content and running real-time market simulations.</p>
              </div>
            )}

            {report && !loading && (
              <div className="prose prose-invert prose-brand max-w-none 
                prose-h2:text-white prose-h2:border-b-2 border-white/10 prose-h2:pb-2 
                prose-h3:text-gray-200 prose-h3:mt-6 prose-h3:mb-4
                prose-p:text-gray-300 prose-p:leading-relaxed 
                prose-strong:text-brand-accent 
                prose-ul:text-gray-300
                prose-li:marker:text-brand-accent
                prose-table:border-collapse prose-table:w-full prose-table:mt-4 prose-table:mb-6
                prose-th:bg-white/5 prose-th:px-4 prose-th:py-3 prose-th:text-right prose-th:font-semibold prose-th:text-gray-200 prose-th:border prose-th:border-white/10
                prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-white/10 prose-td:text-gray-300 text-right"
                dir="rtl"
              >
                <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
                
                <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200/80 text-sm">
                  <strong>تنويه هام:</strong> هذه الأرقام هي توقعات تقريبية (Estimates) مبنية على متوسطات السوق الحالية. قد تختلف النتائج الفعلية بالزيادة أو النقصان بناءً على جودة الإعلان، قوة العرض الترويجي (The Offer)، مهارة فريق المبيعات في إغلاق الصفقات، وتغيرات المنافسة في السوق.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
