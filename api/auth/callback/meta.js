export default async function handler(req, res) {
  const { code, state: uid, error } = req.query;
  const RAILWAY_URL = 'https://anty-ads-operator-production.up.railway.app';
  const META_CLIENT_ID = process.env.META_CLIENT_ID || process.env.META_APP_ID || '1984316142437697';
  const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET || '82bc9a70151933f62ee2d27485d9ee5a';
  const APP_URL = process.env.APP_URL || 'https://anty-ads-operator.vercel.app';
  const REDIRECT_URI = `${APP_URL}/api/auth/callback/meta`;

  const closeWithError = (msg) => {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { font-family: system-ui; background: #0B0F19; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .error-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 2rem; border-radius: 1rem; max-width: 500px; text-align: center; }
          h1 { color: #f87171; margin-top: 0; }
          p { color: #9ca3af; line-height: 1.5; }
          .code { background: #1f2937; padding: 1rem; border-radius: 0.5rem; text-align: left; font-family: monospace; color: #e5e7eb; word-break: break-all; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>Authentication Failed</h1>
          <p>We encountered an error while trying to connect your Meta account. Please take a screenshot of this page and share it.</p>
          <div class="code">${msg}</div>
        </div>
        <script>
          if(window.opener) {
            window.opener.postMessage({type:'OAUTH_AUTH_ERROR',error:'${msg.replace(/'/g, "\\'")}'},'*');
          }
        </script>
      </body>
      </html>
    `);
  };

  const closeWithSuccess = (token) => {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_AUTH_SUCCESS',platform:'meta',token:'${token}'},'*');setTimeout(()=>window.close(),500);}else{window.location.href='/settings?connected=meta';}<\/script></body></html>`);
  };

  if (error) return closeWithError(`Meta returned error: ${error}`);
  if (!code) return closeWithError('No authorization code received from Meta. Ensure the popup was not blocked.');

  try {
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_CLIENT_ID}&client_secret=${META_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Meta Callback] Token error:', tokenData.error);
      return closeWithError(`Token exchange failed: ${JSON.stringify(tokenData.error)}`);
    }

    const accessToken = tokenData.access_token;

    // Send to Railway but don't await so we close popup fast
    fetch(`${RAILWAY_URL}/api/auth/store-meta-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, accessToken })
    }).catch(err => console.error('[Meta Callback] Backend store failed:', err.message));

    return closeWithSuccess(accessToken);
  } catch (err) {
    console.error('[Meta Callback] Error:', err);
    return closeWithError(`Internal server error: ${err.message}\n${err.stack}`);
  }
}
