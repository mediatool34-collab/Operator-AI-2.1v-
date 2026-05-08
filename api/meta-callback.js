export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error_description || error}' }, '*');
            window.close();
          }
        </script></body></html>
      `);
    }

    if (!code || !state) {
      return res.send(`<html><body><h1>Error: Missing code or state</h1></body></html>`);
    }

    const clientId = process.env.META_CLIENT_ID || process.env.META_APP_ID || '1984316142437697';
    const clientSecret = process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET || '82bc9a70151933f62ee2d27485d9ee5a';
    const appUrl = (process.env.APP_URL || 'https://anty-ads-operator.vercel.app').replace(/\/$/, '');
    const redirectUri = `${appUrl}/api/meta-callback`;

    const tokenResponse = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      return res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'meta', token: '${tokenData.access_token}' }, '*');
            window.close();
          }
        </script></body></html>
      `);
    } else {
      return res.send(`
        <html><body style="background:red;color:white;font-family:sans-serif;padding:2rem;">
          <h1>Meta Authentication Failed</h1>
          <pre>${JSON.stringify(tokenData, null, 2)}</pre>
          <p>Please take a screenshot of this error.</p>
        </body></html>
      `);
    }
  } catch (err) {
    return res.send(`
      <html><body style="background:darkred;color:white;font-family:sans-serif;padding:2rem;">
        <h1>Server Error in Vercel Function</h1>
        <pre>${err.message}</pre>
        <pre>${err.stack}</pre>
        <p>Please take a screenshot of this error.</p>
      </body></html>
    `);
  }
}
