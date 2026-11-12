import { notesRepository } from "../repositories/notes.repository.js";
import { aiServiceClient } from "../utils/aiServiceClient.js";
import { chromaNotesService } from "./chromaNotes.service.js";
import { isDbReady } from "../config/database.js";
import fs from "fs/promises";
import path from "path";
import { AppError } from "../utils/errorHandler.js";

const MAX_AI_RETRY_ATTEMPTS = 2;
const boundedNumber = (value, fallback, min, max) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export const normalizeSemanticSearchRequest = (query, options = {}) => {
  let denseWeight = boundedNumber(options.denseWeight, 0.7, 0, 1)
  let sparseWeight = boundedNumber(options.sparseWeight, 0.3, 0, 1)
  if (denseWeight + sparseWeight === 0) {
    denseWeight = 0.7
    sparseWeight = 0.3
  }
  return {
    query: String(query || '').trim().slice(0, 500),
    limit: Math.floor(boundedNumber(options.limit, 12, 1, 50)),
    where: {
      ...(options.subject ? { subject: String(options.subject).slice(0, 120) } : {}),
      ...(options.folder ? { folder: String(options.folder).slice(0, 100) } : {}),
    },
    groupByNote: options.groupByNote !== false,
    denseWeight,
    sparseWeight,
    rrfK: Math.floor(boundedNumber(options.rrfK, 60, 1, 200)),
  }
}

