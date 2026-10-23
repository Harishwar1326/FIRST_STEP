import 'dotenv/config';
import axios from 'axios';
import { parseJsonObject } from './src/utils/groqClient.js';

const apiKey = process.env.GEMINI_API_KEY;
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

const prompt = `You are an expert educational AI analyzing study notes for FirstStep Smart Notes Studio.
Analyze the provided material and return ONLY valid JSON matching this exact structure:
{
  "content": "Cleaned readable full text extracted from the material",
  "summary": "3-5 sentence crystal-clear summary explaining the core intuition",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "concepts": ["Concept1", "Concept2", "Concept3", "Concept4", "Concept5"],
  "relationships": [{"source": "Concept1", "target": "Concept2", "type": "prerequisite|causes|part_of|uses"}],
  "difficulty": 6,
  "estimatedStudyTime": 20,
  "revisionNotes": "Structured bulleted summary for fast revision",
  "chapterNotes": "Deep-dive structured notes with clear section headers",
  "keyConcepts": ["Concept1", "Concept2", "Concept3"],
  "glossary": [{"term": "Concept1", "definition": "Clear concise definition"}],
  "flashcards": [{"front": "Question / Prompt", "back": "Answer / Explanation", "difficulty": "medium", "concept": "Concept1"}],
  "mindMap": {
    "nodes": [{"id": "1", "label": "Main Topic", "type": "root"}, {"id": "2", "label": "Subtopic", "type": "concept"}],
    "edges": [{"id": "e1-2", "source": "1", "target": "2", "label": "includes"}]
  },
  "questions": [{"question": "Conceptual question", "answer": "Detailed solution", "bloomLevel": "understand", "difficulty": "medium"}]
}

MATERIAL CONTENT:
Python Object-Oriented Programming (OOP) revolves around Classes and Objects. A class is a blueprint, while an object is an instance. Key pillars:
1. Encapsulation: bundling data and methods inside a class and restricting direct access using private attributes (_ or __).
2. Inheritance: creating new classes based on existing ones, promoting code reusability using super().
3. Polymorphism: allowing different classes to be treated as instances of the same class through common interfaces (method overriding).
4. Abstraction: hiding complex implementation details using abstract base classes (abc module).`;

const payload = {
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 4096,
    temperature: 0.2
  }
};

const res = await axios.post(endpoint, payload);
const parsed = parseJsonObject(res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
console.log('SUCCESS! Extracted fields:');
console.log('summary:', parsed.summary?.slice(0, 100));
console.log('flashcards count:', parsed.flashcards?.length);
console.log('mindMap nodes count:', parsed.mindMap?.nodes?.length);
console.log('questions count:', parsed.questions?.length);
process.exit(0);
