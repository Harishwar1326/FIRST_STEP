import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookMarked,
  Clock3,
  FileText,
  Folder,
  Library,
  Loader2,
  Search,
  Sparkles,
  Star,
  Tags,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { notesService } from '../../services/notesService'
import NoteCard from '../../components/notes/NoteCard'
import ProcessingIndicator from '../../components/notes/ProcessingIndicator'
import NoteDetailView from '../../components/notes/NoteDetailView'

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

  return (
    <div className="world-page bg-[linear-gradient(135deg,#fff7e6_0%,#eef9ee_48%,#e9f4ff_100%)]">
      <div className="relative">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="story-label">
              <Wand2 size={14} />
              AI Learning Workspace
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">Smart Notes Studio</h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-stone-600">
              Upload study materials, organize them by subject, and turn every document into searchable summaries, revision sheets, flashcards, quizzes, and mind maps.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
            <Stat icon={Library} label="Documents" value={counts.total} />
            <Stat icon={Star} label="Favorites" value={counts.favorites} />
            <Stat icon={BookMarked} label="Bookmarks" value={counts.bookmarks} />
            <Stat icon={Loader2} label="Processing" value={counts.processing} />
          </div>
        </header>

        {error && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="rounded-full p-1 hover:bg-rose-100" aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_18rem]">
          <aside className="space-y-4">
            <UploadPanel
              dragActive={dragActive}
              uploading={uploading}
              uploadMeta={uploadMeta}
              onDrag={handleDrag}
              onDrop={handleDrop}
              onFileSelect={handleFileSelect}
              onMetaChange={setUploadMeta}
            />
            <LibraryFilters
              filters={filters}
              meta={libraryMeta}
              activeFilterCount={activeFilterCount}
              onChange={updateFilter}
              onClear={clearFilters}
            />
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 rounded-[1.35rem] border border-white/75 bg-white/68 p-3 shadow-sm backdrop-blur-xl md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Search notes, concepts, tags, summaries..."
                  className="w-full rounded-full border border-stone-200 bg-white px-11 py-3 text-sm font-semibold text-stone-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 outline-none focus:border-amber-400"
              >
                <option value="">Newest first</option>
                <option value="recently-opened">Recently opened</option>
              </select>
            </div>

            <AnimatePresence>
              {processingNote && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-5">
                  <ProcessingIndicator status={processingNote.status} progress={processingNote.progress} />
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="floating-island flex items-center justify-center gap-3 py-12 font-black text-stone-600">
                <Loader2 className="animate-spin" size={20} />
                Opening your studio shelf...
              </div>
            ) : notes.length === 0 ? (
              <div className="floating-island flex min-h-[24rem] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <FileText size={28} className="text-amber-800" />
                </div>
                <p className="mt-4 text-lg font-black text-stone-950">No notes match this view.</p>
                <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-stone-600">
                  Upload a chapter or clear filters to see your full document library.
                </p>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="organic-button mt-5">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onView={handleView}
                    onDelete={handleDelete}
                    onGenerate={handleGenerate}
                    onToggleFlag={handleToggleFlag}
                  />
                ))}
              </motion.div>
            )}
          </section>

          <StudyContextPanel meta={libraryMeta} />
        </div>
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

const StudyContextPanel = ({ meta }) => (
  <aside className="space-y-4">
    <section className="rounded-[1.5rem] border border-white/75 bg-white/68 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Clock3 size={18} className="text-amber-700" />
        <h2 className="font-black text-stone-950">Recent Activity</h2>
      </div>
      <div className="mt-4 space-y-3">
        {meta?.recentActivity?.length ? meta.recentActivity.slice(0, 6).map((activity) => (
          <div key={activity.id} className="rounded-2xl bg-white p-3">
            <p className="text-sm font-black text-stone-800">{activity.title}</p>
            <p className="mt-1 text-xs font-bold text-stone-500">{activity.label || activity.type}</p>
          </div>
        )) : (
          <p className="text-sm font-bold leading-6 text-stone-500">Your uploads, edits, bookmarks, and openings will show here.</p>
        )}
      </div>
    </section>
    <section className="rounded-[1.5rem] border border-white/75 bg-white/68 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <BookMarked size={18} className="text-emerald-700" />
        <h2 className="font-black text-stone-950">Recently Opened</h2>
      </div>
      <div className="mt-4 space-y-3">
        {meta?.recentlyOpened?.length ? meta.recentlyOpened.slice(0, 5).map((note) => (
          <div key={note.id} className="rounded-2xl bg-white p-3">
            <p className="truncate text-sm font-black text-stone-800">{note.title}</p>
            <p className="mt-1 text-xs font-bold text-stone-500">{note.subject || 'General'}</p>
          </div>
        )) : (
          <p className="text-sm font-bold leading-6 text-stone-500">Open a note to build your quick return list.</p>
        )}
      </div>
    </section>
  </aside>
)

export default SmartNotesPage
