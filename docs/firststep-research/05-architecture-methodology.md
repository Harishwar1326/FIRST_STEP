# Deliverable 5 - Architecture and Methodology

## System architecture

```mermaid
flowchart LR
    U[Student or Admin Browser] --> F[React + Vite Frontend]
    F -->|JWT REST requests| B[Node.js + Express API]
    B --> P[(PostgreSQL users and roles)]
    B --> M[(MongoDB learning documents)]
    B --> R[(Redis connection; limited demonstrated use)]
    B --> A[FastAPI AI Service]
    A --> N[spaCy / KeyBERT / Sentence Transformers]
    A --> ML[scikit-learn inference artifacts]
    A --> C[(Chroma embeddings)]
    B --> G[Gemini or Groq APIs]
    B --> Geo[Geoapify Places API]
```

**Figure 1.** Source-grounded deployment and runtime architecture. Redis is shown as a configured dependency, not as verified session/cache behavior.

## Feature workflow: Smart Notes

```mermaid
sequenceDiagram
    participant S as Student UI
    participant B as Express API
    participant DB as MongoDB Note
    participant A as FastAPI or Node AI
    participant C as Chroma
    S->>B: Upload PDF, DOCX, TXT, image, or create whiteboard
    B->>DB: Create note with processing status
    B->>A: Send document or generation request
    A->>A: Extract, clean, summarize, extract concepts and keywords
    A->>A: Generate embeddings and study artifacts
    A->>C: Store document embedding/index entry
    A-->>B: Return processed results or fallback
    B->>DB: Persist summary, flashcards, questions, graph, metadata
    B-->>S: Return note status and generated materials
```

**Figure 2.** Document-to-study-material workflow. External LLM calls are optional and can be replaced by local heuristics/templates.

## Activity and analytics data flow

```mermaid
flowchart TD
    V[Lesson/video interaction] --> T[Frontend telemetry]
    Q[Quiz/task submission] --> E[Express controllers]
    T --> E
    E --> LP[(LessonProgress)]
    E --> QR[(QuizResult)]
    E --> AN[(Analytics)]
    E --> PF[(LearningProfile)]
    LP --> D[Student dashboard]
    QR --> D
    AN --> D
    PF --> D
    AN --> AD[Admin summary and student detail]
```

**Figure 3.** Verified persistence flow for learning and programming activity. The repository does not demonstrate that video behavior is converted into comprehension.

## Model pipeline

```mermaid
flowchart LR
    G[Seed 42 synthetic generator] --> CSV[10,000-row CSV]
    CSV --> S[Column selection and target construction]
    S --> Split[Random 80/20 split]
    Split --> RF[RandomForest mastery]
    Split --> LR[Logistic regression retention]
    Split --> RFS[RandomForest style]
    Split --> DT[Decision tree difficulty]
    RF --> J[joblib artifacts]
    LR --> J
    RFS --> J
    DT --> J
    J --> I[FastAPI runtime inference]
    X[Runtime feature dictionaries] --> I
    I --> O[Profile outputs]
```

**Figure 4.** Training and inference pipeline. Artifact-backed inference follows the training feature order; the emergency in-memory retention and style models use different feature meanings and are not schema-compatible.

## Methodology reconstructed from source

1. **Identity and access:** PostgreSQL stores users and roles. Express signs JWTs after bcrypt verification. Middleware protects most application routes and an admin middleware checks the role.
2. **Content and learning state:** MongoDB models store notes, lessons, progress, results, profiles, recommendations, academy events, and administration data.
3. **AI processing:** Node clients call Gemini/Groq where configured. The Python service uses NLP, embedding, graph, and scikit-learn pipelines. Local fallbacks make some requests return without external services.
4. **Telemetry:** Programming lesson playback events are collected by the frontend and saved to a unique `(userId, lessonId)` progress document. Fields include segments, pauses, replays, percentage, speed, duration, time, and completion.
5. **Dashboard aggregation:** Frontend pages request backend summaries and display progress, analytics, recommendations, generated materials, and administrative records.
6. **Deployment:** Docker Compose provisions MongoDB, PostgreSQL, Redis, Chroma, backend, and AI service. Render configuration provisions only the backend and expects external AI service configuration.

## Reproducibility requirements

A repeatable evaluation should pin dependency lockfiles, record the Python model package versions, validate `feature_names_in_` against runtime schemas, seed all random processes, keep a held-out evaluation set, and capture generated model metrics in versioned reports. It should also use test fixtures for MongoDB/PostgreSQL and verify API authorization and dashboard formulas end to end.
