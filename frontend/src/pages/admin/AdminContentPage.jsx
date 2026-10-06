import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react'
import { adminService } from '../../services/adminService'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import Skeleton from '../../components/ui/Skeleton'

const emptyLesson = {
  title: '',
  class: 'Programming MVP',
  subject: 'C Programming',
  chapter: 'General',
  content: '',
  videoUrl: '',
  order: 1,
  estimatedStudyTime: 20,
  difficulty: 'Intermediate',
}

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.'

const AdminContentPage = () => {
  const queryClient = useQueryClient()
  const [subjectFilter, setSubjectFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [lessonForm, setLessonForm] = useState(emptyLesson)
  const [editingLessonId, setEditingLessonId] = useState('')
  const [formError, setFormError] = useState('')
  const [banner, setBanner] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState('')

  const allLessonsQuery = useQuery({
    queryKey: ['admin-lessons-all'],
    queryFn: () => adminService.getLessons(),
  })

  const lessonsQuery = useQuery({
    queryKey: ['admin-lessons', subjectFilter],
    queryFn: () => adminService.getLessons(subjectFilter ? { subject: subjectFilter } : {}),
  })

  const lessons = lessonsQuery.data?.lessons || []

  const subjectOptions = useMemo(() => {
    const values = new Set((allLessonsQuery.data?.lessons || []).map((lesson) => lesson.subject).filter(Boolean))
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [allLessonsQuery.data])

  const resetForm = () => {
    setLessonForm(emptyLesson)
    setEditingLessonId('')
    setFormError('')
  }

  const openCreateForm = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEditForm = (row) => {
    setEditingLessonId(row.id || row._id)
    setLessonForm({
      title: row.title || '',
      class: row.class || 'Programming MVP',
      subject: row.subject || '',
      chapter: row.chapter || 'General',
      content: row.content || '',
      videoUrl: row.videoUrl || '',
      order: row.order ?? 1,
      estimatedStudyTime: row.estimatedStudyTime ?? 20,
      difficulty: row.difficulty || 'Intermediate',
    })
    setFormError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    resetForm()
  }

  const createLesson = useMutation({
    mutationFn: adminService.createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
      queryClient.invalidateQueries({ queryKey: ['admin-lessons-all'] })
      setBanner({ type: 'success', message: 'Lesson created successfully.' })
      closeForm()
    },
    onError: (error) => setFormError(getErrorMessage(error)),
  })

  const updateLesson = useMutation({
    mutationFn: ({ id, payload }) => adminService.updateLesson(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
      queryClient.invalidateQueries({ queryKey: ['admin-lessons-all'] })
      setBanner({ type: 'success', message: 'Lesson updated successfully.' })
      closeForm()
    },
    onError: (error) => setFormError(getErrorMessage(error)),
  })

  const deleteLesson = useMutation({
    mutationFn: adminService.deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
      queryClient.invalidateQueries({ queryKey: ['admin-lessons-all'] })
      setBanner({ type: 'success', message: 'Lesson deleted successfully.' })
      setDeleteConfirmId('')
    },
    onError: (error) => {
      setBanner({ type: 'error', message: getErrorMessage(error) })
      setDeleteConfirmId('')
    },
  })

  const isSubmitting = createLesson.isPending || updateLesson.isPending

  const validateForm = () => {
    if (!lessonForm.title.trim()) return 'Lesson title is required.'
    if (!lessonForm.subject.trim()) return 'Subject is required.'
    if (!lessonForm.chapter.trim()) return 'Chapter is required.'
    if (!lessonForm.class.trim()) return 'Class is required.'
    if (!lessonForm.content.trim()) return 'Lesson content is required.'
    if (Number.isNaN(Number(lessonForm.order))) return 'Order must be a number.'
    return ''
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const validationMessage = validateForm()
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setFormError('')
    const payload = {
      ...lessonForm,
      order: Number(lessonForm.order),
      estimatedStudyTime: Number(lessonForm.estimatedStudyTime) || 15,
    }

    if (editingLessonId) {
      updateLesson.mutate({ id: editingLessonId, payload })
      return
    }

    createLesson.mutate(payload)
  }

  return (
    <div className="world-page">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="accent">Admin</Badge>
          <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-5xl">
            Content management
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
            Manage lesson content used across learning paths and programming courses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button as={Link} to="/admin" variant="secondary" size="sm">
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back to dashboard
          </Button>
          <Button type="button" onClick={openCreateForm}>
            <Plus size={16} strokeWidth={1.5} />
            Add lesson
          </Button>
        </div>
      </section>

      {banner ? (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{banner.message}</span>
            <button type="button" onClick={() => setBanner(null)} className="text-current opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <Card className="mb-6 p-4">
        <label className="block max-w-md">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">Subject / course filter</span>
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-app bg-surface px-3 text-sm font-semibold text-primary outline-none focus:ring-4 focus:ring-accent/25"
          >
            <option value="">All subjects</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-app p-5">
          <SectionHeader eyebrow="Lessons" title="Lesson library" />
        </div>

        {lessonsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : null}

        {lessonsQuery.isError ? (
          <div className="p-8">
            <EmptyState
              title="Could not load lessons"
              message={getErrorMessage(lessonsQuery.error)}
            />
          </div>
        ) : null}

        {!lessonsQuery.isLoading && !lessonsQuery.isError ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-app bg-elevated text-xs font-black uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Lesson</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => {
                  const lessonId = lesson.id || lesson._id
                  return (
                    <tr key={lessonId} className="border-t border-app">
                      <td className="p-4 font-semibold text-secondary">{lesson.subject}</td>
                      <td className="p-4">
                        <p className="font-black text-primary">{lesson.title}</p>
                        <p className="text-xs font-semibold text-muted">{lesson.chapter}</p>
                      </td>
                      <td className="p-4 font-semibold text-secondary">{lesson.order ?? 0}</td>
                      <td className="p-4">
                        <Badge tone="success">{lesson.status || 'Active'}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => openEditForm(lesson)}>
                            <Pencil size={14} strokeWidth={1.5} />
                            Edit
                          </Button>
                          {deleteConfirmId === lessonId ? (
                            <>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={deleteLesson.isPending}
                                onClick={() => deleteLesson.mutate(lessonId)}
                              >
                                Confirm
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId('')}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-700 hover:text-red-800"
                              onClick={() => setDeleteConfirmId(lessonId)}
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!lessons.length ? (
                  <tr>
                    <td colSpan="5" className="p-8">
                      <EmptyState
                        title="No lessons yet"
                        message="Create your first lesson or adjust the subject filter."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <SectionHeader
                eyebrow={editingLessonId ? 'Edit lesson' : 'New lesson'}
                title={editingLessonId ? 'Update lesson details' : 'Add a lesson'}
              />
              <button type="button" onClick={closeForm} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-primary">
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" required>
                  <input
                    value={lessonForm.title}
                    onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Class" required>
                  <input
                    value={lessonForm.class}
                    onChange={(event) => setLessonForm((current) => ({ ...current, class: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Subject / course" required>
                  <input
                    value={lessonForm.subject}
                    onChange={(event) => setLessonForm((current) => ({ ...current, subject: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Chapter" required>
                  <input
                    value={lessonForm.chapter}
                    onChange={(event) => setLessonForm((current) => ({ ...current, chapter: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Order">
                  <input
                    type="number"
                    min="0"
                    value={lessonForm.order}
                    onChange={(event) => setLessonForm((current) => ({ ...current, order: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Estimated study time (minutes)">
                  <input
                    type="number"
                    min="1"
                    value={lessonForm.estimatedStudyTime}
                    onChange={(event) => setLessonForm((current) => ({ ...current, estimatedStudyTime: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Difficulty">
                  <select
                    value={lessonForm.difficulty}
                    onChange={(event) => setLessonForm((current) => ({ ...current, difficulty: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </Field>
                <Field label="Video URL">
                  <input
                    value={lessonForm.videoUrl}
                    onChange={(event) => setLessonForm((current) => ({ ...current, videoUrl: event.target.value }))}
                    className={inputClass}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </Field>
              </div>

              <Field label="Description / content" required>
                <textarea
                  value={lessonForm.content}
                  onChange={(event) => setLessonForm((current) => ({ ...current, content: event.target.value }))}
                  className={`${inputClass} min-h-32`}
                />
              </Field>

              {formError ? <p className="text-sm font-semibold text-red-700">{formError}</p> : null}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : editingLessonId ? 'Update lesson' : 'Create lesson'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

const inputClass =
  'mt-1 h-11 w-full rounded-xl border border-app bg-surface px-3 text-sm font-semibold text-primary outline-none focus:ring-4 focus:ring-accent/25'

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">
      {label}
      {required ? ' *' : ''}
    </span>
    {children}
  </label>
)

export default AdminContentPage
