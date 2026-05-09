export default async function handler(req, res) {
  const platform = req.query.platform || 'meta';
  const token = req.headers[`x-${platform}-token`];

  if (!token) {
    return res.json({ accounts: [] });
  }

  try {
    if (platform === 'meta') {
      const response = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${token}`);
      const data = await response.json();
      
      if (data.error) {
        return res.status(400).json({ error: data.error.message });
      }
      
      return res.json({ accounts: data.data || [] });
    }
    
    // Add other platforms if needed
    return res.status(400).json({ error: 'Unsupported platform in serverless mode' });
  } catch (error) {
    console.error('Error in adaccounts function:', error);
    return res.status(500).json({ error: error.message });
  }
}
