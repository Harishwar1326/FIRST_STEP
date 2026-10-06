import { useState } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Search, Sprout, Trees } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ProgressBar from '../../components/ui/ProgressBar'

const concepts = [
  { id: 1, name: 'Thermodynamics', subject: 'Physics', x: '12%', y: '35%', mastery: 64 },
  { id: 2, name: 'Organic Chemistry', subject: 'Chemistry', x: '42%', y: '18%', mastery: 51 },
  { id: 3, name: 'Calculus', subject: 'Maths', x: '68%', y: '42%', mastery: 78 },
  { id: 4, name: 'Cell Biology', subject: 'Biology', x: '28%', y: '66%', mastery: 58 },
  { id: 5, name: "Newton's Laws", subject: 'Physics', x: '78%', y: '70%', mastery: 72 },
]

const edges = [
  [1, 2],
  [2, 3],
  [1, 4],
  [3, 5],
]

const KnowledgeForestPage = () => {
  const [selectedNode, setSelectedNode] = useState(concepts[0])
  const [query, setQuery] = useState('')

  const visibleConcepts = concepts.filter((concept) => `${concept.name} ${concept.subject}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="world-page">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="accent">Knowledge Forest</Badge>
          <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
            Visual concept map.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
            Explore relationships between concepts, identify weak branches, and choose the next idea to grow.
          </p>
        </div>
        <label className="flex w-full items-center gap-3 rounded-2xl border border-app bg-surface px-4 py-3 lg:max-w-sm">
          <Search size={18} className="text-muted" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm font-bold text-primary outline-none placeholder:text-muted"
            placeholder="Search concepts..."
          />
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="relative min-h-[620px] overflow-hidden p-5">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            {edges.map(([from, to]) => {
              const source = concepts.find((concept) => concept.id === from)
              const target = concepts.find((concept) => concept.id === to)
              return (
                <line
                  key={`${from}-${to}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="var(--color-border)"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                />
              )
            })}
          </svg>

          {visibleConcepts.map((concept, index) => {
            const selected = selectedNode.id === concept.id
            return (
              <motion.button
                key={concept.id}
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => setSelectedNode(concept)}
                className={`absolute flex h-28 w-28 flex-col items-center justify-center rounded-2xl border p-3 text-center transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${
                  selected ? 'border-accent bg-accent text-white' : 'border-app bg-elevated text-primary hover:border-accent'
                }`}
                style={{ left: concept.x, top: concept.y }}
              >
                <Trees size={22} strokeWidth={1.5} />
                <span className="mt-2 text-xs font-black leading-tight">{concept.name}</span>
                <span className={`mt-1 text-[10px] font-bold ${selected ? 'text-white/80' : 'text-muted'}`}>{concept.mastery}%</span>
              </motion.button>
            )
          })}

          <Button variant="secondary" className="absolute right-5 top-5" aria-label="Expand map">
            <Maximize2 size={17} strokeWidth={1.5} />
            Zoom
          </Button>
        </Card>

        <Card className="self-start p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-white">
            <Trees size={28} strokeWidth={1.5} />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-muted">Selected Concept</p>
          <h2 className="mt-2 font-display text-3xl font-black text-primary">{selectedNode.name}</h2>
          <p className="mt-1 text-sm font-bold text-secondary">{selectedNode.subject}</p>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-muted">
              <span>Mastery</span>
              <span>{selectedNode.mastery}%</span>
            </div>
            <ProgressBar value={selectedNode.mastery} />
          </div>
          <p className="mt-6 text-sm font-semibold leading-6 text-secondary">
            Review its relationships, explain it once from memory, and connect it to one solved example.
          </p>
          <Button className="mt-6 w-full">
            <Sprout size={18} strokeWidth={1.5} />
            Grow this concept
          </Button>
        </Card>
      </section>
    </div>
  )
}

export default KnowledgeForestPage
