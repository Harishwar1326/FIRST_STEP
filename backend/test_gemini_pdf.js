import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.GEMINI_API_KEY;
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

// Minimal valid PDF in base64:
// %PDF-1.4 ... "Hello World"
const minimalPdfBase64 = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 100 Td (Hello FirstStep Smart Notes) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n310\n%%EOF'
).toString('base64');

const payload = {
  contents: [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: minimalPdfBase64
          }
        },
        {
          text: 'Extract the text and return JSON: {"extractedText": string}'
        }
      ]
    }
  ],
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 2000
  }
};

try {
  const res = await axios.post(endpoint, payload);
  console.log('PDF inlineData SUCCESS:', res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
} catch (e) {
  console.log('PDF inlineData ERROR:', e.response?.status, e.response?.data || e.message);
}
process.exit(0);
