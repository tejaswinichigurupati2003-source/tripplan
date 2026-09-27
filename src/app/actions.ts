'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parsePreferencesWithGemini, generateCandidateOptions, generateWhatIfOptions } from '@/lib/gemini'
import { rankOptions, Participant, Preference, CandidateOption } from '@/lib/decision-engine'
import { redirect } from 'next/navigation'

export async function createDecision(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const creatorName = formData.get('creatorName') as string
  const duration = formData.get('duration') as string | null
  const inviteeNames = (formData.getAll('invitees') as string[])
    .map((n) => n.trim())
    .filter(Boolean)

  const supabase = await createClient()

  const { data: decision, error } = await supabase
    .from('decisions')
    .insert([{ title, description, duration }])
    .select()
    .single()

  if (error) throw new Error(error.message)

  const { data: participant } = await supabase
    .from('participants')
    .insert([{ decision_id: decision.id, name: creatorName, role: 'creator' }])
    .select()
    .single()

  // Pre-register everyone the organizer named as invitees so the group
  // dashboard shows them immediately as "waiting", before they've joined.
  if (inviteeNames.length > 0) {
    const uniqueNames = inviteeNames.filter(
      (n) => n.toLowerCase() !== creatorName.trim().toLowerCase()
    )
    if (uniqueNames.length > 0) {
      await supabase
        .from('participants')
        .insert(uniqueNames.map((name) => ({ decision_id: decision.id, name, role: 'invitee' })))
    }
  }

  // We should set a cookie so the creator is automatically logged in
  const cookieStore = require('next/headers').cookies
  ;(await cookieStore()).set(`participant_${decision.id}`, participant.id)

  revalidatePath(`/decisions/${decision.id}`)
  redirect(`/decisions/${decision.id}`)
}

export async function joinDecision(decisionId: string, formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const supabase = await createClient()

  // If the organizer already pre-listed this name as an invitee, claim that
  // existing slot instead of creating a duplicate participant.
  const { data: existing } = await supabase
    .from('participants')
    .select('*')
    .eq('decision_id', decisionId)
    .eq('has_submitted', false)
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  let participant = existing

  if (!participant) {
    const { data: created, error } = await supabase
      .from('participants')
      .insert([{ decision_id: decisionId, name }])
      .select()
      .single()

    if (error) throw new Error(error.message)
    participant = created
  }

  const cookieStore = require('next/headers').cookies
  ;(await cookieStore()).set(`participant_${decisionId}`, participant.id)

  revalidatePath(`/decisions/${decisionId}`)
}

export async function submitPreferences(decisionId: string, participantId: string, formData: FormData) {
  const supabase = await createClient()

  const budget = formData.get('budget') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const nlInput = formData.get('pref') as string

  await supabase.from('constraints').delete().eq('participant_id', participantId)

  const explicitConstraints: any[] = []
  
  if (budget) {
    explicitConstraints.push({
      participant_id: participantId,
      type: 'budget',
      is_hard_constraint: true,
      value: { max: Number(budget) },
      importance: 5
    })
  }

  if (startDate && endDate) {
    explicitConstraints.push({
      participant_id: participantId,
      type: 'dates',
      is_hard_constraint: true,
      value: { start: startDate, end: endDate },
      importance: 5
    })
  }

  let finalConstraints = [...explicitConstraints]

  if (nlInput && nlInput.trim().length > 0) {
    const parsed = await parsePreferencesWithGemini(nlInput)
    if (parsed && Array.isArray(parsed)) {
      const aiConstraints = parsed.map((p: any) => ({
        participant_id: participantId,
        type: p.type,
        is_hard_constraint: p.is_hard_constraint,
        value: p.value,
        importance: p.importance
      }))
      finalConstraints = [...finalConstraints, ...aiConstraints]
    }
  }

  if (finalConstraints.length > 0) {
    await supabase.from('constraints').insert(finalConstraints)
  }

  await supabase
    .from('participants')
    .update({ has_submitted: true })
    .eq('id', participantId)

  revalidatePath(`/decisions/${decisionId}`)
}


