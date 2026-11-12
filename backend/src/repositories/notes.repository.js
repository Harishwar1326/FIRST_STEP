import mongoose from 'mongoose'
import { Note } from '../models/note.model.js'

export const escapeNoteSearch = (value = '') =>
  String(value).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const notesRepository = {
  async create(noteData) {
    const note = new Note(noteData)
    await note.save()
    return note
  },

  async findById(noteId, userId) {
    const query = { _id: noteId }
    if (userId) query.userId = String(userId)
    return Note.findOne(query)
  },

  async findByUserId(userId, filters = {}) {
    const query = { userId: String(userId) }

    if (filters.noteType) query.noteType = filters.noteType
    if (filters.subject) query.subject = filters.subject
    if (filters.folder) query.folder = filters.folder
    if (filters.favorite === 'true') query.isFavorite = true
    if (filters.bookmarked === 'true') query.isBookmarked = true
    if (filters.status) query.status = filters.status
    if (filters.tag) query.tags = filters.tag
    if (filters.search) {
      const safeSearch = escapeNoteSearch(filters.search)
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { subject: { $regex: safeSearch, $options: 'i' } },
        { folder: { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } },
        { summary: { $regex: safeSearch, $options: 'i' } },
        { keywords: { $regex: safeSearch, $options: 'i' } },
        { concepts: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    const sort = filters.sort === 'recently-opened'
      ? { lastOpenedAt: -1, updatedAt: -1 }
      : { createdAt: -1 }

    return Note.find(query).sort(sort)
  },

  async getLibraryMeta(userId) {
    const notes = await Note.find({ userId: String(userId) }).select('subject folder tags isFavorite isBookmarked lastOpenedAt activity createdAt title status')
    return notes
  },

  async updateStatus(noteId, status) {
    const activityType = status === 'processed' ? 'processed' : status
    return Note.findByIdAndUpdate(
      noteId,
      {
        status,
        $push: {
          activity: {
            type: activityType,
            label: status === 'processed' ? 'AI processing completed' : `Status changed to ${status}`,
          },
        },
      },
      { new: true }
    )
  },

  async markProcessingFailed(noteId, message) {
    return Note.findByIdAndUpdate(noteId, {
      status: 'failed',
      processingWarning: String(message || 'Document processing failed.').slice(0, 500),
      $push: { activity: { type: 'failed', label: 'Document processing failed' } },
    }, { new: true })
  },

  async updateWithAIResults(noteId, aiResults) {
    const relationships = Array.isArray(aiResults.relationships)
      ? aiResults.relationships.filter((item) => item && typeof item === 'object').map((item) => ({
          source: String(item.source || item.from || ''),
          target: String(item.target || item.to || ''),
          type: String(item.type || 'related'),
        })).filter((item) => item.source && item.target)
      : []
    return Note.findByIdAndUpdate(
      noteId,
      {
        content: aiResults.content,
        summary: aiResults.summary,
        keywords: aiResults.keywords,
        concepts: aiResults.concepts,
        relationships,
        difficulty: aiResults.difficulty,
        estimatedStudyTime: aiResults.estimatedStudyTime,
        aiProvider: aiResults.aiProvider || 'local-nlp',
        processingWarning: aiResults.processingWarning || '',
        processingChunks: aiResults.learningPack?.chunksProcessed || 0,
        aiResults: {
          revisionNotes: aiResults.revisionNotes,
          chapterNotes: aiResults.chapterNotes,
          keyConcepts: aiResults.keyConcepts,
          glossary: aiResults.glossary,
          definitions: aiResults.definitions,
          formulaSheet: aiResults.formulaSheet,
          quickRevisionSheet: aiResults.quickRevisionSheet,
          flashcards: aiResults.flashcards || [],
          mindMap: aiResults.mindMap,
          questions: aiResults.questions || [],
          learningQuiz: aiResults.learningQuiz || [],
          gapFill: aiResults.gapFill || [],
          gaps: aiResults.gaps || [],
          learningPack: aiResults.learningPack || null,
        },
      },
      { new: true }
    )
  },

  async updateMetadata(noteId, userId, metadata) {
    return Note.findOneAndUpdate(
      { _id: noteId, userId: String(userId) },
      {
        $set: metadata,
        $push: {
          activity: {
            type: 'tagged',
            label: 'Document details updated',
          },
        },
      },
      { new: true }
    )
  },

  async createWhiteboard(userId, title = 'Untitled Note') {
    const note = new Note({
      userId: String(userId),
      title,
      subject: 'Whiteboard',
      folder: 'Digital Notebook',
      tags: [],
      status: 'processed',
      noteType: 'whiteboard',
      tldrawSnapshot: null,
      activity: [{
        type: 'uploaded',
        label: 'Whiteboard note created',
      }],
    })
    await note.save()
    return note
  },

  async findWhiteboards(userId) {
    return Note.find({ userId: String(userId), noteType: 'whiteboard' })
      .select('title tldrawSnapshot createdAt updatedAt lastOpenedAt')
      .sort({ updatedAt: -1 })
  },

  async findWhiteboardById(noteId, userId) {
    return Note.findOne({ _id: noteId, userId: String(userId), noteType: 'whiteboard' })
  },

  async updateWhiteboardSnapshot(noteId, userId, snapshot) {
    return Note.findOneAndUpdate(
      { _id: noteId, userId: String(userId), noteType: 'whiteboard' },
      {
        $set: {
          tldrawSnapshot: snapshot,
          lastOpenedAt: new Date(),
        },
      },
      { new: true }
    )
  },

  async markOpened(noteId, userId) {
    return Note.findOneAndUpdate(
      { _id: noteId, userId: String(userId) },
      {
        lastOpenedAt: new Date(),
        $push: {
          activity: {
            type: 'opened',
            label: 'Document opened',
          },
        },
      },
      { new: true }
    )
  },

  async updateFlashcards(noteId, flashcards) {
    return Note.findByIdAndUpdate(
      noteId,
      { 'aiResults.flashcards': flashcards },
      { new: true }
    )
  },

  async updateLearningResults(noteId, learning = {}) {
    const $set = {}
    if (Array.isArray(learning.flashcards)) {
      $set['aiResults.flashcards'] = learning.flashcards
    }
    if (Array.isArray(learning.quiz)) {
      $set['aiResults.learningQuiz'] = learning.quiz
    }
    if (learning.revisionSummary) {
      $set['aiResults.revisionNotes'] = learning.revisionSummary
    }
    if (learning && Object.keys(learning).length) {
      $set['aiResults.learningPack'] = learning
    }
    if (!Object.keys($set).length) return null

    return Note.findByIdAndUpdate(
      noteId,
      {
        $set,
        $push: {
          activity: {
            type: 'processed',
            label: 'AI learning set saved (flashcards & quiz)',
          },
        },
      },
      { new: true },
    )
  },

  async updateMindMap(noteId, mindMapData) {
    return Note.findByIdAndUpdate(
      noteId,
      { 'aiResults.mindMap': mindMapData },
      { new: true }
    )
  },

  async updateQuestions(noteId, questions) {
    return Note.findByIdAndUpdate(
      noteId,
      { 'aiResults.questions': questions },
      { new: true }
    )
  },

  async delete(noteId, userId) {
    return Note.findOneAndDelete({ _id: noteId, userId: String(userId) })
  },
}
