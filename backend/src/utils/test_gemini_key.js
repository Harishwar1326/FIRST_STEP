import 'dotenv/config';
import axios from 'axios';

const key = process.env.GEMINI_API_KEY;

try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: 'Respond with valid JSON: {"status": "ok", "message": "Gemini works!"}' }] }],
    generationConfig: { responseMimeType: 'application/json' }
  });
  console.log('SUCCESS! Gemini response:');
  console.log(JSON.stringify(res.data.candidates[0].content.parts[0].text, null, 2));
} catch (e) {
  console.log('ERROR:', e.response?.status, e.response?.statusText);
  console.log(JSON.stringify(e.response?.data || e.message, null, 2));
}
process.exit(0);
