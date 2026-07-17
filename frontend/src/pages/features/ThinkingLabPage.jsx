import { useState } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, Lightbulb, PenTool, Play, RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react'

const prompts = [
  'Who will use the solution every day?',
  'What can break after six months?',
  'How can students maintain it locally?',
]

const ThinkingLabPage = () => {
  const [answer, setAnswer] = useState('')

  return (
    <div className="world-page bg-gradient-to-br from-violet-50 via-fuchsia-50 to-orange-100">
      <div className="absolute right-12 top-12 h-48 w-48 rounded-full bg-violet-200/60 blur-3xl" />
      <div className="absolute bottom-8 left-8 h-44 w-44 rounded-full bg-orange-200/70 blur-3xl" />

      <section className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="space-y-6">
          <span className="story-label">
            <FlaskConical size={14} />
            Innovation and Challenge Zone
          </span>
          <h1 className="text-4xl font-black leading-tight text-stone-950 sm:text-5xl">Thinking Lab</h1>
          <p className="max-w-2xl text-lg font-medium leading-8 text-stone-600">
            Solve real Indian community problems with science, design, and clear reasoning. This is where learning becomes invention.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="soft-button">
              <Timer size={17} />
              30 min challenge
            </span>
            <span className="soft-button">
              <Trophy size={17} />
              100 idea points
            </span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, rotate: -2 }} animate={{ opacity: 1, rotate: 0 }} className="floating-island bg-white/75">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-violet-200">
              <Lightbulb size={30} className="text-violet-900" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-violet-800">Daily brief</p>
              <h2 className="mt-2 text-2xl font-black leading-8 text-stone-950">The Solar Village Problem</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
                A rural village needs sustainable energy. Design a solution with limited resources, maintenance challenges, and local conditions.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative mt-9 grid gap-5 lg:grid-cols-[330px_1fr]">
        <aside className="floating-island self-start">
          <Sparkles size={26} className="text-violet-800" />
          <h2 className="mt-4 text-xl font-black text-stone-950">Think like a designer</h2>
          <div className="mt-5 space-y-3">
            {prompts.map((prompt) => (
              <div key={prompt} className="rounded-[1.3rem] bg-violet-50 p-4 text-sm font-bold leading-6 text-stone-700">
                {prompt}
              </div>
            ))}
          </div>
        </aside>

        <div className="floating-island">
          <div className="mb-4 flex items-center gap-3">
            <PenTool size={24} className="text-violet-800" />
            <h2 className="text-xl font-black text-stone-950">Your solution sketch</h2>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your idea step by step: people, materials, cost, maintenance, risks, and how you will test it..."
            className="min-h-[300px] w-full resize-none rounded-[2rem] border border-white/80 bg-white/70 p-5 text-base font-semibold leading-7 text-stone-800 outline-none transition placeholder:text-stone-400 focus:ring-4 focus:ring-violet-200"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button className="organic-button flex-1">
              <Play size={18} />
              Submit idea
            </button>
            <button onClick={() => setAnswer('')} className="soft-button">
              <RotateCcw size={18} />
              Reset sketch
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ThinkingLabPage
