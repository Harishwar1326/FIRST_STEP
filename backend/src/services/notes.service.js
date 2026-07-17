import { notesRepository } from '../repositories/notes.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'
import fs from 'fs/promises'
import path from 'path'

export const notesService = {
  async uploadDocument(userId, file, metadata = {}) {
    if (!file) {
      throw new Error('No file uploaded')
    }

    const { uploadFile } = await import('../utils/fileUpload.js')
    
    // Save file locally
    const { filePath, fileName, originalName, mimeType, size } = await uploadFile(file, userId)

    // Create note record
    const note = await notesRepository.create({
      userId: String(userId),
      title: metadata.title?.trim() || originalName,
      originalName,
      fileName,
      filePath,
      mimeType,
      size,
      subject: metadata.subject?.trim() || 'General',
      folder: metadata.folder?.trim() || 'Inbox',
      tags: normalizeTags(metadata.tags),
      status: 'processing',
      activity: [{
        type: 'uploaded',
        label: `${originalName} uploaded`,
      }],
    })

    // Trigger AI processing asynchronously
    this.processNoteWithAI(note._id, filePath, mimeType).catch((error) => {
      console.error('AI processing failed:', error)
      notesRepository.updateStatus(note._id, 'failed')
    })

    return {
      noteId: note._id,
      status: 'processing',
      message: 'Document uploaded and processing started',
    }
  },

  async processNoteWithAI(noteId, filePath, mimeType) {
    try {
      // Read file
      const fileBuffer = await fs.readFile(filePath)

      // Create FormData for file upload
      const FormData = (await import('form-data')).default
      const formData = new FormData()
      formData.append('file', fileBuffer, {
        filename: path.basename(filePath),
        contentType: mimeType
      })
      formData.append('noteId', String(noteId))

      // Send to AI service for processing
      const response = await aiServiceClient.post('/pipeline/document/process', formData, {
        headers: formData.getHeaders()
      })

      // Update note with AI results
      await notesRepository.updateWithAIResults(noteId, response.data)

      // Update status to processed
      await notesRepository.updateStatus(noteId, 'processed')
    } catch (error) {
      console.error('AI processing error:', error)
      const fallbackResults = await buildLocalNoteAnalysis(filePath, mimeType)
      await notesRepository.updateWithAIResults(noteId, fallbackResults)
      await notesRepository.updateStatus(noteId, 'processed')
    }
  },

  async getNotesByUserId(userId, filters = {}) {
    const notes = await notesRepository.findByUserId(userId, filters)
    return notes.map((note) => ({
      id: note._id,
      title: note.title,
      subject: note.subject || 'General',
      folder: note.folder || 'Inbox',
      tags: note.tags || [],
      date: note.createdAt,
      updatedAt: note.updatedAt,
      lastOpenedAt: note.lastOpenedAt,
      status: note.status,
      mimeType: note.mimeType,
      size: note.size,
      isFavorite: note.isFavorite,
      isBookmarked: note.isBookmarked,
      summary: note.summary,
      keywords: note.keywords || [],
      concepts: note.concepts || [],
      difficulty: note.difficulty,
      estimatedStudyTime: note.estimatedStudyTime,
      aiResults: {
        flashcards: note.aiResults?.flashcards || [],
        mindMap: note.aiResults?.mindMap,
        questions: note.aiResults?.questions || [],
      },
    }))
  },

  async getLibraryMeta(userId) {
    const notes = await notesRepository.getLibraryMeta(userId)
    const folders = [...new Set(notes.map(note => note.folder || 'Inbox'))].sort()
    const subjects = [...new Set(notes.map(note => note.subject || 'General'))].sort()
    const tags = [...new Set(notes.flatMap(note => note.tags || []))].sort()
    const recentActivity = notes
      .flatMap(note => (note.activity || []).map(activity => ({
        id: `${note._id}-${activity._id || activity.createdAt}`,
        noteId: note._id,
        title: note.title,
        type: activity.type,
        label: activity.label,
        createdAt: activity.createdAt,
      })))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12)

    return {
      folders,
      subjects,
      tags,
      counts: {
        total: notes.length,
        favorites: notes.filter(note => note.isFavorite).length,
        bookmarks: notes.filter(note => note.isBookmarked).length,
        processing: notes.filter(note => note.status === 'processing').length,
      },
      recentActivity,
      recentlyOpened: notes
        .filter(note => note.lastOpenedAt)
        .sort((a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt))
        .slice(0, 8)
        .map(note => ({
          id: note._id,
          title: note.title,
          subject: note.subject,
          lastOpenedAt: note.lastOpenedAt,
        })),
    }
  },

  async getNoteById(noteId, userId) {
    const note = await notesRepository.findById(noteId, userId)
    if (!note) {
      throw new Error('Note not found')
    }

    await notesRepository.markOpened(noteId, userId)

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
      keywords: note.keywords,
      concepts: note.concepts,
      relationships: note.relationships,
      difficulty: note.difficulty,
      estimatedStudyTime: note.estimatedStudyTime,
      status: note.status,
      aiResults: note.aiResults,
    }
  },

  async updateNoteMetadata(noteId, userId, metadata) {
    const allowed = {}

    if (metadata.title !== undefined) allowed.title = metadata.title.trim()
    if (metadata.subject !== undefined) allowed.subject = metadata.subject.trim() || 'General'
    if (metadata.folder !== undefined) allowed.folder = metadata.folder.trim() || 'Inbox'
    if (metadata.tags !== undefined) allowed.tags = normalizeTags(metadata.tags)
    if (metadata.isFavorite !== undefined) allowed.isFavorite = Boolean(metadata.isFavorite)
    if (metadata.isBookmarked !== undefined) allowed.isBookmarked = Boolean(metadata.isBookmarked)

    const note = await notesRepository.updateMetadata(noteId, userId, allowed)
    if (!note) {
      throw new Error('Note not found')
    }

    return {
      id: note._id,
      title: note.title,
      subject: note.subject,
      folder: note.folder,
      tags: note.tags || [],
      isFavorite: note.isFavorite,
      isBookmarked: note.isBookmarked,
      status: note.status,
    }
  },

  async deleteNote(noteId, userId) {
    const { deleteFile } = await import('../utils/fileUpload.js')
    const note = await notesRepository.delete(noteId, userId)
    if (!note) {
      throw new Error('Note not found')
    }

    if (note.filePath) {
      await deleteFile(note.filePath)
    }

    return { success: true }
  },

  async generateFlashcards(noteId, userId) {
    const note = await notesRepository.findById(noteId, userId)
    if (!note) {
      throw new Error('Note not found')
    }

    if (note.status !== 'processed') {
      throw new Error('Note is not processed yet')
    }

    try {
      const response = await aiServiceClient.post('/pipeline/flashcards/generate', {
        noteId,
        content: note.content,
        concepts: note.concepts,
      })

      await notesRepository.updateFlashcards(noteId, response.data.flashcards)
      return response.data
    } catch (error) {
      const flashcards = buildFlashcards(note.content, note.concepts)
      await notesRepository.updateFlashcards(noteId, flashcards)
      return { status: 'success', flashcards, count: flashcards.length, source: 'local-fallback' }
    }
  },

  async generateMindMap(noteId, userId) {
    const note = await notesRepository.findById(noteId, userId)
    if (!note) {
      throw new Error('Note not found')
    }

    if (note.status !== 'processed') {
      throw new Error('Note is not processed yet')
    }

    try {
      const response = await aiServiceClient.post('/pipeline/mindmap/generate', {
        noteId,
        concepts: note.concepts,
        relationships: note.relationships,
      })

      await notesRepository.updateMindMap(noteId, response.data)
      return response.data
    } catch (error) {
      const mindMap = buildMindMap(note.concepts, note.relationships)
      await notesRepository.updateMindMap(noteId, mindMap)
      return { status: 'success', ...mindMap, source: 'local-fallback' }
    }
  },

  async generateQuestions(noteId, userId, bloomLevel) {
    const note = await notesRepository.findById(noteId, userId)
    if (!note) {
      throw new Error('Note not found')
    }

    if (note.status !== 'processed') {
      throw new Error('Note is not processed yet')
    }

    try {
      const response = await aiServiceClient.post('/pipeline/questions/generate', {
        noteId,
        content: note.content,
        bloomLevel: bloomLevel || 'all',
      })

      await notesRepository.updateQuestions(noteId, response.data.questions)
      return response.data
    } catch (error) {
      const questions = buildQuestions(note.content, note.concepts, bloomLevel || 'all')
      await notesRepository.updateQuestions(noteId, questions)
      return { status: 'success', questions, count: questions.length, source: 'local-fallback' }
    }
  },
}

