export default async function handler(req, res) {
    const { code, state: uid, error } = req.query;
    const RAILWAY_URL = 'https://anty-ads-operator-production.up.railway.app';
    const META_CLIENT_ID = process.env.META_CLIENT_ID || process.env.META_APP_ID || '1984316142437697';
    const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET || '82bc9a70151933f62ee2d27485d9ee5a';
    const APP_URL = process.env.APP_URL || 'https://anty-ads-operator.vercel.app';
    const REDIRECT_URI = `${APP_URL}/api/auth/callback/meta`;

  const closeWithError = (msg) => {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`<!DOCTYPE html><html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_AUTH_ERROR',error:'${msg}'},'*');window.close();}else{window.location.href='/settings?error=auth_failed';}<\/script></body></html>`);
  };

  const closeWithSuccess = (token) => {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`<!DOCTYPE html><html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_AUTH_SUCCESS',platform:'meta',token:'${token}'},'*');setTimeout(()=>window.close(),500);}else{window.location.href='/settings?connected=meta';}<\/script></body></html>`);
  };

  if (error) return closeWithError(error);
    if (!code) return closeWithError('No authorization code received');

  try {
        const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_CLIENT_ID}&client_secret=${META_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`;
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

      if (tokenData.error) {
              console.error('[Meta Callback] Token error:', tokenData.error);
              return closeWithError(tokenData.error.message || 'Token exchange failed');
      }

      const accessToken = tokenData.access_token;

      fetch(`${RAILWAY_URL}/api/auth/store-meta-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid, accessToken })
      }).catch(err => console.error('[Meta Callback] Backend store failed:', err.message));

      return closeWithSuccess(accessToken);
  } catch (err) {
        console.error('[Meta Callback] Error:', err);
        return closeWithError('Internal server error');
  }
}
