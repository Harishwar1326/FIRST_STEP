import 'dotenv/config';
import { notesAIService } from './src/services/notes.ai.service.js';

// Temporarily set GEMINI_JSON_MODEL to gemini-2.5-flash
process.env.GEMINI_JSON_MODEL = 'gemini-2.5-flash';
process.env.GEMINI_MODEL = 'gemini-2.5-flash';

const sampleNote = {
  id: 'test_note_123',
  title: 'Introduction to Operating Systems',
  subject: 'Computer Science',
  content: `An operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs. Key components include the kernel, process management, memory management (virtual memory, paging), file systems, and I/O device drivers. Concurrency issues like deadlocks, race conditions, and semaphores are critical challenges in multi-threaded programming.`,
  concepts: ['Kernel', 'Process Management', 'Virtual Memory', 'Deadlocks', 'Semaphores'],
  keywords: ['Operating System', 'Hardware', 'Memory', 'Concurrency', 'Thread']
};

console.log('--- Calling notesAIService.analyzeNotes with Gemini ---');
const analysis = await notesAIService.analyzeNotes('test_user', sampleNote);
console.log('Analysis Result:');
console.log(JSON.stringify(analysis, null, 2));

console.log('\n--- Calling notesAIService.notesToLearning with Gemini ---');
const learning = await notesAIService.notesToLearning('test_user', sampleNote);
console.log('Flashcards generated:', learning.flashcards?.length);
console.log('Quiz questions generated:', learning.quiz?.length);
console.log('Coding challenges:', learning.codingChallenges?.length);
console.log('First Quiz Question:', learning.quiz?.[0]);

process.exit(0);
