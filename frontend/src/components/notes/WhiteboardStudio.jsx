import { useCallback, useEffect, useRef, useState } from 'react'
import { FilePlus2, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { Tldraw, getSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { notesService } from '../../services/notesService'

const SAVE_DELAY = 1200

const WhiteboardStudio = ({ onLibraryChanged }) => {
  const [whiteboards, setWhiteboards] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [error, setError] = useState('')
  const editorRef = useRef(null)
  const saveTimerRef = useRef(null)
  const savingRef = useRef(false)
  const pendingSaveRef = useRef(null)
  const activeNoteIdRef = useRef(null)
  const mountedRef = useRef(false)
  const creatingInitialRef = useRef(false)
  const cleanupEditorRef = useRef(null)

  const loadWhiteboards = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await notesService.getWhiteboards()
      let nextNotes = response.notes || []

      if (!nextNotes.length && !mountedRef.current && !creatingInitialRef.current) {
        creatingInitialRef.current = true
        try {
          const created = await notesService.createWhiteboard('Untitled Note')
          nextNotes = [created.note]
          onLibraryChanged?.()
        } finally {
          creatingInitialRef.current = false
        }
      }

      setWhiteboards(nextNotes)
      setActiveNote((current) => {
        if (current && nextNotes.some((note) => note.id === current.id)) return current
        return nextNotes[0] || null
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your notebook.')
    } finally {
      mountedRef.current = true
      setLoading(false)
    }
  }, [onLibraryChanged])

  useEffect(() => {
    activeNoteIdRef.current = activeNote?.id || null
    setSaveStatus('Saved')
  }, [activeNote?.id])

  const persistLatest = useCallback(async () => {
    const pending = pendingSaveRef.current
    if (!pending?.snapshot || !pending.noteId) return

    if (savingRef.current) return

    savingRef.current = true
    pendingSaveRef.current = null
    setSaveStatus('Saving...')

    try {
      const response = await notesService.saveWhiteboard(pending.noteId, pending.snapshot)
      setWhiteboards((current) => current.map((note) => note.id === pending.noteId ? response.note : note))
      setActiveNote((current) => current?.id === pending.noteId ? { ...response.note, snapshot: pending.snapshot } : current)
      setSaveStatus('Saved')
      onLibraryChanged?.()
    } catch (err) {
      setSaveStatus('Save failed')
      setError(err.response?.data?.message || 'Could not save this notebook page.')
    } finally {
      savingRef.current = false
      if (pendingSaveRef.current) {
        persistLatest()
      }
    }
  }, [onLibraryChanged])

  useEffect(() => {
    loadWhiteboards()
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      cleanupEditorRef.current?.()
      persistLatest()
    }
  }, [loadWhiteboards, persistLatest])

  const queueSave = useCallback((editor) => {
    const noteId = activeNoteIdRef.current
    if (!noteId) return
    pendingSaveRef.current = {
      noteId,
      snapshot: getSnapshot(editor.store),
    }
    setSaveStatus('Saving...')

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persistLatest()
    }, SAVE_DELAY)
  }, [persistLatest])

  const handleMount = useCallback((editor) => {
    cleanupEditorRef.current?.()
    editorRef.current = editor
    cleanupEditorRef.current = editor.store.listen(() => queueSave(editor), {
      source: 'user',
      scope: 'document',
    })
  }, [persistLatest, queueSave])

  const handleCreate = async () => {
    const title = prompt('Name this note', 'Untitled Note')
    if (title === null) return

    setError('')
    try {
      const response = await notesService.createWhiteboard(title)
      setWhiteboards((current) => [response.note, ...current])
      setActiveNote(response.note)
      onLibraryChanged?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create a new note.')
    }
  }

  const handleRename = async () => {
    if (!activeNote) return
    const title = prompt('Rename this note', activeNote.title)
    if (title === null || !title.trim()) return

    setError('')
    try {
      const updated = await notesService.updateNote(activeNote.id, { title })
      const nextNote = { ...activeNote, title: updated.title }
      setActiveNote(nextNote)
      setWhiteboards((current) => current.map((note) => note.id === activeNote.id ? { ...note, title: updated.title } : note))
      onLibraryChanged?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not rename this note.')
    }
  }

  const handleDelete = async () => {
    if (!activeNote || !confirm(`Delete "${activeNote.title}"?`)) return

    setError('')
    try {
      await notesService.deleteNote(activeNote.id)
      const nextNotes = whiteboards.filter((note) => note.id !== activeNote.id)
      setWhiteboards(nextNotes)
      setActiveNote(nextNotes[0] || null)
      onLibraryChanged?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this note.')
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-white/75 bg-white/72 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-amber-700">
            <Pencil size={16} />
            Notes Studio
          </div>
          <h2 className="mt-1 text-2xl font-black text-stone-950">Digital Notebook</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusLabel status={saveStatus} />
          <button type="button" onClick={handleRename} disabled={!activeNote} className="rounded-full bg-white px-3 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50" aria-label="Rename note">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={handleDelete} disabled={!activeNote} className="rounded-full bg-white px-3 py-2 text-sm font-black text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50" aria-label="Delete note">
            <Trash2 size={15} />
          </button>
          <button type="button" onClick={handleCreate} className="organic-button">
            <Plus size={18} />
            New Note
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {whiteboards.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => setActiveNote(note)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
              activeNote?.id === note.id
                ? 'bg-stone-950 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            {note.title}
          </button>
        ))}
      </div>

      <div className="relative mt-3 h-[34rem] min-h-[28rem] overflow-hidden rounded-[1rem] border border-stone-200 bg-white shadow-inner">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-3 font-black text-stone-600">
            <Loader2 className="animate-spin" size={20} />
            Opening your notebook...
          </div>
        ) : activeNote ? (
          activeNote.snapshot ? (
            <Tldraw key={activeNote.id} snapshot={activeNote.snapshot} onMount={handleMount} />
          ) : (
            <Tldraw key={activeNote.id} onMount={handleMount} />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FilePlus2 size={34} className="text-amber-700" />
            <p className="mt-3 text-lg font-black text-stone-950">Create your first notebook page.</p>
            <button type="button" onClick={handleCreate} className="organic-button mt-4">
              <Plus size={18} />
              New Note
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

const StatusLabel = ({ status }) => {
  const saving = status === 'Saving...'
  const failed = status === 'Save failed'

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
      failed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
    }`}>
      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
      {status}
    </span>
  )
}

export default WhiteboardStudio
