import { motion } from 'framer-motion'
import {
  BookMarked,
  Brain,
  Eye,
  FileText,
  Folder,
  MoreHorizontal,
  Sparkles,
  Star,
  Tags,
  Trash2,
} from 'lucide-react'

const statusStyles = {
  processing: 'bg-amber-100 text-amber-800 border-amber-200',
  processed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-rose-100 text-rose-800 border-rose-200',
}

const formatDate = (value) => {
  if (!value) return 'Not opened yet'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

const NoteCard = ({ note, onView, onDelete, onGenerate, onToggleFlag }) => {
  const isProcessed = note.status === 'processed'

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group flex min-h-[19rem] flex-col rounded-[1.35rem] border border-white/75 bg-white/78 p-4 shadow-[0_18px_45px_rgba(96,66,35,0.11)] backdrop-blur-xl transition hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-emerald-100">
          <FileText size={22} className="text-stone-800" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onView(note)}
              className="min-w-0 flex-1 text-left"
              title={`Open ${note.title}`}
            >
              <h3 className="truncate text-base font-black text-stone-950">{note.title}</h3>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleFlag(note.id, { isFavorite: !note.isFavorite })}
                className={`rounded-full p-2 transition ${note.isFavorite ? 'bg-amber-100 text-amber-700' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'}`}
                title={note.isFavorite ? 'Remove favorite' : 'Add favorite'}
                aria-label={note.isFavorite ? 'Remove favorite' : 'Add favorite'}
              >
                <Star size={16} fill={note.isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => onToggleFlag(note.id, { isBookmarked: !note.isBookmarked })}
                className={`rounded-full p-2 transition ${note.isBookmarked ? 'bg-emerald-100 text-emerald-700' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'}`}
                title={note.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                aria-label={note.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <BookMarked size={16} fill={note.isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500">
            <span className={`rounded-full border px-2.5 py-1 ${statusStyles[note.status] || statusStyles.processing}`}>
              {note.status || 'processing'}
            </span>
            <span>{formatDate(note.updatedAt || note.date)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm font-semibold leading-6 text-stone-600">
        {note.summary || 'AI analysis is preparing this material for summaries, concepts, flashcards, and practice questions.'}
      </p>

      <div className="mt-4 grid gap-2 text-xs font-bold text-stone-600">
        <div className="flex min-w-0 items-center gap-2">
          <Folder size={14} className="shrink-0 text-stone-400" />
          <span className="truncate">{note.folder || 'Inbox'}</span>
          <span className="text-stone-300">/</span>
          <span className="truncate">{note.subject || 'General'}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Tags size={14} className="shrink-0 text-stone-400" />
          <span className="truncate">{note.tags?.length ? note.tags.slice(0, 3).join(', ') : 'No tags yet'}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(note.keywords || []).slice(0, 4).map((keyword) => (
          <span key={keyword} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
            {keyword}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        {isProcessed ? (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => onView(note)} className="soft-button rounded-2xl px-3" title="Open note">
              <Eye size={16} />
              Open
            </button>
            <button type="button" onClick={() => onGenerate(note.id, 'flashcards')} className="soft-button rounded-2xl px-3" title="Generate flashcards">
              <Brain size={16} />
              Cards
            </button>
            <button type="button" onClick={() => onGenerate(note.id, 'mindmap')} className="soft-button rounded-2xl px-3" title="Generate mind map">
              <Sparkles size={16} />
              Map
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => onView(note)} className="soft-button w-full rounded-2xl" title="Open note status">
            <MoreHorizontal size={16} />
            Check status
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(note.id)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </motion.article>
  )
}

export default NoteCard
