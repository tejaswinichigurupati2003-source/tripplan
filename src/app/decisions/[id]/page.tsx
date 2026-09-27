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
  
  if (decision.status === 'scoring') {
    const { data: opts } = await supabase.from('candidate_options').select('*').eq('decision_id', id).eq('is_recommended', true)
    options = opts || []
    
    if (options.length > 0) {
      const { data: es } = await supabase.from('evaluations').select('*').eq('decision_id', id)
      evals = es || []
    }
    
    const { data: vs } = await supabase.from('votes').select('*').eq('decision_id', id)
    userVotes = vs || []
  }

  // REUSABLE DASHBOARD COMPONENT (Server-rendered)
  const GroupDashboard = () => (
    <div className="bg-white rounded-xl shadow p-6 mb-8 w-full max-w-4xl border-t-4 border-indigo-500">
       <h2 className="text-xl font-bold text-gray-900 mb-4">Group Dashboard</h2>
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
         {allParticipants?.map(p => {
           const pcs = allConstraints.filter(c => c.participant_id === p.id)
           const budget = pcs.find(c => c.type === 'budget')?.value?.max
           const dates = pcs.find(c => c.type === 'dates')?.value
           const activities = pcs.filter(c => c.type === 'activity').map(c => c.value.name)
           const exclusions = pcs.filter(c => c.type === 'exclusion').map(c => c.value.name)
           
           return (
             <div key={p.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm">
               <div className="font-bold text-indigo-900 mb-2 border-b pb-1">
                 {p.name} {currentUser?.id === p.id && <span className="text-xs font-normal text-indigo-500 ml-1">(You)</span>}
               </div>
               {!p.has_submitted ? (
                 <span className="text-gray-500 italic block mt-2">Waiting for response...</span>
               ) : (
                 <div className="space-y-2 mt-2 text-gray-700">
                   <div><span className="font-medium text-gray-900">Budget:</span> {budget ? `$${budget}` : 'Any'}</div>
                   <div><span className="font-medium text-gray-900">Dates:</span> {dates ? `${dates.start.slice(5)} to ${dates.end.slice(5)}` : 'Any'}</div>
                   {activities.length > 0 && <div><span className="font-medium text-gray-900">Prefers:</span> {activities.join(', ')}</div>}
                   {exclusions.length > 0 && <div><span className="font-medium text-gray-900">Dislikes:</span> <span className="text-red-600">{exclusions.join(', ')}</span></div>}
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
      <main className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Join: {decision.title}</h1>
          <p className="text-gray-600 mb-6">{decision.description}</p>
          <form action={joinDecision.bind(null, id)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Your Name</label>
              <input type="text" name="name" required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition">Join</button>
          </form>
        </div>
      </main>
    )
  }

  // View: Submit Preferences
  if (!currentUser.has_submitted && decision.status === 'collecting') {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
        <div className="max-w-4xl w-full">
          <GroupDashboard />
        </div>
        
        <div className="max-w-2xl w-full bg-white rounded-xl shadow p-8">
          <CopyLink path={`/decisions/${id}`} />
          <h1 className="text-2xl font-bold mb-6">Your Preferences</h1>
          <form action={async (formData) => {
            'use server'
            await submitPreferences(id, currentUser.id, formData)
          }} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Budget ($)</label>
                <input type="number" name="budget" placeholder="1500" required min="0" className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Start Date</label>
                <input type="date" name="start_date" required className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available End Date</label>
                <input type="date" name="end_date" required className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra Preferences / Dislikes</label>
              <p className="text-xs text-gray-500 mb-2">Use natural language (e.g., "I prefer the beach and absolutely cannot do hiking.")</p>
              <textarea name="pref" rows={4} className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-indigo-500" placeholder="Extra preferences..." />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white rounded-md py-3 text-lg font-medium hover:bg-blue-700 transition">Submit Preferences</button>
          </form>
        </div>
      </main>
    )
  }

  // View: Waiting / Generate Options trigger
  if (decision.status === 'collecting') {
    const ready = allParticipants?.filter(p => p.has_submitted).length || 0
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
        <div className="max-w-4xl w-full">
           <GroupDashboard />
        </div>
        <div className="max-w-3xl w-full bg-white rounded-xl shadow p-8 space-y-8">
          <CopyLink path={`/decisions/${id}`} />
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Waiting for Participants ({ready}/{allParticipants?.length})</h1>
          <form action={generateRecommendations.bind(null, id)}>
            <button type="submit" className="w-full bg-indigo-600 text-white rounded-md py-4 text-lg font-semibold hover:bg-indigo-700 shadow-md">
              Generate AI Recommendations & Close Room
            </button>
          </form>
        </div>
      </main>
    )
  }

  // View: Results
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-8 text-black">
      <div className="max-w-4xl w-full">
         <GroupDashboard />
      </div>

      <div className="max-w-4xl w-full space-y-8 mt-4">
         <h1 className="text-3xl font-bold text-center">AI Top Recommendations</h1>
         <div className="space-y-6">
           {options.length === 0 ? (
             <div className="p-8 text-center bg-white rounded-xl shadow text-gray-500">No matching options generated...</div>
           ) : options.map(opt => {
              const optionEvals = evals.filter(e => e.option_id === opt.id)
              const scoreAvg = optionEvals.reduce((a, c) => a + c.score, 0) / (optionEvals.length || 1)
              const myVote = userVotes.find(v => v.option_id === opt.id && v.participant_id === currentUser.id)
              const hasConflict = optionEvals.some(e => !e.is_viable)

              return (
                <div key={opt.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{opt.title}</h2>
                      <div className="text-sm text-gray-600 mt-2 font-medium">💰 ${opt.budget_estimate} | 📅 {opt.start_date} to {opt.end_date}</div>
                      <p className="text-gray-500 text-sm mt-1">{opt.description}</p>
                      <div className="mt-3 flex gap-2">
                        {opt.activities.map((act: string, i: number) => (
                           <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{act}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                       <div className="text-4xl font-bold text-indigo-600">{Math.round(scoreAvg)}%</div>
                       <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-1">Group Match</div>
                    </div>
                  </div>

                  <div className="p-6 bg-white">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Evaluation Breakdown</h3>
                    <div className="space-y-3">
                      {allParticipants?.map(p => {
                        const pEval = optionEvals.find(e => e.participant_id === p.id)
                        if (!pEval) return null
                        
                        return (
                          <div key={p.id} className="flex flex-col text-sm border-b border-gray-50 pb-2">
                             <div className="flex justify-between items-center mb-1">
                               <span className="font-semibold text-gray-700">{p.name} {p.id === currentUser.id && '(You)'}</span>
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

                  <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                    {!hasConflict ? (
                       <form action={async () => {
                         'use server'
                         await castVote(id, currentUser.id, opt.id, true)
                       }}>
                         <button type="submit" disabled={myVote?.is_positive === true} className={`px-6 py-2 font-medium rounded transition ${myVote?.is_positive === true ? 'bg-indigo-600 text-white' : 'border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50'}`}>
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
    </main>
  )
}
