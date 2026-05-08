import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const newMetaAuthCode = `
        if (tokenData.access_token) {
          // Fetch ad accounts and save to postgres
          try {
            const { workspaces, adAccounts } = await import('./src/db/schema.js');
            const { eq } = await import('drizzle-orm');
            const userWs = await db.select().from(workspaces).where(eq(workspaces.ownerId, uid)).limit(1);
            if (userWs.length > 0) {
              const wsId = userWs[0].id;
              const accountsRes = await fetch(\`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=\${tokenData.access_token}\`);
              const accountsData = await accountsRes.json();
              if (accountsData.data && accountsData.data.length > 0) {
                // Save them
                for (const acc of accountsData.data) {
                  await db.insert(adAccounts).values({
                    id: \`\${platform}_\${acc.id}_\${Date.now()}\`,
                    workspaceId: wsId,
                    adAccountId: acc.id,
                    platform: 'meta',
                    name: acc.name || \`Ad Account \${acc.account_id}\`,
                    accessToken: tokenData.access_token // in reality should encrypt
                  });
                }
              }
            }
          } catch (err: any) {
            console.error('Failed to save to postgres', err);
          }

          // Send success message to parent window and close popup`;

content = content.replace(
  "        if (tokenData.access_token) {\n          // Send success message to parent window and close popup",
  newMetaAuthCode
);

fs.writeFileSync('server.ts', content);
