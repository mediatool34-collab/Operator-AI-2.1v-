import express from 'express';
const app = express();
app.get('*all', (req, res) => res.send('ok'));
const server = app.listen(3001, async () => {
  const r = await fetch('http://localhost:3001/');
  console.log('Status 3001:', r.status);
  const text = await r.text();
  console.log('Body 3001:', text);
  server.close();
});
