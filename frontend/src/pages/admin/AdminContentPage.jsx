import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Edit3, FileText, Save, Trash2 } from 'lucide-react'
import { adminService } from '../../services/adminService'

const emptyLesson = { title: '', subject: 'Programming', chapter: 'General', content: '', videoUrl: '', order: 0, estimatedStudyTime: 20 }
const emptyNote = { title: '', subject: 'General', content: '', summary: '', tags: '' }

const AdminContentPage = () => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('lessons')
  const [lessonForm, setLessonForm] = useState(emptyLesson)
  const [noteForm, setNoteForm] = useState(emptyNote)
  const [editingLessonId, setEditingLessonId] = useState('')
  const [editingNoteId, setEditingNoteId] = useState('')

  const lessonsQuery = useQuery({ queryKey: ['admin-lessons'], queryFn: adminService.getLessons })
  const notesQuery = useQuery({ queryKey: ['admin-notes'], queryFn: adminService.getNotes })

  const createLesson = useMutation({
    mutationFn: adminService.createLesson,
    onSuccess: () => {
      setLessonForm(emptyLesson)
      setEditingLessonId('')
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
    },
  })
  const updateLesson = useMutation({
    mutationFn: ({ id, payload }) => adminService.updateLesson(id, payload),
    onSuccess: () => {
      setLessonForm(emptyLesson)
      setEditingLessonId('')
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
    },
  })
  const deleteLesson = useMutation({
    mutationFn: adminService.deleteLesson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-lessons'] }),
  })
  const createNote = useMutation({
    mutationFn: adminService.createNote,
    onSuccess: () => {
      setNoteForm(emptyNote)
      setEditingNoteId('')
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] })
    },
  })
  const updateNote = useMutation({
    mutationFn: ({ id, payload }) => adminService.updateNote(id, payload),
    onSuccess: () => {
      setNoteForm(emptyNote)
      setEditingNoteId('')
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] })
    },
  })
  const deleteNote = useMutation({
    mutationFn: adminService.deleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notes'] }),
  })

  return (
    <div className="world-page bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_48%,#f7fee7_100%)]">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="story-label">Admin Content</span>
          <h1 className="mt-3 text-4xl font-black text-stone-950">Lessons and notes</h1>
        </div>
        <div className="flex rounded-full bg-white/70 p-1">
          {[
            ['lessons', BookOpen, 'Lessons'],
            ['notes', FileText, 'Notes'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${tab === key ? 'bg-stone-950 text-white' : 'text-stone-600'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'lessons' ? (
        <ContentPanel
          type="lesson"
          form={lessonForm}
          setForm={setLessonForm}
          editingId={editingLessonId}
          fields={['title', 'subject', 'chapter', 'content', 'videoUrl', 'order', 'estimatedStudyTime']}
          onSave={() => editingLessonId ? updateLesson.mutate({ id: editingLessonId, payload: lessonForm }) : createLesson.mutate(lessonForm)}
          onCancel={() => {
            setLessonForm(emptyLesson)
            setEditingLessonId('')
          }}
          rows={lessonsQuery.data?.lessons || []}
          onEdit={(row) => {
            setEditingLessonId(row.id || row._id)
            setLessonForm({
              title: row.title || '',
              subject: row.subject || 'Programming',
              chapter: row.chapter || 'General',
              content: row.content || '',
              videoUrl: row.videoUrl || '',
              order: row.order || 0,
              estimatedStudyTime: row.estimatedStudyTime || 20,
            })
          }}
          onDelete={(id) => deleteLesson.mutate(id)}
          pending={createLesson.isPending || updateLesson.isPending}
        />
      ) : (
        <ContentPanel
          type="note"
          form={noteForm}
          setForm={setNoteForm}
          editingId={editingNoteId}
          fields={['title', 'subject', 'content', 'summary', 'tags']}
          onSave={() => editingNoteId ? updateNote.mutate({ id: editingNoteId, payload: noteForm }) : createNote.mutate(noteForm)}
          onCancel={() => {
            setNoteForm(emptyNote)
            setEditingNoteId('')
          }}
          rows={notesQuery.data?.notes || []}
          onEdit={(row) => {
            setEditingNoteId(row.id || row._id)
            setNoteForm({
              title: row.title || '',
              subject: row.subject || 'General',
              content: row.content || '',
              summary: row.summary || '',
              tags: (row.tags || []).join(', '),
            })
          }}
          onDelete={(id) => deleteNote.mutate(id)}
          pending={createNote.isPending || updateNote.isPending}
        />
      )}
    </div>
  )
}

const ContentPanel = ({ type, form, setForm, editingId, fields, onSave, onCancel, rows, onEdit, onDelete, pending }) => (
  <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <section className="floating-island h-fit">
      <h2 className="mb-4 text-2xl font-black text-stone-950">{editingId ? 'Edit' : 'Add'} {type}</h2>
      <div className="space-y-3">
        {fields.map((field) => (
          <label key={field} className="block">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">{field}</span>
            {field === 'content' || field === 'summary' ? (
              <textarea
                value={form[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                className="mt-1 min-h-24 w-full rounded-[1rem] border border-white bg-white/80 p-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-orange-100"
              />
            ) : (
              <input
                value={form[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                className="mt-1 w-full rounded-full border border-white bg-white/80 px-4 py-2 text-sm font-semibold outline-none focus:ring-4 focus:ring-orange-100"
              />
            )}
          </label>
        ))}
        <button onClick={onSave} disabled={pending || !form.title} className="organic-button w-full">
          <Save size={17} />
          {editingId ? 'Update' : 'Save'} {type}
        </button>
        {editingId ? (
          <button onClick={onCancel} className="soft-button w-full justify-center" type="button">
            Cancel edit
          </button>
        ) : null}
      </div>
    </section>

    <section className="floating-island">
      <h2 className="mb-4 text-2xl font-black text-stone-950">Existing {type}s</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id || row._id} className="flex flex-col justify-between gap-3 rounded-[1.2rem] bg-white/70 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-black text-stone-950">{row.title}</p>
              <p className="text-sm font-semibold text-stone-500">{row.subject || row.chapter || 'General'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(row)} className="soft-button">
                <Edit3 size={16} />
                Edit
              </button>
              <button onClick={() => onDelete(row.id || row._id)} className="soft-button text-red-700">
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
        {!rows.length ? <p className="font-bold text-stone-500">No {type}s yet.</p> : null}
      </div>
    </section>
  </div>
)

export default AdminContentPage
