import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Brain,
  Clock,
  FileText,
  Layers3,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const tabs = [
  { id: 'summary', label: 'Summary', icon: BookOpen },
  { id: 'revision', label: 'Revision', icon: FileText },
  { id: 'flashcards', label: 'Cards', icon: Brain },
  { id: 'mindmap', label: 'Map', icon: Sparkles },
  { id: 'questions', label: 'Quiz', icon: Target },
]

const emptyText = {
  flashcards: 'No flashcards have been generated for this note yet.',
  mindmap: 'No mind map has been generated for this note yet.',
  questions: 'No practice questions have been generated for this note yet.',
}

const NoteDetailView = ({ note, onClose }) => {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('summary')
  const ai = note.aiResults || {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-3 backdrop-blur-sm sm:p-5"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        className={`flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_30px_90px_rgba(20,17,12,0.26)] ${
          theme === 'dark' ? 'border-stone-800 bg-stone-950 text-stone-100' : 'border-white bg-white text-stone-950'
        }`}
      >
        <header className="flex flex-col gap-4 border-b border-stone-200/70 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-800">
                {note.subject || 'General'}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-800">
                {note.folder || 'Inbox'}
              </span>
            </div>
            <h2 className="truncate text-2xl font-black">{note.title}</h2>
            <p className={`mt-2 max-w-3xl text-sm font-semibold leading-6 ${theme === 'dark' ? 'text-stone-400' : 'text-stone-600'}`}>
              {note.summary || 'This document is waiting for AI processing to complete.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900" title="Share note" aria-label="Share note">
              <Share2 size={20} />
            </button>
            <button onClick={onClose} className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900" title="Close" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-stone-200/70 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-black transition ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-stone-950'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <main className="overflow-y-auto p-5">
          {activeTab === 'summary' && (
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[1.3rem] bg-stone-50 p-5">
                <h3 className="text-lg font-black">Clean Summary</h3>
                <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-stone-700">
                  {note.summary || ai.quickRevisionSheet || 'Summary will appear here after processing.'}
                </p>
              </section>
              <aside className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Metric icon={Clock} label="Study" value={`${note.estimatedStudyTime || 0}m`} />
                  <Metric icon={TrendingUp} label="Level" value={`${note.difficulty || '-'} / 10`} />
                  <Metric icon={Layers3} label="Concepts" value={note.concepts?.length || 0} />
                </div>
                <ChipPanel title="Key Concepts" items={note.concepts || ai.keyConcepts || []} tone="amber" />
                <ChipPanel title="Keywords" items={note.keywords || []} tone="emerald" />
              </aside>
            </div>
          )}

          {activeTab === 'revision' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <TextPanel title="Revision Notes" value={ai.revisionNotes} />
              <TextPanel title="Chapter Notes" value={ai.chapterNotes} />
              <TextPanel title="Quick Revision Sheet" value={ai.quickRevisionSheet} />
              <section className="rounded-[1.3rem] bg-stone-50 p-5">
                <h3 className="text-lg font-black">Glossary</h3>
                <div className="mt-4 space-y-3">
                  {ai.glossary?.length ? ai.glossary.map((item) => (
                    <div key={item.term} className="rounded-2xl bg-white p-4">
                      <p className="font-black text-stone-900">{item.term}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-stone-600">{item.definition}</p>
                    </div>
                  )) : <EmptyState text="Glossary terms will appear after processing." />}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'flashcards' && (
            ai.flashcards?.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ai.flashcards.map((card, index) => (
                  <div key={`${card.front}-${index}`} className="rounded-[1.3rem] border border-amber-100 bg-amber-50 p-5">
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-amber-700">Card {index + 1}</p>
                    <p className="mt-3 font-black text-stone-950">{card.front}</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-stone-700">{card.back}</p>
                    <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-stone-600">{card.difficulty || 'medium'}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState text={emptyText.flashcards} />
          )}

          {activeTab === 'mindmap' && (
            ai.mindMap?.nodes?.length ? (
              <div className="rounded-[1.3rem] bg-stone-50 p-5">
                <h3 className="text-lg font-black">Concept Map Data</h3>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {ai.mindMap.nodes.map((node, index) => (
                    <div key={node.id || index} className="rounded-2xl bg-white p-4 font-bold text-stone-700">
                      {node.label || node.data?.label || `Concept ${index + 1}`}
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState text={emptyText.mindmap} />
          )}

          {activeTab === 'questions' && (
            ai.questions?.length ? (
              <div className="space-y-4">
                {ai.questions.map((question, index) => (
                  <div key={`${question.question}-${index}`} className="rounded-[1.3rem] bg-stone-50 p-5">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase text-sky-700">{question.bloomLevel || 'practice'}</span>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase text-rose-700">{question.difficulty || 'medium'}</span>
                    </div>
                    <p className="font-black text-stone-950">{question.question}</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-stone-700">Answer: {question.answer}</p>
                  </div>
                ))}
              </div>
            ) : <EmptyState text={emptyText.questions} />
          )}
        </main>
      </motion.div>
    </motion.div>
  )
}

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-[1.1rem] bg-stone-50 p-4 text-center">
    <Icon className="mx-auto text-amber-700" size={22} />
    <p className="mt-2 text-xl font-black text-stone-950">{value}</p>
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
  </div>
)

const ChipPanel = ({ title, items, tone }) => (
  <section className="rounded-[1.3rem] bg-stone-50 p-5">
    <h3 className="text-lg font-black">{title}</h3>
    <div className="mt-4 flex flex-wrap gap-2">
      {items.length ? items.map((item) => (
        <span key={item} className={`rounded-full px-3 py-1 text-xs font-black ${tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {item}
        </span>
      )) : <EmptyState text="Nothing extracted yet." compact />}
    </div>
  </section>
)

const TextPanel = ({ title, value }) => (
  <section className="rounded-[1.3rem] bg-stone-50 p-5">
    <h3 className="text-lg font-black">{title}</h3>
    {value ? (
      <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-stone-700">{value}</p>
    ) : <EmptyState text={`${title} will appear after processing.`} compact />}
  </section>
)

const EmptyState = ({ text, compact = false }) => (
  <div className={`${compact ? 'text-sm' : 'rounded-[1.3rem] bg-stone-50 p-8 text-center text-base'} font-bold text-stone-500`}>
    {text}
  </div>
)

export default NoteDetailView
