import StartTripForm from '@/components/ui/StartTripForm'

const STEPS = [
  'Everyone answers a 5-minute private form — editable any time.',
  'AI turns natural-language preferences into scored, ranked trip options.',
  'See exactly why an option was recommended, then vote as a group.',
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent text-xs font-bold uppercase tracking-wide px-4 py-1.5 mb-6">
            ✈ For trips that keep almost happening
          </span>

          <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] text-ink mb-6">
            The group trip that <em className="italic">actually</em> happens.
          </h1>

          <p className="text-lg text-muted leading-relaxed mb-10 max-w-lg">
            No more polls that collapse the next day. Everyone submits budget, dates, and
            preferences through one shared link. We score the real options against what each
            person needs, and hand the group one clear, math-backed recommendation.
          </p>

          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-ink text-white text-sm font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-ink/90 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
          <StartTripForm />
        </div>
      </div>
    </main>
  )
}
