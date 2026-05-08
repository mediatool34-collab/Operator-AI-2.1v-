export default function handler(req, res) {
      const { uid, json } = req.query;
      const appId = process.env.META_CLIENT_ID || '1984316142437697';
      const appUrl = process.env.APP_URL || 'https://anty-ads-operator.vercel.app';
      const redirectUri = `${appUrl}/api/auth/callback/meta`;

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${uid || ''}&scope=ads_management,ads_read,business_management,pages_read_engagement,pages_show_list`;

  if (json === 'true') {
          return res.status(200).json({ url: authUrl });
  }

  res.redirect(authUrl);
}
