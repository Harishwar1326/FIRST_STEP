import { Search, K, Knn, Rrf, GroupBy, MinK } from "chromadb";
import {
  getOrCreateNotesCollectionForUser,
  isChromaConfigured,
  normalizeUserIdForCollection,
} from "../utils/chromaClient.js";
import { chunkNoteContent } from "../utils/chunkNotes.js";

const SEARCH_LIMIT_PER_QUERY = 24;
const KNN_CANDIDATE_POOL = 120;

const safeChroma = async (userId, operation, operationName, fallbackValue) => {
  if (!isChromaConfigured()) return fallbackValue;
  try {
    const collection = await getOrCreateNotesCollectionForUser(userId);
    if (!collection) return fallbackValue;
    return await operation(collection);
  } catch (err) {
    console.warn(
      `[chromaNotes] ${operationName} failed for user=${String(userId).slice(0, 20)}: ${err?.message || err}`
    );
    return fallbackValue;
  }
};

const makeUpsertArgsFromChunks = (chunks) => {
  const ids = [];
  const documents = [];
  const metadatas = [];
  for (const chunk of chunks) {
    ids.push(chunk.id);
    documents.push(chunk.document);
    metadatas.push(chunk.metadata);
  }
  return { ids, documents, metadatas };
};

export const chromaNotesService = {
  isEnabled() {
    return isChromaConfigured();
  },

  collectionNameForUser(userId) {
    return normalizeUserIdForCollection(userId);
  },

  async upsertNote(userId, note) {
    const noteId = String(note._id || note.id);
    if (!noteId) return { ok: false, reason: "missing noteId" };

    const { chunks, totalChunks, strategy } = chunkNoteContent({
      noteId,
      title: note.title,
      subject: note.subject,
      folder: note.folder,
      content: note.content,
      summary: note.summary,
      concepts: note.concepts,
      keywords: note.keywords,
      tags: note.tags,
    });

    if (!chunks.length) {
      return { ok: true, indexed: false, skipped: "empty content", strategy };
    }

    return safeChroma(
      userId,
      async (collection) => {
        const { ids, documents, metadatas } = makeUpsertArgsFromChunks(chunks);
        await collection.upsert({ ids, documents, metadatas });
        return {
          ok: true,
          indexed: true,
          count: chunks.length,
          totalChunks,
          noteId,
          strategy,
        };
      },
      `upsertNote(${noteId})`,
      { ok: false, indexed: false, count: 0, reason: "chroma-unavailable", noteId }
    );
  },

  async upsertBatch(userId, notes) {
    const results = [];
    for (const note of notes || []) {
      results.push(await this.upsertNote(userId, note));
    }
    return {
      ok: true,
      totalRequested: notes?.length || 0,
      indexedCount: results.filter((r) => r.indexed).length,
      results,
    };
  },

  async deleteNote(userId, noteId) {
    const safeNoteId = String(noteId);
    return safeChroma(
      userId,
      async (collection) => {
        await collection.delete({
          where: { noteId: safeNoteId },
        });
        return { ok: true, noteId: safeNoteId, deleted: true };
      },
      `deleteNote(${safeNoteId})`,
      { ok: false, deleted: false, noteId: safeNoteId, reason: "chroma-unavailable" }
    );
  },

  async deleteByChunkIds(userId, chunkIds) {
    if (!Array.isArray(chunkIds) || !chunkIds.length) {
      return { ok: true, deleted: 0 };
    }
    return safeChroma(
      userId,
      async (collection) => {
        await collection.delete({ ids: chunkIds });
        return { ok: true, deleted: chunkIds.length, ids: chunkIds };
      },
      `deleteByChunkIds(x${chunkIds.length})`,
      { ok: false, deleted: 0, reason: "chroma-unavailable" }
    );
  },

  async countChunks(userId) {
    return safeChroma(
      userId,
      async (collection) => {
        const n = await collection.count();
        return Number.isFinite(n) ? n : 0;
      },
      `countChunks`,
      0
    );
  },

  async getNoteChunks(userId, noteId) {
    const safeNoteId = String(noteId);
    return safeChroma(
      userId,
      async (collection) => {
        const result = await collection.get({
          where: { noteId: safeNoteId },
          include: ["documents", "metadatas"],
        });
        const ids = result.ids || [];
        const documents = result.documents || [];
        const metadatas = result.metadatas || [];
        const rows = ids.map((id, idx) => ({
          id,
          document: documents[idx] || "",
          metadata: metadatas[idx] || {},
        })).sort((a, b) => (a.metadata.chunkIndex ?? 0) - (b.metadata.chunkIndex ?? 0));
        return { ok: true, rows, noteId: safeNoteId, count: rows.length };
      },
      `getNoteChunks(${safeNoteId})`,
      { ok: false, rows: [], noteId: safeNoteId, count: 0, reason: "chroma-unavailable" }
    );
  },

  async hybridSearch(userId, { query, limit = SEARCH_LIMIT_PER_QUERY, where = null, groupByNote = true, denseWeight = 0.7, sparseWeight = 0.3, rrfK = 60 }) {
    const q = String(query || "").trim();
    if (!q) {
      return { ok: true, rows: [], total: 0, query: "", mode: "empty-query" };
    }

    return safeChroma(
      userId,
      async (collection) => {
        const denseRank = Knn({
          query: q,
          key: "#embedding",
          returnRank: true,
          limit: KNN_CANDIDATE_POOL,
          default: KNN_CANDIDATE_POOL,
        });

        const sparseRank = Knn({
          query: q,
          key: "sparse_embedding",
          returnRank: true,
          limit: KNN_CANDIDATE_POOL,
          default: KNN_CANDIDATE_POOL,
        });

        const hybridRank = Rrf({
          ranks: [denseRank, sparseRank],
          weights: [denseWeight, sparseWeight],
          k: rrfK,
        });

        let builder = new Search()
          .rank(hybridRank)
          .limit(groupByNote ? Math.max(limit * 3, 30) : limit)
          .select(
            K.DOCUMENT,
            K.SCORE,
            K.METADATA,
            K.ID
          );

        if (where && typeof where === "object") {
          for (const [key, value] of Object.entries(where)) {
            builder = builder.where(K(key).eq(value));
          }
        }

        if (groupByNote) {
          builder = builder.groupBy(
            new GroupBy(
              [K("noteId")],
              new MinK([K.SCORE], 1)
            )
          );
          builder = builder.limit(limit);
        }

        const result = await collection.search(builder);
        const rows = result?.rows?.()?.[0] || [];
        const normalized = rows.map((row, idx) => ({
          rank: idx,
          score: row.score,
          chunkId: row.id,
          noteId: row.metadata?.noteId,
          title: row.metadata?.title,
          subject: row.metadata?.subject,
          folder: row.metadata?.folder,
          tags: row.metadata?.tags ? String(row.metadata.tags).split(",").filter(Boolean) : [],
          concepts: row.metadata?.concepts ? String(row.metadata.concepts).split(",").filter(Boolean) : [],
          keywords: row.metadata?.keywords ? String(row.metadata.keywords).split(",").filter(Boolean) : [],
          chunkIndex: row.metadata?.chunkIndex,
          totalChunks: row.metadata?.totalChunks,
          document: row.document,
          metadata: row.metadata || {},
        }));

        return {
          ok: true,
          rows: normalized,
          total: normalized.length,
          query: q,
          mode: groupByNote ? "hybrid-rrf-grouped" : "hybrid-rrf-raw",
          weights: { dense: denseWeight, sparse: sparseWeight, rrfK },
        };
      },
      `hybridSearch(${q.slice(0, 30)}...)`,
      { ok: false, rows: [], total: 0, query: q, mode: "chroma-unavailable" }
    );
  },

  async expandRerank(userId, { query, noteId, limit = 3 }) {
    const result = await this.hybridSearch(userId, {
      query,
      limit,
      where: noteId ? { noteId: String(noteId) } : null,
      groupByNote: false,
    });
    return {
      ok: result.ok,
      noteId: noteId || null,
      chunks: result.rows,
      total: result.total,
    };
  },
};

export default chromaNotesService;
