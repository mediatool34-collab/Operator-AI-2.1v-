import express from 'express';
const app = express();
try {
  app.get('*all', (req, res) => res.send('ok'));
  console.log("SUCCESS");
} catch(e) {
  console.log("ERROR:", e.message);
}