export async function generateRecommendations(decisionId: string) {
  const supabase = await createClient()

  // 1. Fetch participants and constraints
  const { data: participants } = await supabase.from('participants').select('*').eq('decision_id', decisionId)
  const { data: prefsData } = await supabase.from('constraints').select('*, participant:participants!inner(decision_id)')
    .eq('participant.decision_id', decisionId)

  if (!participants || !prefsData) throw new Error("Missing data")

  // 2. Setup options dynamically using Gemini AI
  const dynamicOptions = await generateCandidateOptions(participants, prefsData);
  if (!dynamicOptions || dynamicOptions.length === 0) {
    throw new Error("Failed to generate travel options using AI based on the group's preferences.");
  }

  await supabase.from('candidate_options').delete().eq('decision_id', decisionId)

  const optionsToInsert = dynamicOptions.map((o: any) => ({
    decision_id: decisionId,
    title: o.title,
    description: o.description || '',
    budget_estimate: o.budget_estimate,
    start_date: o.start_date,
    end_date: o.end_date,
    activities: o.activities || []
  }))

  const { data: savedOptions } = await supabase.from('candidate_options').insert(optionsToInsert).select()
  if (!savedOptions) throw new Error("Failed to save options")

  // 3. Run Engine deterministically
  const { evaluations, recommended_options } = rankOptions(
    savedOptions as CandidateOption[],
    participants as Participant[],
    prefsData as Preference[]
  )

  // 4. Save Evaluations
  const evalsToInsert = evaluations.map(e => ({
    decision_id: decisionId,
    option_id: e.option_id,
    participant_id: e.participant_id,
    score: e.score,
    is_viable: e.is_viable,
    conflict_reasons: e.conflict_reasons,
    match_reasons: e.match_reasons
  }))

  await supabase.from('evaluations').insert(evalsToInsert)

  // Mark recommended
  for (const optId of recommended_options) {
    await supabase.from('candidate_options').update({ is_recommended: true }).eq('id', optId)
  }

  // Complete status
  await supabase.from('decisions').update({ status: 'scoring' }).eq('id', decisionId)

  // 5. "What-if" simulator: a few AI options that bend one or two hard
  // constraints slightly, shown separately below the real recommendations.
  // Best-effort only — if this fails, the main recommendations are unaffected.
  try {
    const whatIfOptions = await generateWhatIfOptions(participants, prefsData)
    if (Array.isArray(whatIfOptions) && whatIfOptions.length > 0) {
      await supabase.from('candidate_options').delete().eq('decision_id', decisionId).eq('is_whatif', true)

      const whatIfToInsert = whatIfOptions.map((o: any) => ({
        decision_id: decisionId,
        title: o.title,
        description: o.description || '',
        budget_estimate: o.budget_estimate,
        start_date: o.start_date,
        end_date: o.end_date,
        activities: o.activities || [],
        flex_notes: o.flex_notes || [],
        is_whatif: true
      }))

      const { error: whatIfError } = await supabase.from('candidate_options').insert(whatIfToInsert)
      if (whatIfError) console.error("Failed to save what-if options:", whatIfError.message)
    }
  } catch (err) {
    console.error("What-if generation failed, skipping:", err)
  }

  revalidatePath(`/decisions/${decisionId}`)
}

export async function castVote(decisionId: string, participantId: string, optionId: string, isPositive: boolean) {
  const supabase = await createClient()
  
  await supabase.from('votes').upsert({
    decision_id: decisionId,
    participant_id: participantId,
    option_id: optionId,
    is_positive: isPositive
  }, { onConflict: 'participant_id,decision_id' })
  
  revalidatePath(`/decisions/${decisionId}`)
}
