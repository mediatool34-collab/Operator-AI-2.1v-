import puppeteer from 'puppeteer';
import { chromium } from 'playwright';
import fs from 'fs';

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  html: string;
  screenshot?: string; // Base64
  metadata: Record<string, any>;
  forensicAudit?: any;
  forensicSummary?: string;
  engine: 'puppeteer' | 'playwright' | 'http-fetch';
}

export interface ScrapeOptions {
  engine?: 'puppeteer' | 'playwright' | 'http-fetch';
  screenshot?: boolean;
  waitForSelector?: string;
  timeout?: number;
  retries?: number;
}

function findSystemChrome(): string | undefined {
  const candidatePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '));
}

function getAttr(tag: string, attrName: string): string {
  const regex = new RegExp(`${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(regex);
  return decodeHtmlEntities(match?.[1] || match?.[2] || match?.[3] || '');
}

function buildForensicSummary(title: string, forensicAudit: any): string {
  return `
### 🔍 تقرير الفحص الجنائي المعمق للموقع (Deep Forensic UI/UX & Architecture Audit)
- **عنوان الصفحة (Title Tag):** ${title}
- **الوصف التعريفي (Meta Description):** ${forensicAudit.meta?.metaDesc || 'غير متوفر'}
- **العناوين الرئيسية (H1 Headings):** ${forensicAudit.headings?.h1s?.join(' | ') || 'لا يوجد H1 صريح'}
- **العناوين الفرعية (H2/H3 Structure):** ${forensicAudit.headings?.h2s?.slice(0, 6)?.join(' • ') || 'غير متوفر'}
- **أزرار التحويل الأساسية (Key CTAs):** ${forensicAudit.ctas?.map((c: any) => `[${c.text}] (${c.className || 'btn'} -> ${c.href || '#'})`)?.join(' | ') || 'لا توجد أزرار CTA واضحة'}
- **قنوات التواصل السريع المرصودة:** واتساب: ${forensicAudit.channels?.whatsappLinks?.length ? forensicAudit.channels.whatsappLinks[0] : 'غير متوفر'} | هاتف: ${forensicAudit.channels?.phoneLinks?.join(', ') || 'غير متوفر'} | بريد: ${forensicAudit.channels?.emails?.join(', ') || 'غير متوفر'}
- **الخدمات والأقسام المرصودة في الهيكل:** ${forensicAudit.services?.slice(0, 8)?.join(' • ') || 'غير محدد'}
- **شارات الثقة والتراخيص الرسمية المرصودة:** ${forensicAudit.trustBadges?.join(' / ') || 'لم يتم رصد شريط تراخيص بارز في أعلى الصفحة'}
- **البيانات المنظمة (Schema Markup & AI Readiness):** ${forensicAudit.technical?.schemaTypes?.length ? forensicAudit.technical.schemaTypes.join(', ') : 'غير موجودة (يضعف الظهور في Google و ChatGPT و Gemini)'}
- **فحص الصور والـ SEO التقني:** إجمالي الصور: ${forensicAudit.technical?.imagesTotal ?? 0} | صور بدون Alt Tag: ${forensicAudit.technical?.imagesWithoutAlt ?? 0}
- **عناصر القوائم والتنقل (Navigation Links):** ${forensicAudit.navigation?.map((n: any) => n.text)?.join(' • ') || 'غير متوفر'}
`;
}

export class ScraperService {
  private static instance: ScraperService;

  private constructor() {}

  public static getInstance(): ScraperService {
    if (!ScraperService.instance) {
      ScraperService.instance = new ScraperService();
    }
    return ScraperService.instance;
  }

  /**
   * Scrapes a website using available browser engine with automatic resilient HTTP DOM fallback.
   */
  public async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const {
      engine = 'puppeteer',
      retries = 1,
    } = options;

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    if (engine === 'http-fetch') {
      return await this.scrapeWithHttpFetch(targetUrl, options);
    }

    // Check if headless browser binary actually exists before hitting Launch errors
    const systemChrome = findSystemChrome();
    let currentEngine: 'puppeteer' | 'playwright' = engine === 'playwright' ? 'playwright' : 'puppeteer';

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (currentEngine === 'puppeteer') {
          return await this.scrapeWithPuppeteer(targetUrl, options, systemChrome);
        } else {
          return await this.scrapeWithPlaywright(targetUrl, options, systemChrome);
        }
      } catch (error: any) {
        const msg = (error?.message || '').toLowerCase();
        const isMissingBinary =
          msg.includes('could not find chrome') ||
          msg.includes('executable doesn\'t exist') ||
          msg.includes('failed to launch') ||
          msg.includes('no such file');

        if (isMissingBinary) {
          console.warn(`[Scraper] Headless browser unavailable (${currentEngine}), switching seamlessly to HTTP Forensic DOM Fetch.`);
          return await this.scrapeWithHttpFetch(targetUrl, options);
        }

        console.warn(`[Scraper] ${currentEngine} attempt ${attempt + 1} notice: ${error.message}`);
        if (attempt < retries) {
          currentEngine = currentEngine === 'puppeteer' ? 'playwright' : 'puppeteer';
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Final guaranteed fallback to HTTP Forensic DOM Fetch
    try {
      return await this.scrapeWithHttpFetch(targetUrl, options);
    } catch (fetchErr: any) {
      throw new Error(`Scraping failed for ${targetUrl}: ${fetchErr?.message || 'Unable to reach website'}`);
    }
  }

  private async scrapeWithHttpFetch(url: string, options: ScrapeOptions): Promise<ScrapeResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : url;

      // Meta tags
      const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
      let metaDesc = '';
      let metaKeywords = '';
      let ogTitle = '';
      let ogDesc = '';
      let hasViewport = false;

      for (const tag of metaTags) {
        const name = getAttr(tag, 'name').toLowerCase();
        const prop = getAttr(tag, 'property').toLowerCase();
        const contentAttr = getAttr(tag, 'content');
        if (name === 'description') metaDesc = contentAttr;
        else if (name === 'keywords') metaKeywords = contentAttr;
        else if (name === 'viewport') hasViewport = true;
        else if (prop === 'og:title') ogTitle = contentAttr;
        else if (prop === 'og:description') ogDesc = contentAttr;
      }

      // Headings
      const extractTags = (tag: string, limit = 15) => {
        const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
        const out: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null && out.length < limit) {
          const text = stripTags(m[1]);
          if (text) out.push(text);
        }
        return out;
      };

      const h1s = extractTags('h1', 10);
      const h2s = extractTags('h2', 15);
      const h3s = extractTags('h3', 15);

      // Links & CTAs & Channels
      const linkRegex = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      const navLinks: Array<{ text: string; href: string }> = [];
      const ctas: Array<{ text: string; href: string; className: string }> = [];
      const whatsappLinks: string[] = [];
      const phoneLinks: string[] = [];
      const emails: string[] = [];
      const services: string[] = [];

      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkRegex.exec(html)) !== null) {
        const tagName = linkMatch[1].toLowerCase();
        const attrs = linkMatch[2];
        const text = stripTags(linkMatch[3]);
        const href = getAttr(`<a ${attrs}>`, 'href');
        const className = getAttr(`<a ${attrs}>`, 'class');
        const role = getAttr(`<a ${attrs}>`, 'role');

        if (href) {
          const hrefLower = href.toLowerCase();
          if ((hrefLower.includes('wa.me') || hrefLower.includes('whatsapp') || hrefLower.includes('api.whatsapp.com')) && !whatsappLinks.includes(href)) {
            whatsappLinks.push(href);
          }
          if (hrefLower.startsWith('tel:')) {
            const p = href.replace(/^tel:/i, '').trim();
            if (p && !phoneLinks.includes(p)) phoneLinks.push(p);
          }
          if (hrefLower.startsWith('mailto:')) {
            const em = href.replace(/^mailto:/i, '').split('?')[0].trim();
            if (em && !emails.includes(em)) emails.push(em);
          }
          if (hrefLower.includes('/services/') && text && text.length > 3 && text.length < 150 && !services.includes(text)) {
            services.push(text);
          }
        }

        if (text && text.length < 60 && tagName === 'a' && navLinks.length < 15) {
          navLinks.push({ text, href });
        }

        const clsLower = className.toLowerCase();
        if (
          text &&
          text.length < 100 &&
          ctas.length < 15 &&
          (clsLower.includes('btn') ||
            clsLower.includes('cta') ||
            role === 'button' ||
            tagName === 'button' ||
            /تواصل|اطلب|سجل|فحص|ابدأ|احجز|اشترك|شراء|استشار|contact|order|register|free|start/i.test(text))
        ) {
          ctas.push({ text, href, className });
        }
      }

      // Extract plain emails in text if mailto wasn't used
      if (emails.length === 0) {
        const plainEmailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (const em of plainEmailMatches) {
          if (!em.includes('example.') && !em.endsWith('.png') && !em.endsWith('.jpg') && !emails.includes(em)) {
            emails.push(em);
          }
        }
      }

      // Images
      const imgTags = html.match(/<img\b[^>]*>/gi) || [];
      const imagesTotal = imgTags.length;
      const imagesWithoutAlt = imgTags.filter(tag => !getAttr(tag, 'alt')).length;

      // Forms
      const formMatches = html.match(/<form\b[\s\S]*?<\/form>/gi) || [];
      const forms = formMatches.map(formHtml => {
        const inputTags = formHtml.match(/<(input|select|textarea)\b[^>]*>/gi) || [];
        const inputs = inputTags.map(i => getAttr(i, 'placeholder') || getAttr(i, 'name') || 'field').filter(Boolean);
        const submitMatch = formHtml.match(/<button\b[^>]*type\s*=\s*["']?submit["']?[^>]*>([\s\S]*?)<\/button>/i);
        const submitBtn = submitMatch ? stripTags(submitMatch[1]) : undefined;
        return { inputs, submitBtn };
      });

      // Schema.org JSON-LD detection
      const schemaMatches = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      const schemaTypes: string[] = [];
      for (const s of schemaMatches) {
        const inner = s.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        const typeMatches = inner.match(/"@type"\s*:\s*"([^"]+)"/g) || [];
        for (const tm of typeMatches) {
          const val = tm.split(':')[1]?.replace(/["\s]/g, '');
          if (val && !schemaTypes.includes(val)) schemaTypes.push(val);
        }
      }

      // Clean body text
      const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
      const rawBody = bodyMatch ? bodyMatch[1] : html;
      const cleanBody = rawBody
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');
      const content = stripTags(cleanBody).slice(0, 35000);

      // Trust badges & accreditations
      const trustMatches = content.match(/[^.!؟\n]{0,80}(?:معتمد|ترخيص|هيئة|saip|سجل تجاري|معروف|ضمان|iso)[^.!؟\n]{0,80}/gi) || [];
      const trustBadges = Array.from(new Set(trustMatches.map(t => t.trim()))).slice(0, 5);

      const forensicAudit = {
        meta: { metaDesc, metaKeywords, ogTitle, ogDesc },
        headings: { h1s, h2s: h2s.slice(0, 12), h3s: h3s.slice(0, 12) },
        navigation: navLinks.slice(0, 12),
        ctas,
        channels: { whatsappLinks, phoneLinks, emails: emails.slice(0, 5) },
        forms,
        technical: { imagesTotal, imagesWithoutAlt, hasViewport, schemaTypes },
        trustBadges,
        services: services.slice(0, 12),
      };

      const forensicSummary = buildForensicSummary(title, forensicAudit);

      return {
        url,
        title,
        content,
        html,
        metadata: { engineUsed: 'http-fetch' },
        forensicAudit,
        forensicSummary,
        engine: 'http-fetch',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async scrapeWithPuppeteer(url: string, options: ScrapeOptions, executablePath?: string): Promise<ScrapeResult> {
    const launchOptions: any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(options.timeout || 25000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2' });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 8000 });
      }

      const title = await page.title();
      const content = await page.evaluate(() => document.body.innerText);
      const html = await page.content();
      
      const forensicAudit = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
        const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        
        const h1s = Array.from(document.querySelectorAll('h1')).map(e => e.innerText.trim()).filter(Boolean);
        const h2s = Array.from(document.querySelectorAll('h2')).map(e => e.innerText.trim()).filter(Boolean);
        const h3s = Array.from(document.querySelectorAll('h3')).map(e => e.innerText.trim()).filter(Boolean);

        const navLinks = Array.from(document.querySelectorAll('nav a, header a, .navbar a')).map(a => ({
          text: (a as HTMLElement).innerText.trim(),
          href: (a as any).href || ''
        })).filter(a => a.text && a.text.length < 60);

        const ctas = Array.from(document.querySelectorAll('a, button'))
          .filter(e => {
            const txt = (e as HTMLElement).innerText.trim();
            const cls = (e.className || '').toLowerCase();
            return txt && (cls.includes('btn') || cls.includes('cta') || e.getAttribute('role') === 'button' || /تواصل|اطلب|سجل|فحص|ابدأ|احجز|اشترك|شراء|contact|order|register|free/i.test(txt));
          })
          .map(e => ({
            text: (e as HTMLElement).innerText.trim(),
            href: (e as any).href || '',
            className: e.className || ''
          }))
          .slice(0, 15);

        const whatsappLinks = Array.from(document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"], a[href*="api.whatsapp.com"]'))
          .map(a => (a as any).href);

        const phoneLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'))
          .map(a => (a as any).href.replace('tel:', '').trim());

        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
          .map(a => (a as any).href.replace('mailto:', '').split('?')[0].trim());

        const forms = Array.from(document.querySelectorAll('form')).map(f => {
          const inputs = Array.from(f.querySelectorAll('input, select, textarea')).map(i => (i as HTMLInputElement).placeholder || (i as HTMLInputElement).name || i.tagName);
          const submitBtn = f.querySelector('button[type="submit"], input[type="submit"]')?.textContent?.trim();
          return { inputs, submitBtn };
        });

        const images = Array.from(document.querySelectorAll('img'));
        const imagesTotal = images.length;
        const imagesWithoutAlt = images.filter(i => !i.getAttribute('alt')?.trim()).length;

        const schemaScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const schemaTypes: string[] = [];
        schemaScripts.forEach(s => {
          try {
            const parsed = JSON.parse(s.textContent || '{}');
            if (parsed['@type']) schemaTypes.push(String(parsed['@type']));
          } catch {
            // ignore
          }
        });

        const trustBadges = Array.from(document.querySelectorAll('.badge, [class*="badge"], [class*="trust"], [class*="cert"], [class*="license"], .gov-disclaimer, footer'))
          .map(e => e.textContent?.trim() || '')
          .filter(t => /معتمد|ترخيص|هيئة|saip|سجل تجاري|معروف|ضمان|iso/i.test(t))
          .map(t => t.slice(0, 150))
          .slice(0, 5);

        const services = Array.from(document.querySelectorAll('a[href*="/services/"], [class*="service"], .card, .feature'))
          .map(e => (e as HTMLElement).innerText.trim())
          .filter(t => t.length > 5 && t.length < 200)
          .slice(0, 12);

        return {
          meta: { metaDesc, metaKeywords, ogTitle, ogDesc },
          headings: { h1s, h2s: h2s.slice(0, 12), h3s: h3s.slice(0, 12) },
          navigation: navLinks.slice(0, 12),
          ctas,
          channels: { whatsappLinks, phoneLinks, emails },
          forms,
          technical: { imagesTotal, imagesWithoutAlt, hasViewport: !!document.querySelector('meta[name="viewport"]'), schemaTypes },
          trustBadges,
          services
        };
      });

      const forensicSummary = buildForensicSummary(title, forensicAudit);

      let screenshot: string | undefined;
      if (options.screenshot) {
        screenshot = await page.screenshot({ encoding: 'base64' }) as string;
      }

      return {
        url,
        title,
        content,
        html,
        screenshot,
        metadata: {},
        forensicAudit,
        forensicSummary,
        engine: 'puppeteer',
      };
    } finally {
      await browser.close();
    }
  }

  private async scrapeWithPlaywright(url: string, options: ScrapeOptions, executablePath?: string): Promise<ScrapeResult> {
    const launchOptions: any = {
      headless: true,
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    const browser = await chromium.launch(launchOptions);

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: options.timeout || 25000 });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 8000 });
      }

      const title = await page.title();
      const content = await page.evaluate(() => document.body.innerText);
      const html = await page.content();
      
      let screenshot: string | undefined;
      if (options.screenshot) {
        const buffer = await page.screenshot();
        screenshot = buffer.toString('base64');
      }

      return {
        url,
        title,
        content,
        html,
        screenshot,
        metadata: {},
        engine: 'playwright',
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Specialized method for social pages (e.g. Meta Ad Library)
   */
  public async scrapeSocialPage(url: string, platform: 'meta' | 'tiktok' | 'google'): Promise<any> {
    return this.scrape(url, {
      waitForSelector: platform === 'meta' ? 'div[role="main"]' : undefined,
      screenshot: false,
    });
  }
}
