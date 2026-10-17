# Deliverable 7 - Evidence and Limitations Report

## Verified claims

- The repository contains a React/Vite frontend, Express backend, PostgreSQL authentication path, MongoDB application models, and FastAPI AI service.
- Smart Notes has source paths for document upload, extraction, generated study artifacts, whiteboards, Chroma indexing, persistence, and fallback behavior.
- Programming lessons persist video interaction fields including watched segments, watch percentage, pauses, replays, speed, time, duration, completion, and timestamps.
- Student and admin dashboard routes/pages exist; admin routes include authentication and role checks.
- Four joblib model artifacts and a reproducible training script exist.
- The synthetic dataset has 10,000 records and seed 42 by default.
- The reproduced training results are mastery $R^2=0.9066$, MAE $=3.8989$, retention accuracy $=94.10\%$, style accuracy $=25.70\%$, and difficulty accuracy $=100.00\%$.
- The frontend production build passes locally.

## Partially verified or qualified claims

- Learning Twin persistence exists in the Node/Mongo layer, but the Python Twin is partly random and in-memory and fallback analytics are static.
- Academy persistence exists in Node/Mongo, while the separate Python Academy layer is in-memory and partly hard-coded.
- Knowledge Forest stores graph structures and uses NetworkX, but Python generation is fixed/synthetic and not verified as note-derived.
- Thinking Lab is substantial in Node, but the FastAPI integration has endpoint mismatches and local fallbacks.
- Video analytics measures playback behavior, not attention, understanding, or learning gain.
- External AI integrations are conditional on environment variables; local fallback behavior is a normal execution path.
- ML training metrics describe synthetic test data, not production performance. Runtime feature semantics are inconsistent for retention and style.

## Planned, absent, or unverified claims

- True offline learning mode with service worker, IndexedDB, synchronization, and downloadable content was not found.
- A validated adaptive recommendation algorithm was not found.
- A graph database or learned knowledge-graph recommender was not found.
- Real student outcomes, usability results, accessibility results, response-time benchmarks, or learning gains were not found.
- No meaningful backend or AI automated tests were found.
- WebSocket functionality was not found despite the dependency.
- Redis caching/session management was not demonstrated.
- RAG-based grounded question answering was not established as a complete workflow.

## Publication blockers

1. **Model validity:** align runtime feature names/semantics with training, store model metadata, validate input schemas, and retrain/evaluate on real consented data.
2. **Evaluation:** add held-out real data, cross-validation, calibration, subgroup analysis, expert content review, telemetry validation, and learning-outcome studies.
3. **Security:** rotate the credential in `render.yaml`, remove secrets from tracked configuration, authenticate FastAPI, restrict CORS, validate resource ownership, and reconsider localStorage JWTs.
4. **Operational completeness:** add `pytesseract` and the Tesseract system dependency or remove the import; pass external credentials correctly in deployment; deploy/configure the AI service where required.
5. **Reliability:** replace process-local AI state with durable storage, add retries/idempotency, and reconcile Node and FastAPI endpoint contracts.
6. **Testing:** implement API, authorization, persistence, dashboard calculation, model contract, and document-processing tests.

## Proposed next experiments

| Question                                   | Design                                                         | Metrics                                                                        |
| ------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Are profile predictions valid?             | Prospective, student-level holdout with leakage control        | MAE/RMSE, R2, Brier score, calibration, subgroup error                         |
| Are generated notes useful and accurate?   | Blind subject-expert rating against source documents           | factuality, coverage, relevance, reading level, inter-rater agreement          |
| Is video telemetry meaningful?             | Compare playback event logs with post-video concept checks     | correlation, precision/recall for completion events, comprehension association |
| Does personalization help?                 | Randomized or matched comparison against content-only workflow | normalized learning gain, delayed retention, task completion, adverse effects  |
| Can offline mode work in low connectivity? | Network-throttled device test with interrupted sync            | task success, stale/conflicting records, sync recovery, data loss              |
| Are access controls correct?               | Automated matrix of student/admin/resource-owner requests      | unauthorized request rate, privilege escalation failures, data leakage         |

## Bottom line

The project can support an academic paper about an implemented multi-service educational platform and its evidence-aware AI/ML integration. It cannot currently support claims of superior learning outcomes, validated learner profiling, robust offline access, or production-grade security. Those are future research and engineering objectives, not results of the present repository.
