import { useState } from 'react'
import { motion } from 'framer-motion'
import { Flower2, Leaf, Maximize2, Search, Sprout, Trees } from 'lucide-react'

const concepts = [
  { id: 1, name: 'Thermodynamics', subject: 'Physics', x: '12%', y: '35%', size: 'h-24 w-24', color: 'bg-amber-200' },
  { id: 2, name: 'Organic Chemistry', subject: 'Chemistry', x: '42%', y: '18%', size: 'h-20 w-20', color: 'bg-rose-200' },
  { id: 3, name: 'Calculus', subject: 'Maths', x: '68%', y: '42%', size: 'h-28 w-28', color: 'bg-sky-200' },
  { id: 4, name: 'Cell Biology', subject: 'Biology', x: '28%', y: '66%', size: 'h-20 w-20', color: 'bg-emerald-200' },
  { id: 5, name: "Newton's Laws", subject: 'Physics', x: '78%', y: '70%', size: 'h-24 w-24', color: 'bg-violet-200' },
]

const KnowledgeForestPage = () => {
  const [selectedNode, setSelectedNode] = useState(concepts[0])

  return (
    <div className="world-page bg-gradient-to-br from-emerald-50 via-lime-50 to-teal-100">
      <div className="absolute left-8 top-10 h-52 w-52 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="absolute bottom-8 right-12 h-44 w-44 rounded-full bg-lime-200/60 blur-3xl" />

      <section className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <span className="story-label">
            <Trees size={14} />
            Living Knowledge Garden
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">Knowledge Garden</h1>
          <p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-stone-600">
            Every concept is a living plant. The stronger your understanding, the richer its roots and branches become.
          </p>
        </div>
        <label className="flex w-full items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm lg:max-w-sm">
          <Search size={18} className="text-stone-500" />
          <input className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-stone-400" placeholder="Search your garden..." />
        </label>
      </section>

      <section className="relative mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="relative min-h-[560px] overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/50 p-5 shadow-[0_24px_70px_rgba(37,91,67,0.13)]">
          <div className="absolute inset-x-8 top-1/2 h-2 rounded-full path-line opacity-60" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-emerald-200/55 to-transparent" />
          {concepts.map((concept, index) => (
            <motion.button
              key={concept.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => setSelectedNode(concept)}
              className={`absolute ${concept.size} ${concept.color} flex flex-col items-center justify-center rounded-full p-3 text-center shadow-xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300`}
              style={{ left: concept.x, top: concept.y }}
            >
              <Leaf size={20} className="mb-1 text-stone-800" />
              <span className="text-xs font-black leading-tight text-stone-950">{concept.name}</span>
            </motion.button>
          ))}
          <button className="soft-button absolute right-5 top-5" aria-label="Expand garden">
            <Maximize2 size={17} />
          </button>
        </div>

        <aside className="floating-island self-start bg-white/70">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-200">
            <Flower2 size={30} className="text-emerald-900" />
          </div>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.14em] text-emerald-800">Selected plant</p>
          <h2 className="mt-2 text-2xl font-black text-stone-950">{selectedNode.name}</h2>
          <p className="mt-1 text-sm font-bold text-stone-500">{selectedNode.subject}</p>
          <p className="mt-5 text-sm font-semibold leading-6 text-stone-600">
            This concept is ready for one more practice session. Connect it with formulas, diagrams, and a short explanation in your own words.
          </p>
          <button className="organic-button mt-6 w-full">
            <Sprout size={18} />
            Grow this concept
          </button>
        </aside>
      </section>
    </div>
  )
}

export default KnowledgeForestPage
