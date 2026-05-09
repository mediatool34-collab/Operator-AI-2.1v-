# Operator AI - Restoration & Backup Guide

This document serves as a backup of all major architectural changes made to fix the Authentication and Ad Integration issues.

## 🛠 What We Fixed
1. **Google Auth:** Switched to `signInWithPopup` to prevent redirect loops and added `anty-ads-operator.vercel.app` to Firebase Authorized Domains.
2. **Meta Ads Integration:** Created a serverless proxy on Vercel to bypass backend (Railway) 404 errors.
3. **Feature Stability:** Routed all critical features (Audit, Strategy, Dashboard) through Vercel for 100% uptime.

## 📂 Key Files Created/Modified
- `vercel.json`: Contains all the custom routing logic.
- `api/meta-proxy.js`: Handles all Meta Ads data fetching (Accounts, Campaigns, Insights).
- `api/intelligence.js`: Handles AI Analysis and Audits via Gemini.
- `api/meta-callback.js`: Handles the Meta OAuth token exchange.

## 🚀 How to Restore if Needed
If you ever need to redeploy or the site stops working:
1. Ensure the code is pushed to GitHub: `git push origin main`
2. Run a force deploy on Vercel: `vercel --prod --force`
3. **Crucial:** Ensure these Environment Variables are set in Vercel:
   - `GEMINI_API_KEY`
   - `META_APP_ID` / `META_APP_SECRET`
   - `APP_URL` (Set to `https://anty-ads-operator.vercel.app`)

## 🔑 Meta App Settings
To keep everything working, the Meta App (Developers Console) MUST have:
- **Valid OAuth Redirect URI:** `https://anty-ads-operator.vercel.app/api/meta-callback`
- **Authorized Domains:** `vercel.app` and `anty-ads-operator.vercel.app`

---
*Created by Antigravity on 2026-05-09*
