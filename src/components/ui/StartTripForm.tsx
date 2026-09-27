'use client'

import { useState } from 'react'
import { createDecision } from '@/app/actions'

const DURATIONS = ['Weekend (2 nights)', 'Long weekend (4 days)', '5 days', 'A full week']

export default function StartTripForm() {
  const [duration, setDuration] = useState(DURATIONS[1])
  const [invitees, setInvitees] = useState(['', ''])

  const updateInvitee = (index: number, value: string) => {
    setInvitees((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  const addInvitee = () => setInvitees((prev) => [...prev, ''])

  const removeInvitee = (index: number) =>
    setInvitees((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))

  return (
    <div className="bg-card border border-card-border rounded-3xl shadow-[0_20px_50px_-25px_rgba(28,26,23,0.35)] p-8 w-full max-w-md">
      <h2 className="text-2xl font-serif font-semibold text-ink mb-6">Start a trip</h2>

      <form action={createDecision} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-ink mb-2">
            What are you planning?
          </label>
          <input
            type="text"
            name="title"
            id="title"
            required
            placeholder="Goa trip with the gang"
            className="block w-full rounded-xl border border-card-border bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">How long a trip?</label>
          <input type="hidden" name="duration" value={duration} />
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  duration === d
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink border-card-border hover:border-ink/40'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="creatorName" className="block text-sm font-medium text-ink mb-2">
            Your name (organizer)
          </label>
          <input
            type="text"
            name="creatorName"
            id="creatorName"
            required
            placeholder="Riya"
            className="block w-full rounded-xl border border-card-border bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-sm font-medium text-ink">Who&apos;s coming?</label>
            <span className="text-xs text-muted">{invitees.filter((v) => v.trim()).length} people</span>
          </div>
          <div className="space-y-2">
            {invitees.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  name="invitees"
                  value={value}
                  onChange={(e) => updateInvitee(i, e.target.value)}
                  placeholder="Name"
                  className="flex-1 rounded-xl border border-card-border bg-white px-4 py-2.5 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                />
                <button
                  type="button"
                  onClick={() => removeInvitee(i)}
                  disabled={invitees.length <= 1}
                  aria-label="Remove"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-accent-soft/60 disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addInvitee}
            className="mt-3 text-sm font-medium text-accent hover:text-ink transition"
          >
            + Add someone
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-ink text-white font-semibold hover:bg-ink/90 transition"
        >
          Create decision room
        </button>
      </form>
    </div>
  )
}
