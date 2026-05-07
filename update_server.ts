import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "if (!accountId) return res.json({ campaigns: [] });",
  "if (req.query.fromDb === 'true') { const { campaigns: campaignsTable } = await import('./src/db/schema.js'); const dbCamps = await db.select().from(campaignsTable); return res.json({ campaigns: dbCamps }); } if (!accountId) return res.json({ campaigns: [] });"
);
fs.writeFileSync('server.ts', content);
