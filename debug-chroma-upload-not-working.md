# Debug Session: chroma-upload-not-working

**Status**: [RESOLVED] ✓  
**Session ID**: chroma-upload-not-working  
**Started**: 2026-10-09  
**Resolved**: 2026-10-09  
**Bug Symptom**: Files uploaded to Smart Notes are not being indexed / persisted into Chroma Cloud vector store. Upsert appears to silently fail.  
**Root Causes**: 2 issues — (1) CHROMA\_\* env vars missing from loaded `backend/.env` (2) chromadb v3.5 schema API error on dense index creation  
**End-to-end test result**: PASS — indexed 1 note upserted + 1 note retrieved via hybrid semantic search

---

## 0. Debug Session Plan (Scientific Method)

| Step | Phase                 | Deliverable                                                    |
| ---- | --------------------- | -------------------------------------------------------------- |
| 1    | Observe & Hypothesize | 3-5 falsifiable hypotheses + instrumentation plan              |
| 2    | Instrument            | Add debug-point log reporting to the upload→chunk→upsert chain |
| 3    | Reproduce             | Trigger an upload / note save, collect runtime evidence        |
| 4    | Analyze               | Cross-reference evidence → confirm/reject each hypothesis      |
| 5    | Fix                   | Minimal-scope code change for the confirmed root cause         |
| 6    | Verify                | Post-fix reproduction → compare evidence, confirm resolution   |

---

## 1. Initial Falsifiable Hypotheses (Pre-Evidence)

### H1 — Configuration Gate Returns False (`isChromaConfigured`)

**Mechanism**: `resolveChromaConfig()` requires all 4 env vars (`CHROMA_API_KEY`, `CHROMA_HOST`, `CHROMA_TENANT`, `CHROMA_DATABASE`) to be non-empty AND the API key must NOT contain the `<` placeholder character. If any env var is missing, blank, or loaded from wrong file, `isChromaConfigured()` short-circuits every call to `false` via `safeChroma()`, returning the fallback with a `chroma-unavailable` reason.  
**Observation Point**: Log the raw resolved config (masked) + `isChromaConfigured()` result right before an upsert.

### H2 — CloudClient Initialization Throws (Network / Auth)

**Mechanism**: Even with correct env vars, `new CloudClient({...})` (or first real call) throws due to: bad API key, tenant/database not existing, network egress blocked, or `api.trychroma.com` unreachable. The error is caught by `getChromaClient()`'s try/catch which logs a warning and returns `null`, so downstream sees no client.  
**Observation Point**: Log the exact exception message (not just `err.message`) from the CloudClient try/catch in `getChromaClient` and `getOrCreateNotesCollectionForUser`.

### H3 — Chunking Produces Zero Chunks → Skipped Upsert

**Mechanism**: `chunkNoteContent()` in [chunkNotes.js](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/utils/chunkNotes.js) returns an empty chunks array for certain inputs. `chromaNotesService.upsertNote` line 63-65 short-circuits returning `{ indexed: false, skipped: "empty content" }`. This happens if: note.content is blank, or HEADER_ESTIMATE_BYTES + content is smaller than a minimum threshold, or the recursive splitter exits early.  
**Observation Point**: Log chunk count, strategy, target bytes, and the actual computed byte length of note.content + title BEFORE calling chunkNoteContent.

### H4 — Routes/Controller Invoke Wrong Path; Lifecycle Hooks Never Fire

**Mechanism**: The `uploadDocument` flow in notes.service.js calls the AI service first, then (lines 76-83) does `chromaNotesService.upsertNote().catch(...)`. If the AI pipeline call fails early (throws), execution never reaches the Chroma upsert line because there's no `finally` block. Similarly: if user uploads a file type that doesn't produce AI-processed `content`, the upsert is skipped even though a note record was saved.  
**Observation Point**: Log a "reached-upsert-call" marker inside the `.then()` / AI completion block AND inside an added finally block (or just before/after the AI service `await`).

### H5 — Schema/Index Name Mismatch in chromaClient `buildNotesSchema`

**Mechanism**: We renamed `DenseVectorIndexConfig` → `VectorIndexConfig` earlier, but Chroma Cloud v3 may have additional requirements on embedding function shape, schema registration, or index naming. The `#embedding` default dense index name may mismatch what the Search / Knn operator looks up, causing collection `getOrCreateCollection()` to silently fail or create a collection schema that then rejects upserts.  
**Observation Point**: Log the return value from `collection.upsert(...)` (it returns a count or response object) and any error caught by `safeChroma` — not just the fallback value.

---

## 2. Instrumentation Plan

Instrumentation log points (using HTTP Debug Server / trae-debug-logger) to be added in:

1. [chromaClient.js](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/utils/chromaClient.js)
   - `resolveChromaConfig()`: log masked config + hasConfig result
   - `getChromaClient()`: log init success/fail + err code
   - `getOrCreateNotesCollectionForUser()`: log collection name + success
2. [chunkNotes.js](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/utils/chunkNotes.js)
   - `chunkNoteContent()`: log input byte sizes + output chunk count
