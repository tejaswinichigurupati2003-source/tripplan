import { createClient } from '@/lib/supabase/server'
import { joinDecision, submitPreferences, generateRecommendations, castVote } from '@/app/actions'
import { cookies } from 'next/headers'
import Link from 'next/link'
import CopyLink from '@/components/ui/CopyLink'

export const dynamic = 'force-dynamic'

export default async function DecisionPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch Decision Data
  const { data: decision, error } = await supabase.from('decisions').select('*').eq('id', id).single()
  if (error || !decision) return <div className="p-8 text-center text-red-500">Decision not found</div>

  const cookieStore = await cookies()
  const participantId = cookieStore.get(`participant_${id}`)?.value

  let currentUser = null
  if (participantId) {
    const { data } = await supabase.from('participants').select('*').eq('id', participantId).single()
    if (data) currentUser = data
  }

  // Fetch Participants
  const { data: allParticipants } = await supabase.from('participants').select('*').eq('decision_id', id)
  
  // NEW: Fetch all constraints for the dashboard
  let allConstraints: any[] = []
  if (allParticipants && allParticipants.length > 0) {
    const pIds = allParticipants.map(p => p.id)
    const { data: cs } = await supabase.from('constraints').select('*').in('participant_id', pIds)
    allConstraints = cs || []
  }

  // Fetch Results if scoring
  let options = []
  let evals = []
  let userVotes = []
  let whatIfOptions: any[] = []

  if (decision.status === 'scoring') {
    const { data: opts } = await supabase.from('candidate_options').select('*').eq('decision_id', id).eq('is_recommended', true)
    options = opts || []

    if (options.length > 0) {
      const { data: es } = await supabase.from('evaluations').select('*').eq('decision_id', id)
      evals = es || []
    }

    const { data: vs } = await supabase.from('votes').select('*').eq('decision_id', id)
    userVotes = vs || []

    const { data: wi } = await supabase.from('candidate_options').select('*').eq('decision_id', id).eq('is_whatif', true)
    whatIfOptions = wi || []
  }

  // REUSABLE DASHBOARD COMPONENT (Server-rendered)
  const GroupDashboard = () => (
    <div className="bg-card border border-card-border rounded-3xl shadow-sm p-6 mb-8 w-full max-w-4xl">
       <h2 className="text-xl font-serif font-semibold text-ink mb-4">Group Dashboard</h2>
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
         {allParticipants?.map(p => {
           const pcs = allConstraints.filter(c => c.participant_id === p.id)
           const budget = pcs.find(c => c.type === 'budget')?.value?.max
           const dates = pcs.find(c => c.type === 'dates')?.value
           const activities = pcs.filter(c => c.type === 'activity').map(c => c.value.name)
           const exclusions = pcs.filter(c => c.type === 'exclusion').map(c => c.value.name)

           return (
             <div key={p.id} className="border border-card-border rounded-2xl p-4 bg-background text-sm">
               <div className="font-bold text-ink mb-2 border-b border-card-border pb-1">
                 {p.name} {currentUser?.id === p.id && <span className="text-xs font-normal text-accent ml-1">(You)</span>}
               </div>
               {!p.has_submitted ? (
                 <span className="text-muted italic block mt-2">Waiting for response...</span>
               ) : (
                 <div className="space-y-2 mt-2 text-ink/80">
                   <div><span className="font-medium text-ink">Budget:</span> {budget ? `₹${budget}` : 'Any'}</div>
                   <div><span className="font-medium text-ink">Dates:</span> {dates ? `${dates.start.slice(5)} to ${dates.end.slice(5)}` : 'Any'}</div>
                   {activities.length > 0 && <div><span className="font-medium text-ink">Prefers:</span> {activities.join(', ')}</div>}
                   {exclusions.length > 0 && <div><span className="font-medium text-ink">Dislikes:</span> <span className="text-accent">{exclusions.join(', ')}</span></div>}
                 </div>
               )}
             </div>
           )
         })}
       </div>
    </div>
  )

  // View: Join Form
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center p-8 justify-center">
        <div className="max-w-md w-full bg-card border border-card-border rounded-3xl shadow-sm p-8">
          <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Join: {decision.title}</h1>
          {decision.duration && <p className="text-xs uppercase tracking-wide text-accent font-bold mb-2">{decision.duration}</p>}
          <p className="text-muted mb-6">{decision.description}</p>
          <form action={joinDecision.bind(null, id)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Your Name</label>
              <input type="text" name="name" required className="block w-full rounded-xl border border-card-border bg-white px-4 py-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft" />
            </div>
            <button type="submit" className="w-full bg-ink text-white rounded-xl py-3 font-semibold hover:bg-ink/90 transition">Join</button>
          </form>
        </div>
      </main>
    )
  }

  // View: Submit Preferences
  if (!currentUser.has_submitted && decision.status === 'collecting') {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center p-8">
        <div className="max-w-4xl w-full">
          <GroupDashboard />
        </div>

        <div className="max-w-2xl w-full bg-card border border-card-border rounded-3xl shadow-sm p-8">
          <CopyLink path={`/decisions/${id}`} />
          <h1 className="text-2xl font-serif font-semibold text-ink mb-6">Your Preferences</h1>
          <form action={async (formData) => {
            'use server'
            await submitPreferences(id, currentUser.id, formData)
          }} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Max Budget (₹)</label>
                <input type="number" name="budget" placeholder="15000" required min="0" className="w-full rounded-xl border border-card-border bg-white p-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Available Start Date</label>
                <input type="date" name="start_date" required className="w-full rounded-xl border border-card-border bg-white p-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Available End Date</label>
                <input type="date" name="end_date" required className="w-full rounded-xl border border-card-border bg-white p-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Extra Preferences / Dislikes</label>
              <p className="text-xs text-muted mb-2">Use natural language (e.g., "I prefer the beach and absolutely cannot do hiking.")</p>
              <textarea name="pref" rows={4} className="w-full rounded-xl border border-card-border bg-white p-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" placeholder="Extra preferences..." />
            </div>

            <button type="submit" className="w-full bg-ink text-white rounded-xl py-3 text-lg font-semibold hover:bg-ink/90 transition">Submit Preferences</button>
          </form>
        </div>
      </main>
    )
  }

  // View: Waiting / Generate Options trigger
  if (decision.status === 'collecting') {
    const ready = allParticipants?.filter(p => p.has_submitted).length || 0
    return (
      <main className="min-h-screen bg-background flex flex-col items-center p-8">
        <div className="max-w-4xl w-full">
           <GroupDashboard />
        </div>
        <div className="max-w-3xl w-full bg-card border border-card-border rounded-3xl shadow-sm p-8 space-y-8">
          <CopyLink path={`/decisions/${id}`} />
          <h1 className="text-2xl font-serif font-semibold mb-6 text-center text-ink">Waiting for Participants ({ready}/{allParticipants?.length})</h1>
          <form action={generateRecommendations.bind(null, id)}>
            <button type="submit" className="w-full bg-ink text-white rounded-xl py-4 text-lg font-semibold hover:bg-ink/90 transition shadow-sm">
              Generate AI Recommendations & Close Room
            </button>
          </form>
        </div>
      </main>
    )
  }

  // View: Results
  return (
    <main className="min-h-screen bg-background flex flex-col items-center p-8 text-ink">
      <div className="max-w-4xl w-full">
         <GroupDashboard />
      </div>

      <div className="max-w-4xl w-full space-y-8 mt-4">
         <h1 className="text-3xl font-serif font-semibold text-center">Top Recommendations</h1>
         <div className="space-y-6">
           {options.length === 0 ? (
             <div className="p-8 text-center bg-card border border-card-border rounded-3xl shadow-sm text-muted">No matching options generated...</div>
           ) : options.map(opt => {
              const optionEvals = evals.filter(e => e.option_id === opt.id)
              const scoreAvg = optionEvals.reduce((a, c) => a + c.score, 0) / (optionEvals.length || 1)
              const myVote = userVotes.find(v => v.option_id === opt.id && v.participant_id === currentUser.id)
              const hasConflict = optionEvals.some(e => !e.is_viable)

              return (
                <div key={opt.id} className="bg-card border border-card-border rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-6 bg-accent-soft/40 border-b border-card-border flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-serif font-semibold text-ink">{opt.title}</h2>
                      <div className="text-sm text-muted mt-2 font-medium">💰 ₹{opt.budget_estimate} | 📅 {opt.start_date} to {opt.end_date}</div>
                      <p className="text-muted text-sm mt-1">{opt.description}</p>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {opt.activities.map((act: string, i: number) => (
                           <span key={i} className="text-xs bg-white text-ink px-2 py-1 rounded-full border border-card-border">{act}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-center shrink-0 ml-4">
                       <div className="text-4xl font-bold text-accent">{Math.round(scoreAvg)}%</div>
                       <div className="text-xs text-accent/80 font-semibold uppercase tracking-wider mt-1">Group Match</div>
                    </div>
                  </div>

                  <div className="p-6 bg-card">
                    <h3 className="text-sm font-bold text-ink mb-4 uppercase tracking-wider">Evaluation Breakdown</h3>
                    <div className="space-y-3">
                      {allParticipants?.map(p => {
                        const pEval = optionEvals.find(e => e.participant_id === p.id)
                        if (!pEval) return null

                        return (
                          <div key={p.id} className="flex flex-col text-sm border-b border-card-border pb-2">
                             <div className="flex justify-between items-center mb-1">
                               <span className="font-semibold text-ink/90">{p.name} {p.id === currentUser.id && '(You)'}</span>
                               <span className={`font-bold ${pEval.is_viable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {pEval.is_viable ? `${Math.round(pEval.score)}% Match` : 'Violates Constraint'}
                               </span>
                             </div>
                             {pEval.conflict_reasons?.map((r: string, i: number) => (
                               <span key={i} className="text-rose-500 text-xs mt-1">✗ {r}</span>
                             ))}
                             {pEval.match_reasons?.map((r: string, i: number) => (
                               <span key={i} className="text-emerald-600 text-xs mt-1">✓ {r}</span>
                             ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-background flex justify-end gap-3 border-t border-card-border">
                    {!hasConflict ? (
                       <form action={async () => {
                         'use server'
                         await castVote(id, currentUser.id, opt.id, true)
                       }}>
                         <button type="submit" disabled={myVote?.is_positive === true} className={`px-6 py-2 font-medium rounded-xl transition ${myVote?.is_positive === true ? 'bg-ink text-white' : 'border-2 border-ink text-ink hover:bg-accent-soft/50'}`}>
                           {myVote?.is_positive ? 'Voted' : 'Vote for this option'}
                         </button>
                       </form>
                    ) : (
                       <div className="text-rose-600 text-sm font-medium py-2">
                         This option cannot be voted for due to a hard conflict.
                       </div>
                    )}
                  </div>
                </div>
              )
           })}
         </div>
      </div>

      {whatIfOptions.length > 0 && (
        <div className="max-w-4xl w-full space-y-4 mt-14">
          <div className="text-center">
            <h2 className="text-2xl font-serif font-semibold text-ink">Room for Negotiation</h2>
            <p className="text-sm text-muted mt-1 max-w-xl mx-auto">
              These bend one or two constraints slightly — not scored against anyone&apos;s hard limits,
              but worth a look if the group is open to a little flexibility.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {whatIfOptions.map((opt) => (
              <div key={opt.id} className="bg-card border border-dashed border-accent/40 rounded-3xl p-5">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft rounded-full px-2.5 py-1 mb-3">
                  What if?
                </span>
                <h3 className="text-lg font-serif font-semibold text-ink">{opt.title}</h3>
                <div className="text-xs text-muted mt-1 font-medium">
                  💰 ₹{opt.budget_estimate} | 📅 {opt.start_date} to {opt.end_date}
                </div>
                <p className="text-muted text-sm mt-2">{opt.description}</p>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {(opt.activities || []).map((act: string, i: number) => (
                    <span key={i} className="text-xs bg-background text-ink px-2 py-1 rounded-full border border-card-border">{act}</span>
                  ))}
                </div>
                {opt.flex_notes?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-card-border space-y-1">
                    {opt.flex_notes.map((note: string, i: number) => (
                      <div key={i} className="text-xs text-accent flex gap-1.5">
                        <span>~</span><span>{note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
