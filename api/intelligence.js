import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req, res) {
  const { action, url, prompt, userId } = req.body;

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (action === 'audit' || action === 'analysis') {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const fullPrompt = `Analyze this marketing request: ${prompt || 'Perform a full audit of ' + url}`;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return res.json({ result: response.text() });
    }

    // Default to a simple AI response if action is unknown
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt || 'Hello');
    const response = await result.response;
    return res.json({ result: response.text() });

  } catch (error) {
    console.error('AI Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
