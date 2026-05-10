import express from 'express';
const app = express();
app.get('*all', (req, res) => res.send('ok'));
const server = app.listen(3000, async () => {
  const r = await fetch('http://localhost:3000/');
  console.log('Status:', r.status);
  const text = await r.text();
  console.log('Body:', text);
  server.close();
});
