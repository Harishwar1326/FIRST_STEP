import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Beaker,
  BookMarked,
  Brain,
  ChevronRight,
  Clock3,
  Compass,
  FileText,
  Flag,
  Folder,
  GraduationCap,
  HelpCircle,
  Image,
  Layers,
  Library,
  Loader2,
  MessageSquareText,
  Pencil,
  PlayCircle,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Tags,
  TimerReset,
  TrendingUp,
  Upload,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { notesService } from '../../services/notesService'
import { notesAIService } from '../../services/notesAIService'
import NoteCard from '../../components/notes/NoteCard'
import ProcessingIndicator from '../../components/notes/ProcessingIndicator'
import NoteDetailView from '../../components/notes/NoteDetailView'
import WhiteboardStudio from '../../components/notes/WhiteboardStudio'

const initialFilters = {
  search: '',
  subject: '',
  folder: '',
  tag: '',
  favorite: '',
  bookmarked: '',
  sort: '',
}

const SmartNotesPage = () => {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [notes, setNotes] = useState([])
  const [libraryMeta, setLibraryMeta] = useState(null)
  const [processingNote, setProcessingNote] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(initialFilters)
  const [uploadMeta, setUploadMeta] = useState({ subject: '', folder: '', tags: '' })
  const [error, setError] = useState('')

  // ============ Smart Notes AI Engine state ============
  const [aiTab, setAiTab] = useState('analyze') // analyze | learn | blindspots | explain | drawing | revision | grow
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiTargetNote, setAiTargetNote] = useState(null) // { id, title, subject, noteType, snapshot? }
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLearning, setAiLearning] = useState(null)
  const [aiBlindSpots, setAiBlindSpots] = useState(null)
  const [aiExplainAnswer, setAiExplainAnswer] = useState(null)
  const [aiExplainQuestion, setAiExplainQuestion] = useState('')
  const [aiDrawing, setAiDrawing] = useState(null)
  const [aiRevision, setAiRevision] = useState(null)
  const [aiRevisionMinutes, setAiRevisionMinutes] = useState(10)
  const [aiEvolution, setAiEvolution] = useState(null)
  const [aiFlashcardIndex, setAiFlashcardIndex] = useState(0)
  const [aiFlashcardFlipped, setAiFlashcardFlipped] = useState(false)
  const [aiQuizAnswers, setAiQuizAnswers] = useState({})
  const [aiQuizRevealed, setAiQuizRevealed] = useState(false)
  const [focusSeconds, setFocusSeconds] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)

  useEffect(() => {
    if (!focusRunning) return undefined
    const timer = setInterval(() => {
      setFocusSeconds((seconds) => {
        if (seconds <= 1) {
          setFocusRunning(false)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [focusRunning])

  useEffect(() => {
    if (libraryMeta) {
      notesAIService.knowledgeEvolution({ subject: filters.subject || null, meta: libraryMeta }).then(setAiEvolution).catch(() => {})
    }
  }, [filters.subject, libraryMeta])

  useEffect(() => {
    fetchLibrary()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes(filters)
    }, 250)
    return () => clearTimeout(timer)
  }, [filters])

  const fetchLibrary = async () => {
    setLoading(true)
    try {
      const [notesResponse, metaResponse] = await Promise.all([
        notesService.searchNotes(filters),
        notesService.getLibraryMeta(),
      ])
      setNotes(notesResponse.notes || [])
      setLibraryMeta(metaResponse)
      queryClient.invalidateQueries({ queryKey: ['learning-profile'] })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to open Smart Notes Studio right now.')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async (nextFilters = filters) => {
    try {
      const response = await notesService.searchNotes(nextFilters)
      setNotes(response.notes || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to refresh notes.')
    }
  }

  const refreshMeta = async () => {
    try {
      setLibraryMeta(await notesService.getLibraryMeta())
    } catch (err) {
      console.error('Failed to refresh library meta:', err)
    }
  }

  const handleWhiteboardLibraryChanged = useCallback(() => {
    fetchNotes(filters)
    refreshMeta()
  }, [filters])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0])
      e.target.value = ''
    }
  }

  const handleFileUpload = async (file) => {
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    Object.entries(uploadMeta).forEach(([key, value]) => {
      if (value.trim()) formData.append(key, value.trim())
    })

    try {
      const response = await notesService.uploadDocument(formData)
      setProcessingNote({
        id: response.noteId,
        title: file.name,
        status: 'processing',
        progress: { currentStep: 'parsing', completedSteps: [] },
      })
      simulateProcessing()
      await fetchLibrary()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try another file.')
      setUploading(false)
    }
  }

  const simulateProcessing = () => {
    const steps = ['parsing', 'ocr', 'embeddings', 'analysis', 'complete']
    let currentStepIndex = 0

    const interval = setInterval(() => {
      if (currentStepIndex >= steps.length) {
        clearInterval(interval)
        setProcessingNote(null)
        setUploading(false)
        fetchLibrary()
        return
      }

      setProcessingNote((prev) => ({
        ...prev,
        progress: {
          currentStep: steps[currentStepIndex],
          completedSteps: steps.slice(0, currentStepIndex),
        },
      }))
      currentStepIndex += 1
    }, 1600)
  }

  const handleGenerate = async (noteId, type) => {
    try {
      if (type === 'flashcards') await notesService.generateFlashcards(noteId)
      if (type === 'mindmap') await notesService.generateMindMap(noteId)
      if (type === 'questions') await notesService.generateQuestions(noteId, 'all')
      const response = await notesService.getNoteById(noteId)
      setSelectedNote(response)
      await fetchLibrary()
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. The note may still be processing.')
    }
  }

  const handleDelete = async (noteId) => {
    if (!confirm('Delete this note from your studio?')) return
    try {
      await notesService.deleteNote(noteId)
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
      if (selectedNote?.id === noteId) setSelectedNote(null)
      await refreshMeta()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this note.')
    }
  }

  const handleToggleFlag = async (noteId, payload) => {
    const previous = notes
    setNotes((current) => current.map((note) => note.id === noteId ? { ...note, ...payload } : note))
    try {
      await notesService.updateNote(noteId, payload)
      await refreshMeta()
    } catch (err) {
      setNotes(previous)
      setError(err.response?.data?.message || 'Could not update this note.')
    }
  }

  // ============ Smart Notes AI Engine actions ============
  const resolveAiTarget = (fallbackHint = '') => {
    if (aiTargetNote?.id) return aiTargetNote
    if (selectedNote?.id) {
      return {
        id: selectedNote.id,
        title: selectedNote.title,
        subject: selectedNote.subject,
        noteType: selectedNote.noteType || (selectedNote.snapshot ? 'whiteboard' : 'document'),
        concepts: selectedNote.concepts,
        keywords: selectedNote.keywords,
        content: selectedNote.content,
        snapshot: selectedNote.snapshot || selectedNote.tldrawSnapshot || null,
      }
    }
    if (notes.length) {
      const n = notes[0]
      return {
        id: n.id,
        title: n.title,
        subject: n.subject,
        noteType: n.noteType || 'document',
        concepts: n.concepts,
        keywords: n.keywords,
        content: n.summary || '',
        snapshot: n.snapshot || null,
      }
    }
    return {
      id: fallbackHint || 'local',
      title: 'Temporary sample note',
      subject: uploadMeta.subject || filters.subject || 'General',
      noteType: 'document',
      concepts: [],
      keywords: [],
      content: '',
      snapshot: null,
    }
  }

  const runAiTab = async (tabId, extra = {}) => {
    setAiLoading(true)
    setAiError('')
    try {
      const target = resolveAiTarget(extra?.id)
      setAiTargetNote(target)
      if (tabId === 'analyze') {
        const res = await notesAIService.analyze(target)
        setAiAnalysis(res)
      } else if (tabId === 'learn') {
        const res = await notesAIService.transformToLearning(target)
        setAiLearning(res)
        setAiFlashcardIndex(0)
        setAiFlashcardFlipped(false)
        setAiQuizAnswers({})
        setAiQuizRevealed(false)
      } else if (tabId === 'blindspots') {
        const res = await notesAIService.blindSpots(target, aiAnalysis || null)
        setAiBlindSpots(res)
      } else if (tabId === 'explain') {
        const q = extra?.question || aiExplainQuestion
        if (!q.trim()) {
          setAiError('Type a question about your notes first.')
          return
        }
        const res = await notesAIService.explainNote(target, q.trim())
        setAiExplainAnswer({ ...res, question: q })
      } else if (tabId === 'drawing') {
        const res = await notesAIService.explainDrawing(target)
        setAiDrawing(res)
      } else if (tabId === 'revision') {
        const minutes = Number(extra?.minutes || aiRevisionMinutes)
        setAiRevisionMinutes(minutes)
        const res = await notesAIService.revisionPlan(target, minutes, aiAnalysis || null)
        setAiRevision(res)
      } else if (tabId === 'grow') {
        const res = await notesAIService.knowledgeEvolution({ subject: filters.subject || null, meta: libraryMeta })
        setAiEvolution(res)
      }
    } catch (err) {
      setAiError(err.response?.data?.message || 'AI action failed — showing offline fallback instead.')
    } finally {
      setAiLoading(false)
    }
  }

  const runAllAiQuick = async () => {
    await runAiTab('analyze')
    await runAiTab('learn')
    await runAiTab('blindspots')
    await runAiTab('revision')
    await runAiTab('grow')
  }

  const currentAiTargetDisplay = aiTargetNote || selectedNote || notes[0] || null

  const handleView = async (note) => {
    try {
      const response = await notesService.getNoteById(note.id)
      setSelectedNote(response)
      setAiTargetNote({
        id: response.id,
        title: response.title,
        subject: response.subject,
        noteType: response.noteType || 'document',
        concepts: response.concepts,
        keywords: response.keywords,
        content: response.content,
        snapshot: response.snapshot || response.tldrawSnapshot || null,
      })
      await refreshMeta()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch note details.')
    }
  }

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  )

  const counts = libraryMeta?.counts || { total: notes.length, favorites: 0, bookmarks: 0, processing: 0 }
  const processedNotes = notes.filter((note) => note.status === 'processed')
  const focusTime = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`

  return (
    <div className="study-lab-page redesign-surface">
      <div className="study-lab-orbit study-lab-orbit-one" />
      <div className="study-lab-orbit study-lab-orbit-two" />
      <div className="relative mx-auto max-w-[1440px]">
        <header className="study-lab-header">
          <div>
            <span className="study-kicker"><Sparkles size={14} /> YOUR LEARNING DASHBOARD</span>
            <h1 className="study-lab-title">Make studying<br /><em>feel lighter.</em></h1>
            <p className="study-lab-intro">Bring one chapter. Leave with clarity, practice questions, and a plan for what to learn next.</p>
          </div>
          <div className="study-streak">
            <div className="study-streak-flame"><Zap size={22} fill="currentColor" /></div>
            <div><strong>Keep your spark</strong><span>Study a little today</span></div>
            <div className="study-streak-number">{Math.min(7, processedNotes.length)}<small> day streak</small></div>
          </div>
        </header>

        {error && (
          <div className="study-alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>
        )}

        <section className="study-hero-grid">
          <div
            className={`study-dropzone ${dragActive ? 'study-dropzone-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="study-dropzone-top"><span className="study-number">01</span><span className="study-pill">START HERE</span></div>
            <div className="study-upload-mark"><Upload size={26} /></div>
            <h2>Turn a chapter into<br /><span>a study session.</span></h2>
            <p>Drop a PDF, slides, or notes here. FirstStep will make the hard parts easier to see.</p>
            <button type="button" className="study-primary-action" onClick={() => document.getElementById('smart-notes-file-input').click()} disabled={uploading}>
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? 'Preparing your material...' : 'Bring in material'}
            </button>
            <p className="study-drop-hint">PDF · DOCX · TXT · images</p>
            <input id="smart-notes-file-input" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" />
          </div>

          <div className="study-plan-card">
            <div className="study-card-heading"><div><span className="study-number">02</span><p>YOUR NEXT MOVE</p></div><Compass size={22} /></div>
            {processedNotes[0] ? (
              <>
                <span className="study-label">CONTINUE LEARNING</span>
                <h2>{processedNotes[0].title}</h2>
                <p>{processedNotes[0].summary || 'Your material is ready for a clear summary and active recall.'}</p>
                <div className="study-progress-line"><span style={{ width: '38%' }} /></div>
                <div className="study-plan-meta"><span>38% explored</span><span>{processedNotes[0].estimatedStudyTime || 20} min read</span></div>
                <button type="button" className="study-outline-action" onClick={() => handleView(processedNotes[0])}>Open your study guide <ChevronRight size={17} /></button>
              </>
            ) : (
              <>
                <span className="study-label">YOUR FIRST SESSION</span>
                <h2>Start with one<br />small win.</h2>
                <p>Upload a chapter and we will turn it into a simple, active study path.</p>
                <button type="button" className="study-outline-action" onClick={() => document.getElementById('smart-notes-file-input').click()}>Choose your first chapter <ChevronRight size={17} /></button>
              </>
            )}
          </div>

          <div className="study-focus-card">
            <div className="study-card-heading"><div><span className="study-number">03</span><p>FOCUS ROOM</p></div><TimerReset size={22} /></div>
            <div className="study-timer">{focusTime}</div>
            <p className="study-focus-caption">A quiet 25 minutes. One concept at a time.</p>
            <button type="button" className="study-focus-button" onClick={() => setFocusRunning((running) => !running)}>{focusRunning ? 'Pause focus' : focusSeconds === 0 ? 'Start again' : 'Start focus'} <PlayCircle size={17} /></button>
            <button type="button" className="study-reset-button" onClick={() => { setFocusRunning(false); setFocusSeconds(25 * 60) }}>Reset timer</button>
          </div>
        </section>

        <section className="study-action-row">
          <div><span className="study-kicker study-kicker-dark">PICK YOUR ENERGY</span><h2>What do you need right now?</h2></div>
          <div className="study-action-buttons">
            <button type="button" onClick={() => { setAiTab('explain'); setAiExplainQuestion('Give me the big picture in three simple sentences.'); runAiTab('explain', { question: 'Give me the big picture in three simple sentences.' }) }}><MessageSquareText size={19} /><span><b>Make it clear</b><small>Ask your material a question</small></span><ChevronRight size={16} /></button>
            <button type="button" onClick={() => { setAiTab('learn'); runAiTab('learn') }}><Brain size={19} /><span><b>Test my memory</b><small>Build flashcards and a quiz</small></span><ChevronRight size={16} /></button>
            <button type="button" onClick={() => { setAiTab('revision'); runAiTab('revision', { minutes: 10 }) }}><Target size={19} /><span><b>Find my gaps</b><small>See what to revise next</small></span><ChevronRight size={16} /></button>
          </div>
        </section>

        <section className="study-canvas-bar">
          <div className="study-canvas-copy"><div className="study-canvas-icon"><Pencil size={20} /></div><div><span>THINK WITH YOUR HANDS</span><h2>Open your infinite canvas</h2><p>Sketch a mind map, connect ideas, and make the lesson yours.</p></div></div>
          <button type="button" onClick={() => setCanvasOpen((open) => !open)} className="study-canvas-button">{canvasOpen ? 'Close canvas' : 'Open tldraw canvas'} <ChevronRight size={17} /></button>
        </section>

        <AnimatePresence>
          {canvasOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
              <WhiteboardStudio onLibraryChanged={handleWhiteboardLibraryChanged} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{processingNote && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6"><ProcessingIndicator status={processingNote.status} progress={processingNote.progress} /></motion.div>}</AnimatePresence>

        <section className="study-library-section">
          <div className="study-section-heading"><div><span className="study-kicker">YOUR MATERIALS</span><h2>Keep learning</h2></div><div className="study-library-tools"><label><Search size={16} /><input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Find a chapter..." /></label><button type="button" onClick={() => setFilters(initialFilters)} title="Clear search"><RefreshCw size={16} /></button></div></div>
          {loading ? <div className="study-empty-state"><Loader2 className="animate-spin" size={22} /> Loading your learning shelf...</div> : notes.length === 0 ? <div className="study-empty-state"><FileText size={26} /><p>Your shelf is waiting for its first chapter.</p><button type="button" onClick={() => document.getElementById('smart-notes-file-input').click()} className="study-primary-action">Add material</button></div> : <motion.div layout className="study-material-grid">{notes.slice(0, 6).map((note) => <NoteCard key={note.id} note={note} onView={handleView} onDelete={handleDelete} onGenerate={handleGenerate} onToggleFlag={handleToggleFlag} />)}</motion.div>}
        </section>

        <div className="study-engine-drawer"><AILearningEnginePanel meta={libraryMeta} targetNote={currentAiTargetDisplay} tab={aiTab} setTab={setAiTab} loading={aiLoading} error={aiError} onRun={runAiTab} onRunAll={runAllAiQuick} analysis={aiAnalysis} learning={aiLearning} blindSpots={aiBlindSpots} explainAnswer={aiExplainAnswer} explainQuestion={aiExplainQuestion} setExplainQuestion={setAiExplainQuestion} drawing={aiDrawing} revision={aiRevision} revisionMinutes={aiRevisionMinutes} setRevisionMinutes={setAiRevisionMinutes} evolution={aiEvolution} flashcardIndex={aiFlashcardIndex} setFlashcardIndex={setAiFlashcardIndex} flashcardFlipped={aiFlashcardFlipped} setFlashcardFlipped={setAiFlashcardFlipped} quizAnswers={aiQuizAnswers} setQuizAnswers={setAiQuizAnswers} quizRevealed={aiQuizRevealed} setQuizRevealed={setAiQuizRevealed} /></div>
      </div>

      <AnimatePresence>
        {selectedNote && (
          <NoteDetailView note={selectedNote} onClose={() => setSelectedNote(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

const Stat = ({ icon: Icon, label, value }) => (
  <div className="rounded-[1.2rem] border border-white/75 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
    <Icon size={20} className="text-amber-700" />
    <p className="mt-3 text-2xl font-black text-stone-950">{value}</p>
    <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">{label}</p>
  </div>
)

const UploadPanel = ({ dragActive, uploading, uploadMeta, onDrag, onDrop, onFileSelect, onMetaChange }) => (
  <section
    className={`rounded-[1.5rem] border-2 border-dashed p-4 shadow-[0_18px_45px_rgba(96,66,35,0.1)] transition ${
      dragActive ? 'border-amber-400 bg-white scale-[1.01]' : 'border-white/80 bg-white/68'
    }`}
    onDragEnter={onDrag}
    onDragLeave={onDrag}
    onDragOver={onDrag}
    onDrop={onDrop}
  >
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
        <Upload size={22} className="text-amber-800" />
      </div>
      <div>
        <h2 className="font-black text-stone-950">Add material</h2>
        <p className="text-xs font-bold text-stone-500">PDF, DOCX, PPT, TXT, images</p>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <input
        value={uploadMeta.subject}
        onChange={(e) => onMetaChange((prev) => ({ ...prev, subject: e.target.value }))}
        placeholder="Subject"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
      />
      <input
        value={uploadMeta.folder}
        onChange={(e) => onMetaChange((prev) => ({ ...prev, folder: e.target.value }))}
        placeholder="Folder"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
      />
      <input
        value={uploadMeta.tags}
        onChange={(e) => onMetaChange((prev) => ({ ...prev, tags: e.target.value }))}
        placeholder="Tags, comma separated"
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
      />
    </div>
    <button
      className="organic-button mt-4 w-full"
      onClick={() => document.getElementById('smart-notes-file-input').click()}
      disabled={uploading}
      type="button"
    >
      {uploading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
      {uploading ? 'Preparing...' : 'Choose file'}
    </button>
    <input
      id="smart-notes-file-input"
      type="file"
      className="hidden"
      onChange={onFileSelect}
      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
    />
  </section>
)

const LibraryFilters = ({ filters, meta, activeFilterCount, onChange, onClear }) => (
  <section className="rounded-[1.5rem] border border-white/75 bg-white/68 p-4 shadow-sm backdrop-blur-xl">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-black text-stone-950">Library</h2>
      {activeFilterCount > 0 && (
        <button type="button" onClick={onClear} className="text-xs font-black text-amber-700">
          Clear
        </button>
      )}
    </div>
    <FilterSelect icon={Folder} label="Folder" value={filters.folder} items={meta?.folders || []} onChange={(value) => onChange('folder', value)} />
    <FilterSelect icon={Sparkles} label="Subject" value={filters.subject} items={meta?.subjects || []} onChange={(value) => onChange('subject', value)} />
    <FilterSelect icon={Tags} label="Tag" value={filters.tag} items={meta?.tags || []} onChange={(value) => onChange('tag', value)} />
    <div className="mt-4 grid gap-2">
      <button
        type="button"
        onClick={() => onChange('favorite', filters.favorite ? '' : 'true')}
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition ${filters.favorite ? 'bg-amber-100 text-amber-800' : 'bg-white text-stone-600 hover:bg-stone-50'}`}
      >
        <Star size={16} />
        Favorites
      </button>
      <button
        type="button"
        onClick={() => onChange('bookmarked', filters.bookmarked ? '' : 'true')}
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition ${filters.bookmarked ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-600 hover:bg-stone-50'}`}
      >
        <BookMarked size={16} />
        Bookmarks
      </button>
    </div>
  </section>
)

const FilterSelect = ({ icon: Icon, label, value, items, onChange }) => (
  <label className="mb-3 block">
    <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
      <Icon size={14} />
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 outline-none focus:border-amber-400"
    >
      <option value="">All {label.toLowerCase()}s</option>
      {items.map((item) => (
        <option key={item} value={item}>{item}</option>
      ))}
    </select>
  </label>
)

const AI_TABS = [
  { id: 'analyze', label: 'Analyze', icon: Compass, stage: 'Understand' },
  { id: 'learn', label: 'Learn', icon: Brain, stage: 'Practice' },
  { id: 'blindspots', label: 'Gaps', icon: Target, stage: 'Detect Gaps' },
  { id: 'explain', label: 'Q&A', icon: MessageSquareText, stage: 'Understand' },
  { id: 'drawing', label: 'Drawing', icon: Image, stage: 'Connect' },
  { id: 'revision', label: 'Revise', icon: TimerReset, stage: 'Revise' },
  { id: 'grow', label: 'Grow', icon: TrendingUp, stage: 'Grow' },
]

const AILearningEnginePanel = ({
  meta,
  targetNote,
  tab,
  setTab,
  loading,
  error,
  onRun,
  onRunAll,
  analysis,
  learning,
  blindSpots,
  explainAnswer,
  explainQuestion,
  setExplainQuestion,
  drawing,
  revision,
  revisionMinutes,
  setRevisionMinutes,
  evolution,
  flashcardIndex,
  setFlashcardIndex,
  flashcardFlipped,
  setFlashcardFlipped,
  quizAnswers,
  setQuizAnswers,
  quizRevealed,
  setQuizRevealed,
}) => (
  <aside className="space-y-4">
    <section className="rounded-[1.5rem] border border-white/75 bg-white/68 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-orange-600" />
          <h2 className="font-black text-stone-950 text-sm">AI Learning Engine</h2>
        </div>
        <button
          type="button"
          onClick={onRunAll}
          className="soft-button !py-1.5 !px-3 text-[10px] font-black flex items-center gap-1 bg-orange-100 text-orange-900 border-orange-300"
        >
          <Zap size={12} /> Run All
        </button>
      </div>
      {targetNote && (
        <div className="mb-3 rounded-2xl bg-orange-50/70 border border-orange-200 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-orange-700 flex items-center gap-1">
            <FileText size={11} /> Current target
          </div>
          <p className="text-sm font-black text-stone-950 truncate mt-0.5">{targetNote.title}</p>
          <p className="text-[11px] font-bold text-stone-500">{targetNote.subject || 'General'} · {targetNote.noteType || 'document'}</p>
        </div>
      )}
      <div className="grid grid-cols-7 gap-1">
        {AI_TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              title={t.label + ' · ' + t.stage}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border transition ${
                active
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-400 shadow-sm scale-[1.02]'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-orange-50/60 hover:text-stone-950'
              }`}
            >
              <Icon size={14} />
              <span className="text-[9px] font-black tracking-wider uppercase">{t.label}</span>
            </button>
          )
        })}
      </div>
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-[11px] font-black text-orange-700 bg-orange-50/80 rounded-xl px-3 py-2">
          <RefreshCw size={13} className="animate-spin" /> Groq is generating structured JSON…
        </div>
      )}
      {error && !loading && (
        <div className="mt-3 text-[11px] font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2 border border-rose-200">{error}</div>
      )}
      <div className="mt-4">
        {tab === 'analyze' && <AnalyzeTab analysis={analysis} onRun={() => onRun('analyze')} />}
        {tab === 'learn' && (
          <LearnTab
            learning={learning}
            onRun={() => onRun('learn')}
            flashcardIndex={flashcardIndex}
            setFlashcardIndex={setFlashcardIndex}
            flashcardFlipped={flashcardFlipped}
            setFlashcardFlipped={setFlashcardFlipped}
            quizAnswers={quizAnswers}
            setQuizAnswers={setQuizAnswers}
            quizRevealed={quizRevealed}
            setQuizRevealed={setQuizRevealed}
          />
        )}
        {tab === 'blindspots' && <BlindSpotsTab blindSpots={blindSpots} analysis={analysis} onRun={() => onRun('blindspots')} />}
        {tab === 'explain' && (
          <ExplainTab
            explainAnswer={explainAnswer}
            explainQuestion={explainQuestion}
            setExplainQuestion={setExplainQuestion}
            onRun={(q) => onRun('explain', { question: q })}
          />
        )}
        {tab === 'drawing' && <DrawingTab drawing={drawing} target={targetNote} onRun={() => onRun('drawing')} />}
        {tab === 'revision' && (
          <RevisionTab
            revision={revision}
            minutes={revisionMinutes}
            setMinutes={setRevisionMinutes}
            onRun={(m) => onRun('revision', { minutes: m })}
          />
        )}
        {tab === 'grow' && <GrowTab evolution={evolution} meta={meta} onRun={() => onRun('grow')} />}
      </div>
    </section>
  </aside>
)

const EmptyPanelCTA = ({ title, desc, button, onClick, icon: Icon = Beaker }) => (
  <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-center">
    <div className="h-10 w-10 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm mb-2">
      <Icon size={18} />
    </div>
    <h3 className="text-sm font-black text-stone-950">{title}</h3>
    <p className="text-[11px] text-stone-500 font-semibold mt-1 leading-relaxed">{desc}</p>
    <button
      type="button"
      onClick={onClick}
      className="organic-button mt-3 !py-2 !px-4 !text-xs font-black"
    >
      {button}
    </button>
  </div>
)

const AnalyzeTab = ({ analysis, onRun }) => {
  if (!analysis) {
    return (
      <EmptyPanelCTA
        icon={Compass}
        title="Analyze My Notes"
        desc="Identify key concepts, strong vs weak concepts, missing concepts, and concept relationships."
        button="Analyze notes →"
        onClick={onRun}
      />
    )
  }
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 text-white p-3.5 border border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-300 flex items-center gap-1"><Compass size={11} /> Key Concepts ({analysis.keyConcepts?.length || 0})</span>
          <button type="button" onClick={onRun} className="text-[10px] font-black bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 border border-white/10 flex items-center gap-1"><RefreshCw size={10} /> Re-run</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(analysis.keyConcepts || []).slice(0, 12).map((c) => (
            <span key={c.name || c} className="text-[10px] font-black bg-white/10 border border-white/10 rounded-lg px-2 py-1" title={`Importance ${c.importance ?? '—'}`}>
              {c.name || c} <span className="opacity-60 font-bold">· {c.importance ?? '?'}</span>
            </span>
          ))}
        </div>
      </div>
      <TwoColumn
        leftTitle="Strong"
        leftIcon={CheckGreen}
        leftItems={(analysis.strongConcepts || []).slice(0, 5)}
        rightTitle="Weak / Unclear"
        rightIcon={AlertOrange}
        rightItems={(analysis.weakConcepts || []).map((w) => `${w.name || w}${w.whyWeak ? ' — ' + w.whyWeak : ''}`)}
      />
      {(analysis.missingConcepts || []).length > 0 && (
        <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1"><AlertOrange size={12} /> Missing Concepts</h3>
          <ul className="mt-2 space-y-1">
            {(analysis.missingConcepts || []).slice(0, 5).map((m, i) => (
              <li key={i} className="text-[11px] font-semibold text-stone-800 leading-snug flex items-start gap-1.5">
                <span className="text-rose-700 font-black shrink-0">·</span>
                <span><b>{m.name || m}</b>{m.whyMissing ? ` — ${m.whyMissing}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(analysis.relationships || []).length > 0 && (
        <div className="rounded-2xl bg-sky-50/80 border border-sky-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-sky-800 flex items-center gap-1"><Shuffle size={12} /> Concept Relationships</h3>
          <ul className="mt-2 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {(analysis.relationships || []).slice(0, 10).map((r, i) => (
              <li key={i} className="text-[11px] font-semibold text-stone-800 flex items-center gap-1.5 leading-snug">
                <ChevronRight size={11} className="text-sky-600 shrink-0" />
                <span><b>{r.from || r.source}</b> <span className="text-sky-700 font-black">—[{r.type || 'related'}]→</span> <b>{r.to || r.target}</b></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const CheckGreen = ({ size = 12 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const AlertOrange = ({ size = 12 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#ea580c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
)

const TwoColumn = ({ leftTitle, leftIcon: LeftI, leftItems, rightTitle, rightIcon: RightI, rightItems }) => (
  <div className="grid grid-cols-2 gap-2">
    <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-3">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1"><LeftI size={12} /> {leftTitle}</h3>
      <ul className="mt-1.5 space-y-1 max-h-[140px] overflow-y-auto">
        {leftItems && leftItems.length ? leftItems.slice(0, 6).map((item, i) => (
          <li key={i} className="text-[11px] font-semibold text-stone-800 leading-snug flex items-start gap-1.5">
            <span className="text-emerald-700 font-black shrink-0">✓</span> <span>{item.name || item}</span>
          </li>
        )) : <p className="text-[11px] text-stone-400 font-semibold pt-1">—</p>}
      </ul>
    </div>
    <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1"><RightI size={12} /> {rightTitle}</h3>
      <ul className="mt-1.5 space-y-1 max-h-[140px] overflow-y-auto">
        {rightItems && rightItems.length ? rightItems.slice(0, 6).map((item, i) => (
          <li key={i} className="text-[11px] font-semibold text-stone-800 leading-snug flex items-start gap-1.5">
            <span className="text-amber-700 font-black shrink-0">!</span> <span>{item}</span>
          </li>
        )) : <p className="text-[11px] text-stone-400 font-semibold pt-1">—</p>}
      </ul>
    </div>
  </div>
)

const LearnTab = ({
  learning,
  onRun,
  flashcardIndex,
  setFlashcardIndex,
  flashcardFlipped,
  setFlashcardFlipped,
  quizAnswers,
  setQuizAnswers,
  quizRevealed,
  setQuizRevealed,
}) => {
  if (!learning) {
    return (
      <EmptyPanelCTA
        icon={Brain}
        title="Notes → Learning"
        desc="Turn notes into flashcards, quiz, practice questions, teach-back challenges, revision summary, and coding drills."
        button="Generate learning set →"
        onClick={onRun}
      />
    )
  }
  const cards = learning.flashcards || []
  const curCard = cards[flashcardIndex] || null
  const quiz = learning.quiz || []
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-sky-200 p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 flex items-center gap-1"><Flag size={11} /> Revision Summary</span>
          <button type="button" onClick={onRun} className="text-[10px] font-black bg-white border border-stone-200 rounded-lg px-2 py-1 flex items-center gap-1 hover:bg-stone-50"><RefreshCw size={10} /> New</button>
        </div>
        <p className="text-[11px] font-semibold text-stone-800 leading-relaxed whitespace-pre-line">{learning.revisionSummary}</p>
      </div>
      {/* Flashcards */}
      {cards.length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1"><Layers size={11} /> Flashcards ({flashcardIndex + 1}/{cards.length})</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={flashcardIndex === 0} onClick={() => { setFlashcardIndex((i) => Math.max(0, i - 1)); setFlashcardFlipped(false) }} className="text-[10px] font-black bg-stone-100 hover:bg-stone-200 rounded-lg px-2 py-1 disabled:opacity-40">←</button>
              <button type="button" disabled={flashcardIndex >= cards.length - 1} onClick={() => { setFlashcardIndex((i) => Math.min(cards.length - 1, i + 1)); setFlashcardFlipped(false) }} className="text-[10px] font-black bg-stone-100 hover:bg-stone-200 rounded-lg px-2 py-1 disabled:opacity-40">→</button>
            </div>
          </div>
          <div
            onClick={() => setFlashcardFlipped((v) => !v)}
            className={`cursor-pointer select-none rounded-2xl p-4 border-2 min-h-[110px] flex items-center justify-center text-center transition ${
              flashcardFlipped
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-300'
                : 'bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-300'
            }`}
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">{flashcardFlipped ? 'Back · Concept: ' + (curCard?.concept || '') : 'Front · Click to flip'}</div>
              <p className={`font-black ${flashcardFlipped ? 'text-stone-950 text-[13px]' : 'text-stone-900 text-sm'} leading-relaxed`}>
                {flashcardFlipped ? curCard?.back : curCard?.front}
              </p>
              {curCard?.difficulty && (
                <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70 border border-stone-200 text-stone-500">
                  {curCard.difficulty}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Quiz */}
      {quiz.length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1"><Beaker size={11} /> Quiz ({quiz.length})</span>
            <button
              type="button"
              onClick={() => setQuizRevealed((v) => !v)}
              className={`text-[10px] font-black rounded-lg px-2.5 py-1 border ${
                quizRevealed ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-orange-100 text-orange-900 border-orange-300'
              }`}
            >
              {quizRevealed ? 'Hide answers' : 'Reveal answers'}
            </button>
          </div>
          <ol className="space-y-2.5">
            {quiz.map((q, qi) => {
              const chosen = quizAnswers[qi]
              const correct = chosen === q.correctIndex
              return (
                <li key={qi} className="rounded-xl bg-stone-50 border border-stone-150 p-3">
                  <p className="text-[12px] font-black text-stone-950 leading-snug">{qi + 1}. {q.question}</p>
                  <div className="mt-2 space-y-1">
                    {(q.options || []).map((opt, oi) => {
                      const isChosen = chosen === oi
                      const isRight = oi === q.correctIndex
                      const state = !quizRevealed
                        ? isChosen ? 'bg-orange-100 border-orange-400' : 'bg-white border-stone-200 hover:border-stone-300'
                        : isRight
                        ? 'bg-emerald-100 border-emerald-400'
                        : isChosen
                        ? 'bg-rose-100 border-rose-400'
                        : 'bg-white border-stone-200 opacity-75'
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => setQuizAnswers((a) => ({ ...a, [qi]: oi }))}
                          className={`w-full text-left text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${state}`}
                        >
                          <span className="font-black mr-1">{String.fromCharCode(65 + oi)}.</span> {opt}
                          {quizRevealed && isRight && <span className="float-right text-emerald-700 font-black">correct</span>}
                          {quizRevealed && isChosen && !isRight && <span className="float-right text-rose-700 font-black">your choice</span>}
                        </button>
                      )
                    })}
                  </div>
                  {quizRevealed && (
                    <p className="mt-2 text-[11px] font-semibold bg-sky-50 border border-sky-200 text-sky-900 rounded-lg p-2 leading-snug">
                      <b>Reasoning:</b> {q.explanation}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
      {/* Practice questions */}
      {(learning.practiceQuestions || []).length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1"><Pencil size={11} /> Practice Questions</h3>
          <ol className="space-y-2">
            {learning.practiceQuestions.slice(0, 3).map((pq, i) => (
              <li key={i} className="rounded-xl bg-violet-50 border border-violet-200 p-2.5">
                <p className="text-[11px] font-black text-violet-950 leading-snug">{i + 1}. {pq.question}</p>
                <p className="mt-1 text-[11px] font-semibold text-stone-600 leading-snug"><b>Ideal answer:</b> {pq.idealAnswer}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* Teach-back */}
      {(learning.teachBackChallenges || []).length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-sky-900 mb-2 flex items-center gap-1"><GraduationCap size={12} /> Teach-Back Challenge</h3>
          <ul className="space-y-1.5">
            {learning.teachBackChallenges.map((tc, i) => (
              <li key={i}>
                <p className="text-[11px] font-black text-stone-950 leading-snug">🎤 {tc.prompt}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-sky-900 leading-snug">Grading rubric: {tc.whatToLookFor}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Coding challenges */}
      {(learning.codingChallenges || []).length > 0 && (
        <div className="rounded-2xl bg-stone-900 text-white p-3.5 border border-stone-800">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-1"><FileText size={12} /> Coding Drills ({learning.codingChallenges[0].language || 'Code'})</h3>
          {learning.codingChallenges.map((cc, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-[12px] font-black">{i + 1}. {cc.title}</p>
              <p className="text-[11px] font-semibold text-stone-200 leading-snug">{cc.description}</p>
              <pre className="text-[11px] bg-black/40 rounded-lg p-2.5 text-stone-100 overflow-x-auto leading-relaxed whitespace-pre-wrap"><code>{cc.starter}</code></pre>
              <p className="text-[11px] text-emerald-200 font-semibold"><b>Expected:</b> {cc.expected}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BlindSpotsTab = ({ blindSpots, analysis, onRun }) => {
  if (!blindSpots) {
    return (
      <EmptyPanelCTA
        icon={Target}
        title="Blind Spot Detection"
        desc="Compare your notes against a typical complete topic structure and find likely knowledge gaps."
        button="Detect gaps →"
        onClick={onRun}
      />
    )
  }
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 border border-rose-200 p-3.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1"><Target size={11} /> Blind Spot Summary</span>
        <p className="text-[12px] font-black text-stone-950 leading-relaxed mt-1.5">{blindSpots.blindSpotSummary}</p>
      </div>
      {(blindSpots.knowledgeGaps || []).length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Knowledge Gaps</h3>
          <ul className="space-y-2">
            {blindSpots.knowledgeGaps.map((g, i) => (
              <li key={i} className="rounded-xl bg-stone-50 border border-stone-200 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black text-stone-950">{g.concept}</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    g.severity === 'high' ? 'bg-rose-100 text-rose-800' : g.severity === 'medium' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                  }`}>{g.severity || 'med'}</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-stone-700 leading-snug">Why: {g.why}</p>
                <p className="mt-1 text-[11px] font-bold text-emerald-800 leading-snug">✅ {g.recommendedAction}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(blindSpots.topicStructure || []).length > 0 && (
        <div className="rounded-2xl bg-sky-50/70 border border-sky-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-sky-900 mb-2 flex items-center gap-1"><Layers size={12} /> Expected Topic Structure</h3>
          <ol className="grid grid-cols-2 gap-1.5">
            {blindSpots.topicStructure.map((s, i) => (
              <li key={i} className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                s.category === 'core' ? 'bg-orange-100 text-orange-950'
                  : s.category === 'prerequisite' ? 'bg-sky-100 text-sky-900'
                  : s.category === 'advanced' ? 'bg-violet-100 text-violet-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                <span className="font-black">{s.order || i + 1}.</span>
                {s.name}
              </li>
            ))}
          </ol>
        </div>
      )}
      {(blindSpots.unmasteredFromNotes || []).length > 0 && (
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-900 mb-2">⚠️ Probably not solid yet</h3>
          <ul className="flex flex-wrap gap-1.5">
            {blindSpots.unmasteredFromNotes.map((c, i) => (
              <li key={i} className="text-[10px] font-black bg-white/80 border border-amber-300 rounded-lg px-2 py-1">{c}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis && (
        <button type="button" onClick={onRun} className="w-full soft-button !py-2 text-[11px] font-black flex items-center justify-center gap-1.5">
          <RefreshCw size={12} /> Re-run blind-spot check against latest analysis
        </button>
      )}
    </div>
  )
}

const ExplainTab = ({ explainAnswer, explainQuestion, setExplainQuestion, onRun }) => (
  <div className="space-y-3">
    <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquareText size={14} className="text-orange-600" />
        <h3 className="text-[12px] font-black text-stone-950">Ask about MY notes</h3>
      </div>
      <textarea
        rows={3}
        value={explainQuestion}
        onChange={(e) => setExplainQuestion(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) onRun(explainQuestion)
        }}
        placeholder="e.g. What's the difference between concept A and B? Walk me through step 3 of the example…"
        className="w-full rounded-xl border border-stone-300 bg-stone-50 p-2.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 leading-relaxed"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] font-bold text-stone-400">AI answers grounded in your notes.</p>
        <button type="button" onClick={() => onRun(explainQuestion)} className="organic-button !py-2 !px-4 !text-xs font-black">
          Ask Groq →
        </button>
      </div>
    </div>
    {explainAnswer && (
      <div className={`rounded-2xl border p-3.5 ${explainAnswer.requiresOutsideContext ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1">
            {explainAnswer.requiresOutsideContext ? <AlertTriangle size={11} className="text-amber-700" /> : <CheckCircle size={11} className="text-emerald-700" />}
            Q · {explainAnswer.question}
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/80 border border-stone-200 text-stone-500">Confidence {explainAnswer.confidence ?? '?'}</span>
        </div>
        <p className="text-[12px] font-semibold text-stone-900 leading-relaxed">{explainAnswer.answer}</p>
        {(explainAnswer.references || []).length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">References in notes:</p>
            <ul className="space-y-1">
              {explainAnswer.references.map((r, i) => (
                <li key={i} className="text-[10px] font-bold text-stone-600 bg-white/80 rounded-lg px-2 py-1 border border-stone-200 leading-snug">• {String(r).slice(0, 120)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )}
    {!explainAnswer && (
      <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3">
        <p className="text-[11px] font-bold text-stone-500">Sample questions you might ask:</p>
        <ul className="mt-1.5 space-y-1">
          {[
            "What's the big picture of my notes in 3 sentences?",
            'Which 3 concepts are most likely to appear on an exam?',
            'Walk me through the hardest worked example.',
          ].map((q) => (
            <li key={q}>
              <button type="button" onClick={() => { setExplainQuestion(q); onRun(q) }} className="text-left w-full text-[11px] font-semibold text-orange-800 hover:text-orange-700 bg-white rounded-lg px-2.5 py-1.5 border border-stone-200 hover:border-orange-300">
                ▸ {q}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)

const CheckCircle = ({ size = 12, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
)

const DrawingTab = ({ drawing, target, onRun }) => {
  if (!drawing) {
    return (
      <EmptyPanelCTA
        icon={Image}
        title="Explain My Drawing"
        desc="Analyzes your whiteboard/tldraw snapshot: what it represents, detected elements, detected/missing connections, and improvements."
        button={target?.noteType === 'whiteboard' ? 'Explain this drawing →' : 'Open a whiteboard & re-run →'}
        onClick={onRun}
      />
    )
  }
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-900 via-indigo-900 to-stone-950 text-white p-3.5 border border-indigo-800/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-violet-200 flex items-center gap-1"><Image size={11} /> Diagram Summary</span>
          <button type="button" onClick={onRun} className="text-[10px] font-black bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 border border-white/10 flex items-center gap-1"><RefreshCw size={10} /> Re-run</button>
        </div>
        <p className="text-[12px] font-semibold leading-relaxed text-indigo-50">{drawing.summary}</p>
      </div>
      <TwoColumn
        leftTitle="Elements Detected"
        leftIcon={Layers}
        leftItems={drawing.elementsDetected || []}
        rightTitle="Connections Detected"
        rightIcon={Shuffle}
        rightItems={drawing.connectionsDetected || []}
      />
      {(drawing.missingConnections || []).length > 0 && (
        <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-rose-900 mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Missing Connections / Draw These Next</h3>
          <ul className="space-y-1">
            {drawing.missingConnections.map((m, i) => (
              <li key={i} className="text-[11px] font-semibold text-stone-800 flex items-start gap-1.5 leading-snug">
                <span className="text-rose-700 font-black shrink-0">+</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(drawing.suggestedImprovements || []).length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1"><Sparkles size={12} /> Suggested Improvements</h3>
          <ul className="space-y-1.5">
            {drawing.suggestedImprovements.map((s, i) => (
              <li key={i} className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold flex items-start gap-1.5 leading-snug ${
                s.priority === 'high' ? 'bg-rose-50 border border-rose-200 text-rose-950'
                  : s.priority === 'medium' ? 'bg-amber-50 border border-amber-200 text-amber-950'
                  : 'bg-stone-50 border border-stone-200 text-stone-800'
              }`}>
                <span className="font-black shrink-0">{(s.priority || 'low')[0].toUpperCase()}</span>
                {s.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const RevisionTab = ({ revision, minutes, setMinutes, onRun }) => (
  <div className="space-y-3">
    <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-black text-stone-950 flex items-center gap-2"><TimerReset size={14} className="text-orange-600" /> Personalized Revision</h3>
        <button type="button" onClick={() => onRun(minutes)} className="organic-button !py-1.5 !px-3 !text-[11px] font-black">Generate plan →</button>
      </div>
      <p className="text-[11px] font-bold text-stone-500 mb-2">I have:</p>
      <div className="grid grid-cols-3 gap-1.5">
        {[5, 10, 20].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMinutes(m); setTimeout(() => onRun(m), 0) }}
            className={`rounded-xl py-2.5 text-[12px] font-black transition border ${
              minutes === m
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-400 shadow-sm scale-[1.02]'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-orange-50'
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
    </div>
    {revision && (
      <>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 border border-sky-200 p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-900 flex items-center gap-1"><PlayCircle size={11} /> {revision.totalMinutes ?? minutes}-Min Revision Plan</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/80 border border-stone-200 text-stone-500">Σ {revision.blocks?.reduce((s, b) => s + Number(b.minutes || 0), 0)} min</span>
          </div>
          <ol className="space-y-1.5 mt-2">
            {(revision.blocks || []).map((b, i) => (
              <li key={i} className="rounded-xl bg-white/80 border border-stone-150 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-stone-950 leading-snug truncate">{b.title}</p>
                      <p className="text-[10px] font-bold text-sky-700 flex flex-wrap gap-1 mt-0.5">
                        <span className="bg-sky-100 rounded px-1.5 py-0.5">{b.minutes ?? '?'} min</span>
                        <span className="bg-violet-100 text-violet-900 rounded px-1.5 py-0.5">{b.technique || 'Active Recall'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-stone-800 leading-snug">{b.activity}</p>
                {(b.focusConcepts || []).length > 0 && (
                  <p className="mt-1 text-[10px] font-black text-orange-800 flex flex-wrap gap-1 items-center">
                    <span>🎯</span>
                    {b.focusConcepts.map((c, j) => (
                      <span key={j} className="bg-white rounded px-1.5 py-0.5 border border-orange-200">{c}</span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
        {(revision.priorityWeakConcepts || []).length > 0 && (
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1"><AlertOrange size={12} /> Focus weak concepts</h3>
            <p className="text-[11px] font-semibold text-stone-800 leading-snug">{revision.whyFocused}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {revision.priorityWeakConcepts.map((c, i) => (
                <li key={i} className="text-[10px] font-black bg-white rounded-lg px-2 py-1 border border-amber-300 text-amber-900">{c}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    )}
    {!revision && (
      <EmptyPanelCTA icon={TimerReset} title="No revision plan yet" desc="Pick a time budget above and Groq will build a plan around your weak concepts." button={`Build ${minutes}-min plan`} onClick={() => onRun(minutes)} />
    )}
  </div>
)

const GrowTab = ({ evolution, meta, onRun }) => {
  const data = evolution?.snapshots || []
  const growth = evolution?.growth || { startingCoverage: 0, latestCoverage: 0, startingConfidence: 0, latestConfidence: 0, notesAnalyzed: 0 }
  const top = evolution?.topConcepts || []
  const maxCoverage = Math.max(10, ...data.map((d) => d.coverage || 0), growth.latestCoverage || 0)
  const width = (v) => Math.max(2, Math.round((v / maxCoverage) * 100))
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-stone-950 text-white p-3.5 border border-emerald-800/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1"><TrendingUp size={11} /> Knowledge Evolution</span>
          <button type="button" onClick={onRun} className="text-[10px] font-black bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 border border-white/10 flex items-center gap-1"><RefreshCw size={10} /> Refresh</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Coverage Δ" before={growth.startingCoverage} after={growth.latestCoverage} />
          <Metric label="Confidence Δ" before={growth.startingConfidence} after={growth.latestConfidence} />
          <Metric label="Notes analyzed" before={0} after={growth.notesAnalyzed} plain />
        </div>
      </div>
      {data.length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1"><BarChart3 size={12} /> Coverage progress</h3>
          <ul className="space-y-1.5">
            {data.slice(-10).map((s, i) => (
              <li key={i} className="grid grid-cols-[72px_minmax(0,1fr)_42px] items-center gap-2">
                <span className="text-[10px] font-black text-stone-500 font-mono">{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <div className="h-3.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-500"
                    style={{ width: `${width(s.coverage)}%` }}
                  />
                </div>
                <span className="text-[11px] font-black text-stone-800 text-right tabular-nums">{s.coverage ?? '?'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {top.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 p-3.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-orange-900 mb-2 flex items-center gap-1"><Layers size={12} /> Top concepts you're growing</h3>
          <ul className="space-y-1.5">
            {top.slice(0, 12).map((c, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_60px] items-center gap-2">
                <span className="text-[11px] font-semibold truncate bg-white/80 rounded-lg px-2 py-1 border border-orange-200">{c.name}</span>
                <div className="flex items-center justify-end gap-1 text-[10px] font-black text-orange-800">
                  {[...Array(Math.min(5, c.occurrences || 1))].map((_, k) => (
                    <span key={k} className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Recent Activity + Recently Opened (previous StudyContextPanel info preserved inside GROW) */}
      <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Clock3 size={13} className="text-amber-700" />
          <h3 className="text-[12px] font-black text-stone-950">Recent Activity</h3>
        </div>
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
          {meta?.recentActivity?.length ? meta.recentActivity.slice(0, 6).map((activity) => (
            <div key={activity.id} className="rounded-xl bg-stone-50 p-2 border border-stone-150">
              <p className="text-[11px] font-black text-stone-800 truncate">{activity.title}</p>
              <p className="text-[10px] font-bold text-stone-500">{activity.label || activity.type}</p>
            </div>
          )) : (
            <p className="text-[11px] font-bold leading-6 text-stone-500">Your uploads, edits, bookmarks, and AI runs will show here.</p>
          )}
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-stone-200 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <BookMarked size={13} className="text-emerald-700" />
          <h3 className="text-[12px] font-black text-stone-950">Recently Opened</h3>
        </div>
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
          {meta?.recentlyOpened?.length ? meta.recentlyOpened.slice(0, 5).map((note) => (
            <div key={note.id} className="rounded-xl bg-stone-50 p-2 border border-stone-150">
              <p className="truncate text-[11px] font-black text-stone-800">{note.title}</p>
              <p className="text-[10px] font-bold text-stone-500">{note.subject || 'General'}</p>
            </div>
          )) : (
            <p className="text-[11px] font-bold leading-6 text-stone-500">Open a note to build your quick-return list.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const Metric = ({ label, before, after, plain }) => {
  const b = Number(before) || 0
  const a = Number(after) || 0
  const delta = a - b
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-stone-300">{label}</p>
      <p className="text-lg font-black mt-0.5 tabular-nums">{plain ? a : `${a}%`}</p>
      {!plain && (
        <p className={`text-[10px] font-black ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
        </p>
      )}
    </div>
  )
}

export default SmartNotesPage
