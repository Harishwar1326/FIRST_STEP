# Learning Twin restoration checklist

Branch: `codex/restore-learning-analytics`  
Audit date: 2026-10-24  
Scope: restore the authenticated, data-driven Learning Twin using existing FirstStep records and APIs.

## Audit findings

- The Twin page makes three authenticated calls for profile, analytics, and recommendations, then shows skeleton loading and basic empty states. Fetch errors are rendered only in the Mentor Note card; a stale error remains after a successful sprint save unless the fetch clears it.
- The Twin profile was a separate Mongo document keyed by the authenticated user ID. Empty documents used zero score, and default style fields were masked until Twin-local activity existed.
- Twin analytics and recommendations previously read only `LearningTwin.studySessions` and `LearningTwin.mistakes`, missing Programming Learning, Learning DNA, Learning Academy, Thinking Lab, notes, and revision records.
- Generic hardcoded focus topics/materials were returned to students with no Twin-local activity, and recommendations were not linked to lessons.
- `updateProgress` persisted manually logged study sessions and posted them to the process-local Python Twin. The Python service was not a durable source of truth.
- Learning Academy's `logActivityToTwin` submitted incompatible fields; much of that data was discarded or stored without useful analytics meaning.
- Programming Learning already persisted per-user lesson progress, observed watch time, video events, and quiz results with weak concepts. Admin analytics read the same records, but the student Twin did not.
- Twin routes are authenticated and derive the owner from `req.user`; the progress request schema is strict and bounded. No goal/recommendation completion API exists.
- Existing regression tests cover empty Twin-local analytics, progress validation, and route authentication, but do not verify cross-feature activity aggregation or personalized lesson recommendations.

## Checklist

- [x] Audit the Twin page, authentication, APIs, models, programming activity, Academy integration, and existing tests.
- [x] Confirm the existing branch is the dedicated restoration checkpoint.
- [x] Record audit findings before implementation.
- [x] Aggregate the authenticated student's persisted assessment, lesson/video, quiz, Academy, Thinking Lab, notes, and revision evidence into Twin reads; keep self-reported sprint data separate from measured scores.
- [x] Build deterministic recommendations from weak quiz concepts, due revisions, unfinished lessons, and available curriculum, with links to published lessons.
- [x] Repair Twin sprint input semantics and remove the incompatible Learning Academy denormalized write; the Twin reads Academy's persisted activity directly.
- [x] Add one-snapshot loading, first-time, error, and success states; show only evidence-supported metrics and functional lesson links.
- [x] Add authenticated admin student detail fields sourced from the same Twin snapshot and existing per-student records.
- [x] Add regression tests for empty profiles, cross-feature aggregation, linked weak-topic recommendations, database outage, bounded inputs, and route authentication.
- [x] Run all backend regression tests and the frontend production build. Database-backed multi-account persistence tests remain unavailable; local production records were not used for destructive or test writes.

## Verification

- Backend: `node --test` — 67 passed, 0 failed.
- Frontend: Vite production build passed; the existing main-chunk size warning remains.
- Backend changed-file syntax checks and `git diff --check` passed.
- Database-backed activity/write/read tests were not run because no disposable Twin integration database is configured in the test harness. Student identity is derived from the authenticated route; the source queries filter by that identity.

## Remaining limits

- Programming video progress/events, quiz attempts, Learning Academy activities, Thinking Lab submissions, Learning DNA assessment, notes, revisions, and existing Twin self-reported sprints are integrated. Task completion is counted only when a submission includes a task ID matching a published course task; legacy submissions without task IDs remain unlinked. No subject-open event or validated flashcard-review measurement is available to the Twin, so those are not represented as completed actions.
- Learning DNA stores the latest assessment rather than a sequence of assessment attempts. The Twin reports the persisted assessment record it can access.
- Recommendations are deterministic and evidence-grounded. No LLM is needed for core recommendation correctness; contextual prose generation is not part of this repair.
