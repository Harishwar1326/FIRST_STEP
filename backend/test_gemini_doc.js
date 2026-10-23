import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.GEMINI_API_KEY;
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

// Test text-based note processing
const payload = {
  contents: [
    {
      role: 'user',
      parts: [
        {
          text: `You are an educational document analyzer for FirstStep Smart Notes Studio.
Analyze the following document content and return valid JSON with:
{
  "content": "Extracted cleaned full text",
  "summary": "Comprehensive 2-4 sentence summary of the material",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "concepts": ["Concept1", "Concept2", "Concept3", "Concept4", "Concept5"],
  "relationships": [{"source": "Concept1", "target": "Concept2", "type": "relates_to"}],
  "difficulty": 5,
  "estimatedStudyTime": 15
}

DOCUMENT CONTENT:
Database Normalization is the process of structuring a relational database in accordance with a series of normal forms in order to reduce data redundancy and improve data integrity. 1NF requires atomic values. 2NF removes partial dependencies on composite keys. 3NF removes transitive dependencies where non-prime attributes depend on other non-prime attributes. Boyce-Codd Normal Form (BCNF) is a stricter version of 3NF where every determinant must be a candidate key.`
        }
      ]
    }
  ],
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 4096,
    temperature: 0.2
  }
};

const res = await axios.post(endpoint, payload);
console.log('Result:', res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
process.exit(0);