export const notesService = {
  async uploadDocument(userId, file, metadata = {}) {
    if (!file) {
      throw new AppError("No file uploaded", 400);
    }
    if (!isDbReady()) {
      throw new AppError(
        "Notes database is not connected. Start MongoDB (see MONGO_URI in backend/.env) and restart the API.",
        503,
      );
    }

    const { uploadFile, deleteFile } = await import("../utils/fileUpload.js");

    // Save file locally
    const { filePath, fileName, originalName, mimeType, size } =
      await uploadFile(file, userId);

    // Create note record
    let note;
    try {
      note = await notesRepository.create({
        userId: String(userId ?? "anonymous"),
        title: metadata.title?.trim() || originalName,
        originalName,
        fileName,
        filePath,
        mimeType,
        size,
        subject: metadata.subject?.trim() || "General",
        folder: metadata.folder?.trim() || "Inbox",
        tags: normalizeTags(metadata.tags),
        status: "processing",
        activity: [
          {
            type: "uploaded",
            label: `${originalName} uploaded`,
          },
        ],
      });
    } catch (error) {
      await deleteFile(filePath);
      throw error;
    }

    // Trigger AI processing asynchronously
    this.processNoteWithAI(note._id, filePath, mimeType).catch(async (error) => {
      console.error("AI processing failed:", error);
      try {
        await notesRepository.markProcessingFailed(note._id, error.message);
      } catch (statusError) {
        console.error("Failed to persist note processing failure:", statusError.message);
      }
    });

    return {
      noteId: note._id,
      status: "processing",
      message: "Document uploaded and processing started",
    };
  },

  async processNoteWithAI(noteId, filePath, mimeType, attempt = 1) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const FormData = (await import("form-data")).default;
      const formData = new FormData();
      formData.append("file", fileBuffer, {
        filename: path.basename(filePath),
        contentType: mimeType,
      });
      formData.append("noteId", String(noteId));

      const response = await aiServiceClient.post(
        "/pipeline/document/process",
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 300000,
        },
      );

      await notesRepository.updateWithAIResults(noteId, response.data);
      await notesRepository.updateStatus(noteId, "processed");

      const hydrated = await notesRepository.findById(noteId, null);
      if (hydrated) {
        await chromaNotesService.upsertNote(hydrated.userId, hydrated);
        if (!hydrated.aiResults?.flashcards?.length) {
          await this.generateFlashcards(noteId, hydrated.userId).catch(() => {});
        }
      }
    } catch (error) {
      console.error(`AI processing attempt ${attempt} failed:`, error);

      if (attempt < MAX_AI_RETRY_ATTEMPTS) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processNoteWithAI(noteId, filePath, mimeType, attempt + 1);
      }

      let fallbackResults;
      try {
        fallbackResults = await buildLocalNoteAnalysis(filePath, mimeType);
      } catch (fallbackError) {
        fallbackError.message = `AI document processing is unavailable and local extraction could not read this file: ${fallbackError.message}`;
        throw fallbackError;
      }
      await notesRepository.updateWithAIResults(noteId, fallbackResults);
      await notesRepository.updateStatus(noteId, "processed");

      const hydrated = await notesRepository.findById(noteId, null);
      if (hydrated) {
        await chromaNotesService.upsertNote(hydrated.userId, hydrated);
        if (!hydrated.aiResults?.flashcards?.length) {
          await this.generateFlashcards(noteId, hydrated.userId).catch(() => {});
        }
      }
    }
  },

  async getNotesByUserId(userId, filters = {}) {
    const notes = await notesRepository.findByUserId(userId, filters);
    return notes.map((note) => ({
      id: note._id,
      title: note.title,
      subject: note.subject || "General",
      folder: note.folder || "Inbox",
      tags: note.tags || [],
      date: note.createdAt,
      updatedAt: note.updatedAt,
      lastOpenedAt: note.lastOpenedAt,
      status: note.status,
      aiProvider: note.aiProvider || 'pending',
      processingWarning: note.processingWarning || '',
      mimeType: note.mimeType,
      size: note.size,
      isFavorite: note.isFavorite,
      isBookmarked: note.isBookmarked,
      noteType: note.noteType || "document",
      summary: note.summary,
      keywords: note.keywords || [],
      concepts: note.concepts || [],
      difficulty: note.difficulty,
      estimatedStudyTime: note.estimatedStudyTime,
      aiResults: {
        flashcards: note.aiResults?.flashcards || [],
        mindMap: note.aiResults?.mindMap,
        questions: note.aiResults?.questions || [],
        learningQuiz: note.aiResults?.learningQuiz || [],
        gapFill: note.aiResults?.gapFill || [],
        gaps: note.aiResults?.gaps || [],
      },
    }));
  },

  async getLibraryMeta(userId) {
    const notes = await notesRepository.getLibraryMeta(userId);
    const folders = [
      ...new Set(notes.map((note) => note.folder || "Inbox")),
    ].sort();
    const subjects = [
      ...new Set(notes.map((note) => note.subject || "General")),
    ].sort();
    const tags = [...new Set(notes.flatMap((note) => note.tags || []))].sort();
    const recentActivity = notes
      .flatMap((note) =>
        (note.activity || []).map((activity) => ({
          id: `${note._id}-${activity._id || activity.createdAt}`,
          noteId: note._id,
          title: note.title,
          type: activity.type,
          label: activity.label,
          createdAt: activity.createdAt,
        })),
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);

    return {
      folders,
      subjects,
      tags,
      counts: {
        total: notes.length,
        favorites: notes.filter((note) => note.isFavorite).length,
        bookmarks: notes.filter((note) => note.isBookmarked).length,
        processing: notes.filter((note) => note.status === "processing").length,
      },
      recentActivity,
      recentlyOpened: notes
        .filter((note) => note.lastOpenedAt)
        .sort((a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt))
        .slice(0, 8)
        .map((note) => ({
          id: note._id,
          title: note.title,
          subject: note.subject,
          lastOpenedAt: note.lastOpenedAt,
        })),
    };
  },

  async getNoteById(noteId, userId) {
    const note = await notesRepository.findById(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    await notesRepository.markOpened(noteId, userId);

    return {
      id: note._id,
      title: note.title,
      subject: note.subject,
      folder: note.folder,
      tags: note.tags || [],
      mimeType: note.mimeType,
      size: note.size,
      isFavorite: note.isFavorite,
      isBookmarked: note.isBookmarked,
      content: note.content,
      summary: note.summary,
      aiProvider: note.aiProvider || 'pending',
      processingWarning: note.processingWarning || '',
      processingChunks: note.processingChunks || 0,
      keywords: note.keywords,
      concepts: note.concepts,
      relationships: note.relationships,
      difficulty: note.difficulty,
      estimatedStudyTime: note.estimatedStudyTime,
      status: note.status,
      noteType: note.noteType || "document",
      aiResults: note.aiResults,
    };
  },

  async getWhiteboards(userId) {
    const notes = await notesRepository.findWhiteboards(userId);
    return {
      notes: notes.map(formatWhiteboard),
    };
  },

  async createWhiteboard(userId, payload = {}) {
    const title = cleanTitle(payload.title, "Untitled Note");
    const note = await notesRepository.createWhiteboard(userId, title);
    return { note: formatWhiteboard(note) };
  },

  async getWhiteboard(noteId, userId) {
    const note = await notesRepository.findWhiteboardById(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    await notesRepository.markOpened(noteId, userId);
    return { note: formatWhiteboard(note) };
  },

  async saveWhiteboard(noteId, userId, payload = {}) {
    const note = await notesRepository.updateWhiteboardSnapshot(
      noteId,
      userId,
      payload.snapshot || null,
    );
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    await chromaNotesService.upsertNote(userId, note);

    return { note: formatWhiteboard(note), saved: true };
  },

  async semanticSearch(userId, query, options = {}) {
    const safe = normalizeSemanticSearchRequest(query, options)
    if (!safe.query) {
      return { ok: true, rows: [], total: 0, query: "", mode: "empty" };
    }
    const searchResult = await chromaNotesService.hybridSearch(userId, {
      query: safe.query,
      limit: safe.limit,
      where: Object.keys(safe.where).length ? safe.where : null,
      groupByNote: safe.groupByNote,
      denseWeight: safe.denseWeight,
      sparseWeight: safe.sparseWeight,
      rrfK: safe.rrfK,
    });
    return searchResult;
  },

  async reindexNote(userId, noteId) {
    const note = await notesRepository.findById(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }
    return chromaNotesService.upsertNote(userId, note);
  },

  async reindexAllForUser(userId) {
    const notes = await notesRepository.findByUserId(userId, {});
    return chromaNotesService.upsertBatch(userId, notes);
  },

  async updateNoteMetadata(noteId, userId, metadata) {
    const allowed = {};

    if (metadata.title !== undefined) allowed.title = metadata.title.trim();
    if (metadata.subject !== undefined)
      allowed.subject = metadata.subject.trim() || "General";
    if (metadata.folder !== undefined)
      allowed.folder = metadata.folder.trim() || "Inbox";
    if (metadata.tags !== undefined)
      allowed.tags = normalizeTags(metadata.tags);
    if (metadata.isFavorite !== undefined)
      allowed.isFavorite = Boolean(metadata.isFavorite);
    if (metadata.isBookmarked !== undefined)
      allowed.isBookmarked = Boolean(metadata.isBookmarked);

    const note = await notesRepository.updateMetadata(noteId, userId, allowed);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    await chromaNotesService.upsertNote(userId, note);

    return {
      id: note._id,
      title: note.title,
      subject: note.subject,
      folder: note.folder,
      tags: note.tags || [],
      isFavorite: note.isFavorite,
      isBookmarked: note.isBookmarked,
      status: note.status,
    };
  },

  async deleteNote(noteId, userId) {
    const { deleteFile } = await import("../utils/fileUpload.js");
    const note = await notesRepository.delete(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    if (note.filePath) {
      await deleteFile(note.filePath);
    }

    await chromaNotesService.deleteNote(userId, noteId);

    return { success: true };
  },

  async generateFlashcards(noteId, userId) {
    const note = await notesRepository.findById(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    if (note.status !== "processed") {
      throw new AppError("Note is not processed yet", 400);
    }

    try {
      const response = await aiServiceClient.post(
        "/pipeline/flashcards/generate",
        {
          noteId,
          content: note.content,
          concepts: note.concepts,
        },
      );

      await notesRepository.updateFlashcards(noteId, response.data.flashcards);
      return response.data;
    } catch (error) {
      const flashcards = buildFlashcards(note.content, note.concepts);
      await notesRepository.updateFlashcards(noteId, flashcards);
      return {
        status: "success",
        flashcards,
        count: flashcards.length,
        source: "local-fallback",
      };
    }
  },

  async generateMindMap(noteId, userId) {
    const note = await notesRepository.findById(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    if (note.status !== "processed") {
      throw new AppError("Note is not processed yet", 400);
    }

    try {
      const response = await aiServiceClient.post(
        "/pipeline/mindmap/generate",
        {
          noteId,
          concepts: note.concepts,
          relationships: note.relationships,
        },
      );

      await notesRepository.updateMindMap(noteId, response.data);
      return response.data;
    } catch (error) {
      const mindMap = buildMindMap(note.concepts, note.relationships);
      await notesRepository.updateMindMap(noteId, mindMap);
      return { status: "success", ...mindMap, source: "local-fallback" };
    }
  },

  async generateQuestions(noteId, userId, bloomLevel) {
    const note = await notesRepository.findById(noteId, userId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    if (note.status !== "processed") {
      throw new AppError("Note is not processed yet", 400);
    }

    try {
      const response = await aiServiceClient.post(
        "/pipeline/questions/generate",
        {
          noteId,
          content: note.content,
          bloomLevel: bloomLevel || "all",
        },
      );

      await notesRepository.updateQuestions(noteId, response.data.questions);
      return response.data;
    } catch (error) {
      const questions = buildQuestions(
        note.content,
        note.concepts,
        bloomLevel || "all",
      );
      await notesRepository.updateQuestions(noteId, questions);
      return {
        status: "success",
        questions,
        count: questions.length,
        source: "local-fallback",
      };
    }
  },
};

const normalizeTags = (tags) => {
  if (!tags) return [];

  const values = Array.isArray(tags) ? tags : String(tags).split(",");

  return [...new Set(values.map((tag) => String(tag).trim()).filter(Boolean))];
};

const cleanTitle = (value, fallback) => {
  const title = String(value || "").trim();
  return title ? title.slice(0, 120) : fallback;
};

const formatWhiteboard = (note) => ({
  id: note._id,
  title: note.title,
  noteType: "whiteboard",
  snapshot: note.tldrawSnapshot || null,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  lastOpenedAt: note.lastOpenedAt,
});

const buildLocalNoteAnalysis = async (filePath, mimeType) => {
  const fileBuffer = await fs.readFile(filePath);
  const content = extractReadableText(fileBuffer, mimeType);
  const keywords = extractKeywords(content);
  const concepts = keywords.slice(0, 10);
  const relationships = concepts.slice(1, 8).map((concept) => ({
    source: concepts[0] || "Topic",
    target: concept,
    type: "related",
  }));
  const flashcards = buildFlashcards(content, concepts);
  const questions = buildQuestions(content, concepts);
  const mindMap = buildMindMap(concepts, relationships);

  return {
    content,
    summary: summarize(content),
    keywords,
    concepts,
    relationships,
    difficulty: estimateDifficulty(content, concepts),
    estimatedStudyTime: estimateStudyTime(content),
    revisionNotes: buildRevisionNotes(content, concepts),
    chapterNotes: buildChapterNotes(content, concepts),
    keyConcepts: concepts,
    glossary: concepts.slice(0, 6).map((term) => ({
      term,
      definition: `Review how ${term} is introduced and connected in this material.`,
    })),
    definitions: concepts
      .slice(0, 6)
      .map((term) => `${term}: key idea from the uploaded material.`),
    formulaSheet: [],
    quickRevisionSheet: buildRevisionNotes(content, concepts),
    flashcards,
    mindMap,
    questions,
    learningQuiz: questions.slice(0, 6).map((item) => ({
      question: item.question,
      options: [],
      correctIndex: 0,
      explanation: item.answer,
      concept: item.concept || '',
    })),
    gapFill: [],
    gaps: [],
    learningPack: { chunksProcessed: 0, source: 'local-fallback' },
    aiProvider: 'local-nlp',
    processingWarning: 'Gemini processing was unavailable, so local fallback material was saved. Check the AI service Gemini key and model settings to retry with AI.',
  };
};

export const extractReadableText = (buffer, mimeType) => {
  const raw = buffer.toString("utf8");
  const characters = [...raw];
  const invalidCharacters = characters.filter((character) =>
    character === "\uFFFD" || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(character),
  ).length;
  const cleaned = raw
    .replace(/\0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    ["text/plain", "text/markdown"].includes(mimeType) &&
    cleaned &&
    characters.length > 0 &&
    invalidCharacters / characters.length <= 0.01
  ) return cleaned;

  throw new AppError(
    "Local processing supports readable text and Markdown only. Document extraction is unavailable while the AI service is offline.",
    503,
  );
};

const sentencesFrom = (content) =>
  String(content || "")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);

const summarize = (content) => {
  const sentences = sentencesFrom(content);
  if (!sentences.length) return "Study material uploaded and ready for review.";
  return sentences.slice(0, 3).join(". ") + ".";
};

const extractKeywords = (content) => {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "also",
    "because",
    "before",
    "being",
    "between",
    "could",
    "every",
    "from",
    "have",
    "into",
    "more",
    "other",
    "should",
    "than",
    "their",
    "there",
    "these",
    "this",
    "through",
    "were",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
  ]);
  const counts = new Map();
  String(content || "")
    .toLowerCase()
    .match(/[a-z][a-z-]{3,}/g)
    ?.forEach((word) => {
      if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word.replace(/^\w/, (char) => char.toUpperCase()));
};

const buildFlashcards = (content, concepts = []) => {
  const terms = concepts?.length
    ? concepts
    : extractKeywords(content).slice(0, 6);
  return terms.slice(0, 8).map((term) => ({
    front: `What should you remember about ${term}?`,
    back: `Explain ${term} in your own words and connect it to one example from the uploaded material.`,
    difficulty: "medium",
  }));
};

const buildQuestions = (content, concepts = [], bloomLevel = "all") => {
  const terms = concepts?.length
    ? concepts
    : extractKeywords(content).slice(0, 6);
  const questions = terms.slice(0, 6).map((term, index) => ({
    question: `How does ${term} connect to the main idea of this material?`,
    answer: `A strong answer should define ${term}, explain its role, and give one supporting example.`,
    bloomLevel:
      bloomLevel === "all"
        ? ["remember", "understand", "apply"][index % 3]
        : bloomLevel,
    difficulty: index < 2 ? "easy" : "medium",
  }));

  return questions.length
    ? questions
    : [
        {
          question: "What are the three most important ideas in this upload?",
          answer:
            "List the ideas, define each one, and add an example from the material.",
          bloomLevel: bloomLevel === "all" ? "understand" : bloomLevel,
          difficulty: "easy",
        },
      ];
};

const buildMindMap = (concepts = [], relationships = []) => {
  const terms = concepts?.length
    ? concepts.slice(0, 8)
    : ["Uploaded Material", "Main Idea", "Examples"];
  const nodes = terms.map((term, index) => ({
    id: String(index + 1),
    label: term,
    type: index === 0 ? "root" : "concept",
  }));
  const edges = relationships?.length
    ? relationships.slice(0, 10).map((relationship, index) => ({
        id: `e-${index + 1}`,
        source: String(Math.max(1, terms.indexOf(relationship.source) + 1)),
        target: String(Math.max(1, terms.indexOf(relationship.target) + 1)),
        label: relationship.type || "related",
      }))
    : nodes.slice(1).map((node) => ({
        id: `e-1-${node.id}`,
        source: "1",
        target: node.id,
        label: "includes",
      }));

  return { nodes, edges, layout: "radial" };
};

const buildRevisionNotes = (content, concepts = []) => {
  const points = concepts
    .slice(0, 5)
    .map(
      (concept) => `- Revise ${concept} with one definition and one example.`,
    );
  return [summarize(content), ...points].join("\n");
};

const buildChapterNotes = (content, concepts = []) => {
  return `Overview\n${summarize(content)}\n\nKey concepts\n${concepts
    .slice(0, 8)
    .map((concept) => `- ${concept}`)
    .join("\n")}`;
};

const estimateDifficulty = (content, concepts = []) => {
  const words = String(content || "")
    .split(/\s+/)
    .filter(Boolean);
  const averageLength = words.length
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 4;
  return Math.max(
    1,
    Math.min(10, Math.round(averageLength + concepts.length / 3)),
  );
};

const estimateStudyTime = (content) => {
  const words = String(content || "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(5, Math.ceil(words / 120));
};
