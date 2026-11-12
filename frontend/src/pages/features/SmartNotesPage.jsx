import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookMarked,
  ChevronRight,
  Compass,
  FileText,
  Folder,
  Library,
  Loader2,
  Pencil,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tags,
  TimerReset,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { notesService } from '../../services/notesService'
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
      const noteId = response.noteId
      setProcessingNote({
        id: noteId,
        title: file.name,
        status: 'processing',
      })
      pollNoteProcessing(noteId)
      await fetchLibrary()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try another file.')
      setUploading(false)
    }
  }

  const pollNoteProcessing = (noteId) => {
    let tick = 0
    const maxTicks = 240

    const interval = setInterval(async () => {
      tick += 1
      try {
        const note = await notesService.getNoteById(noteId)
        if (note.status === 'processed') {
          clearInterval(interval)
          setProcessingNote(null)
          setUploading(false)
          await fetchLibrary()
          return
        }
        if (note.status === 'failed') {
          clearInterval(interval)
          setProcessingNote(null)
          setUploading(false)
          setError(note.processingWarning || 'Processing failed. Check that the AI document processing service is running, then retry the upload.')
          await fetchLibrary()
          return
        }
      } catch (_err) {
        // keep polling until timeout
      }

      if (tick >= maxTicks) {
        clearInterval(interval)
        setProcessingNote(null)
        setUploading(false)
        await fetchLibrary()
      }
    }, 2000)
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

  const handleView = async (note) => {
    try {
      const response = await notesService.getNoteById(note.id)
      setSelectedNote(response)
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
                <div className="study-plan-meta"><span>{processedNotes[0].estimatedStudyTime || 20} min read</span></div>
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

export default SmartNotesPage
