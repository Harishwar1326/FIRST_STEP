# Deliverable 2 - Verified Feature Documentation

## 1. Smart Notes Studio

**User flow:** The authenticated user uploads a document or creates a whiteboard. The frontend sends the file or tldraw snapshot to the Express API. The backend creates a MongoDB `Note` with `processing` status, forwards document work to the AI service when configured, and updates the note with extracted and generated material.

**Supported processing evidence:** PDF and DOCX extraction is implemented in the Python file processor; plain text and image paths are also attempted. The AI service uses spaCy cleanup/NER, KeyBERT keyword extraction, dependency-based relationships, Sentence Transformers `all-MiniLM-L6-v2` embeddings, Chroma storage, and a simple extractive summary. The Node service can use Gemini, Groq, and local fallback generators for summaries, flashcards, questions, explanations, blind spots, and revision material.

**Stored outputs:** The `Note` schema stores source metadata, content, summary, keywords, concepts, relationships, difficulty, estimated study time, AI revision notes, glossary, formula/quick-revision material, flashcards, mind-map nodes/edges, and questions. Whiteboards store a tldraw snapshot. Reindex and semantic-search endpoints exist.

**Classification:** Substantially implemented. LLM output, pretrained NLP output, heuristic output, and local templates are mixed; generated content is not educationally validated. Processing is asynchronous and may return before AI completion.

## 2. Learning Academy

The Node Academy service persists study plans, technique recommendations, sessions, activities, feedback, flashcards, reviews, and streaks in MongoDB. The frontend has academy navigation and progress views. The FastAPI academy pipeline provides plan, flashcard, streak, and technique endpoints, but its state is dictionary/defaultdict based and disappears on process restart. Its recommendation logic includes fixed scores and explanations. This is an integrated application feature, not evidence of a validated adaptive recommendation model.

## 3. Learning Twin

Registration attempts to initialize a Twin. The backend stores learning style, attention, knowledge score, sessions, mistakes, strengths, and weaknesses. The FastAPI Twin pipeline exposes analytics, recommendations, and progress endpoints. The implementation initializes some learning attributes randomly and maintains Python-side state in memory. Backend fallbacks return static analytics/recommendations if dependencies fail. The verified personalization mechanism is therefore a combination of persistent application data, rules/fallbacks, and partially integrated model calls, not a continuously learned digital twin.

## 4. Learning Academy and lesson learning

Lessons are imported/seeded and retrieved by class, subject, and chapter. Quizzes and tasks are submitted through protected routes. The learning service updates profiles, analytics, weak concepts, mistakes, and recommendations. The `LearningProfile` and `Analytics` models provide persistence for progress-related data. The source does not provide a controlled educational outcome experiment.

## 5. Programming Learning and video telemetry

Programming subjects and lessons have protected routes for lesson access, progress, quizzes, notes, drawings, flashcards, and recommendations. YouTube playback is tracked in the frontend and persisted in `LessonProgress` with `watchPercentage`, `pauseCount`, `replayCount`, `playbackSpeed`, `timeSpent`, `watchedSegments`, `videoDuration`, `completed`, and `lastWatchedAt`. The data supports engagement summaries and lesson progress.

The system measures playback behavior, not understanding. Watched segments are not proof that a student attended to the content, and no comprehension classifier was found. The general recommendation service also contains mock/hard-coded video fallbacks.

## 6. Knowledge Forest

The Node layer stores graph nodes, edges, gaps, and learning-path steps in MongoDB. The frontend uses graph visualization dependencies. The Python layer uses NetworkX for path/centrality calculations. However, the generator creates a fixed synthetic concept hierarchy and random mastery values rather than extracting a graph from each user's notes. The defensible description is a graph-oriented visualization and path feature with partially synthetic generation, not a verified knowledge-graph recommender.

## 7. Thinking Lab

The Node implementation provides challenge feeds, India challenges, nearby discovery, career information, challenge submissions, scoring, progress, history, and knowledge content. Geoapify is used where configured and local fallback cards are available. Groq evaluation is used where configured with local fallback scoring. The separate FastAPI Thinking pipeline is simpler and in-memory. Some backend calls use paths not exposed by the FastAPI service, so those calls fall back locally.

## 8. Learning Assessment

Assessment questions and submissions are exposed in both frontend and backend routes. Responses are stored in learning DNA assessment structures and can create a capability profile and insights. The repository does not establish reliability, validity, calibration, or predictive validity of the assessment.

## 9. Dashboards

The student dashboard aggregates enrolled subjects, progress, analytics, academy activity, programming information, generated materials, and recent activity. The admin dashboard provides summaries, student records, student detail, lesson management, notifications, and activity logs. Admin routes require authentication and `role === 'admin'`. Dashboard correctness is plausible from the source but has not been verified against seeded database fixtures or automated integration tests.

## 10. Authentication and authorization

Registration checks PostgreSQL for duplicate email, hashes passwords through the SQL repository, creates a seven-day JWT, and initializes a Twin. Login verifies bcrypt hashes, marks the user active, records activity, and returns a token. Protected Express routes use middleware to load the user; admin routes add a role check. The frontend guards routes by user presence and role. The implementation provides a real access-control path, but public AI endpoints, permissive CORS, identifier trust, localStorage token storage, and exposed deployment credentials are material risks.

## 11. Offline mode

No service worker, IndexedDB database, offline queue, synchronization protocol, downloadable content package, or conflict resolution mechanism was found. Local fallback generation after an AI request fails should not be described as offline learning. This feature is planned or unimplemented.
