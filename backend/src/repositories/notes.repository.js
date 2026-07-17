import mongoose from 'mongoose'
import { Note } from '../models/note.model.js'

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

    if (filters.subject) query.subject = filters.subject
    if (filters.folder) query.folder = filters.folder
    if (filters.favorite === 'true') query.isFavorite = true
    if (filters.bookmarked === 'true') query.isBookmarked = true
    if (filters.status) query.status = filters.status
    if (filters.tag) query.tags = filters.tag
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { subject: { $regex: filters.search, $options: 'i' } },
        { folder: { $regex: filters.search, $options: 'i' } },
        { tags: { $regex: filters.search, $options: 'i' } },
        { summary: { $regex: filters.search, $options: 'i' } },
        { keywords: { $regex: filters.search, $options: 'i' } },
        { concepts: { $regex: filters.search, $options: 'i' } },
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

  async updateWithAIResults(noteId, aiResults) {
    return Note.findByIdAndUpdate(
      noteId,
      {
        content: aiResults.content,
        summary: aiResults.summary,
        keywords: aiResults.keywords,
        concepts: aiResults.concepts,
        relationships: aiResults.relationships,
        difficulty: aiResults.difficulty,
        estimatedStudyTime: aiResults.estimatedStudyTime,
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