const normalizeTags = (tags) => {
  if (!tags) return []

  const values = Array.isArray(tags)
    ? tags
    : String(tags).split(',')

  return [...new Set(values.map(tag => String(tag).trim()).filter(Boolean))]
}

const buildLocalNoteAnalysis = async (filePath, mimeType) => {
  const fileBuffer = await fs.readFile(filePath)
  const content = extractReadableText(fileBuffer, mimeType)
  const keywords = extractKeywords(content)
  const concepts = keywords.slice(0, 10)
  const relationships = concepts.slice(1, 8).map((concept) => ({
    source: concepts[0] || 'Topic',
    target: concept,
    type: 'related',
  }))
  const flashcards = buildFlashcards(content, concepts)
  const questions = buildQuestions(content, concepts)
  const mindMap = buildMindMap(concepts, relationships)

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
    definitions: concepts.slice(0, 6).map((term) => `${term}: key idea from the uploaded material.`),
    formulaSheet: [],
    quickRevisionSheet: buildRevisionNotes(content, concepts),
    flashcards,
    mindMap,
    questions,
  }
}

const extractReadableText = (buffer, mimeType) => {
  const raw = buffer.toString('utf8')
  const cleaned = raw
    .replace(/\0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (mimeType === 'text/plain' && cleaned) return cleaned
  if (cleaned.length > 120) return cleaned

  return 'This uploaded study material was saved successfully. Add text-based notes or run the AI service for richer OCR and document parsing.'
}

const sentencesFrom = (content) => (
  String(content || '')
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
)

const summarize = (content) => {
  const sentences = sentencesFrom(content)
  if (!sentences.length) return 'Study material uploaded and ready for review.'
  return sentences.slice(0, 3).join('. ') + '.'
}

const extractKeywords = (content) => {
  const stopWords = new Set([
    'about', 'after', 'again', 'also', 'because', 'before', 'being', 'between',
    'could', 'every', 'from', 'have', 'into', 'more', 'other', 'should',
    'than', 'their', 'there', 'these', 'this', 'through', 'were', 'when',
    'where', 'which', 'with', 'would', 'your',
  ])
  const counts = new Map()
  String(content || '')
    .toLowerCase()
    .match(/[a-z][a-z-]{3,}/g)
    ?.forEach((word) => {
      if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1)
    })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word.replace(/^\w/, (char) => char.toUpperCase()))
}

