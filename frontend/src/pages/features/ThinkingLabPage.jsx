import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, PenTool, Play, RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

const prompts = [
  'Who will use the solution every day?',
  'What can break after six months?',
  'How can students maintain it locally?',
]

const categories = ['Logic', 'Problem Solving', 'Critical Thinking', 'Patterns', 'Challenges']

const ThinkingLabPage = () => {
  const [answer, setAnswer] = useState('')

  return (
    <div className="world-page">
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:items-stretch">
        <Card className="p-6 sm:p-8">
          <Badge tone="accent">Thinking Lab</Badge>
          <h1 className="mt-5 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
            Challenge arena for sharper reasoning.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">
            Use logic, design thinking, and clear argumentation to solve real problems. Your ideas should be testable, maintainable, and specific.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((category) => <Badge key={category}>{category}</Badge>)}
          </div>
        </Card>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                <Lightbulb size={28} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Daily Brief</p>
                <h2 className="mt-2 font-display text-3xl font-black text-primary">The Solar Village Problem</h2>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  A rural village needs sustainable energy. Design a solution with limited resources, maintenance challenges, and local conditions.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-app bg-elevated p-4">
                <Timer size={18} className="text-success" strokeWidth={1.5} />
                <p className="mt-2 font-black text-primary">30 min challenge</p>
              </div>
              <div className="rounded-2xl border border-app bg-elevated p-4">
                <Trophy size={18} className="text-success" strokeWidth={1.5} />
                <p className="mt-2 font-black text-primary">100 idea points</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="self-start p-5">
          <Sparkles size={24} className="text-accent" strokeWidth={1.5} />
          <h2 className="mt-4 font-display text-xl font-black text-primary">Think like a designer</h2>
          <div className="mt-5 space-y-3">
            {prompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-app bg-elevated p-4 text-sm font-bold leading-6 text-secondary">
                {prompt}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <PenTool size={22} className="text-accent" strokeWidth={1.5} />
            <h2 className="font-display text-xl font-black text-primary">Your solution sketch</h2>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your idea step by step: people, materials, cost, maintenance, risks, and how you will test it..."
            className="min-h-[320px] w-full resize-none rounded-2xl border border-app bg-elevated p-5 text-base font-semibold leading-7 text-primary outline-none transition placeholder:text-muted focus:ring-4 focus:ring-accent/25"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1">
              <Play size={18} strokeWidth={1.5} />
              Submit idea
            </Button>
            <Button variant="secondary" onClick={() => setAnswer('')}>
              <RotateCcw size={18} strokeWidth={1.5} />
              Reset sketch
            </Button>
          </div>
        </Card>
      </section>
    </div>
  )
}

export default ThinkingLabPage
