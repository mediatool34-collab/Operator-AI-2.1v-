export default async function handler(req, res) {
  const { platform, accountId, campaignId, adsetId, fields, date_preset } = req.query;
  const token = req.headers[`x-meta-token`];

  if (!token) {
    return res.json({ accounts: [], data: [], campaigns: [], adsets: [], ads: [] });
  }

  try {
    let url = '';
    const baseUrl = 'https://graph.facebook.com/v21.0';

    if (req.url.includes('/api/adaccounts')) {
      url = `${baseUrl}/me/adaccounts?fields=id,name,account_id&access_token=${token}`;
    } else if (req.url.includes('/api/campaigns')) {
      url = `${baseUrl}/${accountId}/campaigns?fields=${fields || 'id,name,status,objective'}&access_token=${token}`;
    } else if (req.url.includes('/api/adsets')) {
      url = `${baseUrl}/${campaignId || accountId}/adsets?fields=${fields || 'id,name,status,billing_event'}&access_token=${token}`;
    } else if (req.url.includes('/api/ads')) {
      url = `${baseUrl}/${adsetId || accountId}/ads?fields=${fields || 'id,name,status,creative{id,name,image_url,thumbnail_url}'}&access_token=${token}`;
    } else if (req.url.includes('/api/insights')) {
      url = `${baseUrl}/${accountId}/insights?fields=${fields || 'spend,impressions,clicks,actions,cpc,cpm,cpp,ctr,reach'}&date_preset=${date_preset || 'last_30d'}&access_token=${token}`;
    }

    if (!url) return res.status(400).json({ error: 'Invalid request path' });

    const response = await fetch(url);
    const result = await response.json();

    if (result.error) return res.status(400).json({ error: result.error.message });

    // Ensure we return the expected structure
    if (req.url.includes('/api/adaccounts')) return res.json({ accounts: result.data || [] });
    if (req.url.includes('/api/campaigns')) return res.json({ campaigns: result.data || [] });
    if (req.url.includes('/api/adsets')) return res.json({ adsets: result.data || [] });
    if (req.url.includes('/api/ads')) return res.json({ ads: result.data || [] });
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