const buildFlashcards = (content, concepts = []) => {
  const terms = concepts?.length ? concepts : extractKeywords(content).slice(0, 6)
  return terms.slice(0, 8).map((term) => ({
    front: `What should you remember about ${term}?`,
    back: `Explain ${term} in your own words and connect it to one example from the uploaded material.`,
    difficulty: 'medium',
  }))
}

const buildQuestions = (content, concepts = [], bloomLevel = 'all') => {
  const terms = concepts?.length ? concepts : extractKeywords(content).slice(0, 6)
  const questions = terms.slice(0, 6).map((term, index) => ({
    question: `How does ${term} connect to the main idea of this material?`,
    answer: `A strong answer should define ${term}, explain its role, and give one supporting example.`,
    bloomLevel: bloomLevel === 'all' ? ['remember', 'understand', 'apply'][index % 3] : bloomLevel,
    difficulty: index < 2 ? 'easy' : 'medium',
  }))

  return questions.length ? questions : [{
    question: 'What are the three most important ideas in this upload?',
    answer: 'List the ideas, define each one, and add an example from the material.',
    bloomLevel: bloomLevel === 'all' ? 'understand' : bloomLevel,
    difficulty: 'easy',
  }]
}

const buildMindMap = (concepts = [], relationships = []) => {
  const terms = concepts?.length ? concepts.slice(0, 8) : ['Uploaded Material', 'Main Idea', 'Examples']
  const nodes = terms.map((term, index) => ({
    id: String(index + 1),
    label: term,
    type: index === 0 ? 'root' : 'concept',
  }))
  const edges = relationships?.length
    ? relationships.slice(0, 10).map((relationship, index) => ({
        id: `e-${index + 1}`,
        source: String(Math.max(1, terms.indexOf(relationship.source) + 1)),
        target: String(Math.max(1, terms.indexOf(relationship.target) + 1)),
        label: relationship.type || 'related',
      }))
    : nodes.slice(1).map((node) => ({
        id: `e-1-${node.id}`,
        source: '1',
        target: node.id,
        label: 'includes',
      }))

  return { nodes, edges, layout: 'radial' }
}

const buildRevisionNotes = (content, concepts = []) => {
  const points = concepts.slice(0, 5).map((concept) => `- Revise ${concept} with one definition and one example.`)
  return [summarize(content), ...points].join('\n')
}

const buildChapterNotes = (content, concepts = []) => {
  return `Overview\n${summarize(content)}\n\nKey concepts\n${concepts.slice(0, 8).map((concept) => `- ${concept}`).join('\n')}`
}

const estimateDifficulty = (content, concepts = []) => {
  const words = String(content || '').split(/\s+/).filter(Boolean)
  const averageLength = words.length
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 4
  return Math.max(1, Math.min(10, Math.round(averageLength + concepts.length / 3)))
}

const estimateStudyTime = (content) => {
  const words = String(content || '').split(/\s+/).filter(Boolean).length
  return Math.max(5, Math.ceil(words / 120))
}
