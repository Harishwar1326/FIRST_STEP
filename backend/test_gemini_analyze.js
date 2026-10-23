import 'dotenv/config';
import { callGeminiJson } from './src/utils/geminiClient.js';

const analyzeSystem = [
  "You analyze student notes for FirstStep Smart Notes Studio.",
  "Return ONLY valid JSON with the exact shape below, no markdown fences:",
  "{",
  '  "keyConcepts": [{ "name": "string", "confidence": 80, "importance": 90 }],',
  '  "strongConcepts": ["string"],',
  '  "weakConcepts": [{ "name": "string", "whyWeak": "string" }],',
  '  "missingConcepts": [{ "name": "string", "whyMissing": "string" }],',
  '  "relationships": [{ "from": "string", "to": "string", "type": "string", "strength": 75 }]',
  "}",
  "confidence/importance/strength are integers 0..100.",
  'type values should be short labels like "prerequisite", "causes", "example of", "uses", "opposed to", "part of".',
].join("\n");

console.log('Calling callGeminiJson with maxTokens: 4096...');
const res = await callGeminiJson({
  systemPrompt: analyzeSystem,
  userPayload: {
    title: 'Operating Systems',
    subject: 'Computer Science',
    content: 'An operating system manages hardware, memory, CPU scheduling, and file systems. Key challenges include deadlocks and race conditions.'
  },
  maxTokens: 4096,
  temperature: 0.2
});

console.log('Gemini Result:');
console.log(JSON.stringify(res, null, 2));
process.exit(0);
