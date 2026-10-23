import 'dotenv/config';
import axios from 'axios';
import { parseJsonObject } from './src/utils/groqClient.js';

const GEMINI_API_URL_BASE = process.env.GEMINI_API_URL_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const apiKey = process.env.GEMINI_API_KEY;

const testCall = async (modelName) => {
  const endpoint = `${GEMINI_API_URL_BASE}/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: JSON.stringify({ note: 'Photosynthesis converts light to energy.' }) }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 700,
      responseMimeType: 'application/json',
    },
    systemInstruction: {
      parts: [{ text: 'Return valid JSON: { "status": "ok", "keyConcepts": ["light", "energy", "chlorophyll"] }' }],
    },
  };

  const response = await axios.post(endpoint, payload, { headers: { 'Content-Type': 'application/json' } });
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseJsonObject(text);
};

const res = await testCall('gemini-2.5-flash');
console.log('Result from gemini-2.5-flash:');
console.log(JSON.stringify(res, null, 2));
process.exit(0);