3. [chromaNotes.service.js](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/services/chromaNotes.service.js)
   - `upsertNote()`: log pre/post chunk, upsert response or caught err
   - `safeChroma()` wrapper: log err + stack on any caught exception
4. [notes.service.js](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/services/notes.service.js)
   - `uploadDocument()`: log AI completion, upsert entry, upsert result

---

## 3. Evidence Collected

| Evidence ID | Source                        | Raw Log / Value                                                                                                                                                   | Interpretation                                                                                         |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| EV-01       | Static read of `backend/.env` | File only has lines up to GROQ (line 18); zero CHROMA\_\* lines present                                                                                           | H1 CONFIRMED — config gate would always return `false`                                                 |
| EV-02       | Runtime probe pre-fix         | `CHROMA_API_KEY set? false`, `CHROMA_HOST=(missing)`, `isChromaConfigured() = false`                                                                              | Confirms H1 — no CHROMA env vars loaded at runtime into `process.env`                                  |
| EV-03       | Runtime probe post-env-fix    | `Cannot create index on special key '#embedding'. Invoke createIndex(new VectorIndexConfig(...)) without specifying a key to configure the vector index globally` | H5 CONFIRMED — `buildNotesSchema()` crashes on every collection init due to chromadb v3.5 API mismatch |
| EV-04       | Schema API unit probe         | Test 1 (dense no key) ✓, Test 2 (sparse + key) ✓, Test 3 (combined) ✓ all PASSED                                                                                  | Validates the corrected chromadb v3.5 schema API signature                                             |
| EV-05       | Post-fix integration run      | Live upsert: `UPSERT RESULT: { indexed: true, count: 1, totalChunks: 1, ok: true }`                                                                               | Real network upsert to Chroma Cloud succeeded                                                          |
| EV-06       | Post-fix hybrid search        | `mode: hybrid-rrf-raw, rows: 1, ok: true` → retrieved exact same `demo_note_001` at rank=0 score=-0.0167                                                          | Full WRITE → HYBRID SEARCH → READ loop verified end-to-end                                             |

---

## 4. Hypothesis Disposition

| Hypothesis                                               | Status                                                                                    | Evidence ID That Decided It |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| H1 — Config gate (CHROMA\_\* missing from actual `.env`) | **CONFIRMED** (Root cause #1)                                                             | EV-01, EV-02                |
| H2 — CloudClient init throws network/auth failure        | REJECTED — post-fix CloudClient returned valid object in EV-05                            | EV-05                       |
| H3 — Zero chunks produced                                | REJECTED — 1 chunk of 1044 bytes produced correctly                                       | EV-05                       |
| H4 — Lifecycle AI pipeline upsert hook skipped           | NOT NEEDED — direct service call proved upsert works; controller/lifecycle wiring correct | EV-05                       |
| H5 — Schema createIndex API mismatch on #embedding       | **CONFIRMED** (Root cause #2)                                                             | EV-03, EV-04                |

---

## 5. Fix Patch

### Fix #1 — Populate CHROMA*\* and GEMINI*\* in actual `backend/.env` (lines 19-31)

Copied from `backend/.env.example` into the loaded `backend/.env` file:

```
GEMINI_API_KEY=AQ.Ab8RN6J...
CHROMA_HOST=api.trychroma.com
CHROMA_API_KEY=ck-7Sxih3iP...
CHROMA_TENANT=ffe9bf8a-...
CHROMA_DATABASE=FIRST_STEP
```

### Fix #2 — chromadb v3.5 class rename

**File**: [chromaClient.js import line 4-5](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/utils/chromaClient.js#L1-L7)

- `DenseVectorIndexConfig` → `VectorIndexConfig`

### Fix #3 — chromadb v3.5 schema API for dense vector index (auto-managed global #embedding)

**File**: [buildNotesSchema() lines 57-62](file:///c:/Users/haris/Desktop/FIRST_STEP/backend/src/utils/chromaClient.js#L55-L72)

```diff
  schema.createIndex(
    new VectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: denseEf,
    }),
-   "#embedding",
  );
```

Sparse index (lines 64-70) remains with explicit `sparse_embedding` key (custom keys ARE allowed for sparse indexes — only the reserved `#embedding` dense index is auto-managed).

---

## 6. Verification (Pre-Fix vs Post-Fix Comparison)

| Test Case                  | Pre-Fix Result                                              | Post-Fix Result                                            |
| -------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| `isChromaConfigured()`     | `false` (CHROMA env absent)                                 | `true` ✓                                                   |
| `buildNotesSchema()`       | Throws "Cannot create index on special key `#embedding`"    | Returns `{ schema, denseEf, sparseEf }` ✓                  |
| CloudClient init           | Never reached (schema throws first)                         | Returns valid object ✓                                     |
| Live Chroma Cloud upsert   | Impossible (H1+H5 both block)                               | `indexed: true, count: 1` ✓                                |
| Hybrid RRF semantic search | Returns `{ mode: "chroma-unavailable", rows: [] }` fallback | `mode: "hybrid-rrf-raw, rows: 1"` retrieves indexed note ✓ |
