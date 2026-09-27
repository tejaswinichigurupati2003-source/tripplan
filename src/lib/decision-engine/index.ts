export interface Participant {
  id: string;
  name: string;
}

export interface Preference {
  id: string;
  participant_id: string;
  type: string;
  is_hard_constraint: boolean;
  value: any;
  importance: number;
}

export interface CandidateOption {
  id: string;
  title: string;
  budget_estimate: number;
  start_date: string;
  end_date: string;
  activities: string[];
}

export interface EvaluationResult {
  option_id: string;
  participant_id: string;
  score: number;
  is_viable: boolean;
  conflict_reasons: string[];
  match_reasons: string[];
}

export function evaluateOption(
  option: CandidateOption,
  participant: Participant,
  preferences: Preference[]
): EvaluationResult {
  let is_viable = true;
  let score = 100; // Base score
  let conflict_reasons: string[] = [];
  let match_reasons: string[] = [];

  const optStart = new Date(option.start_date).getTime();
  const optEnd = new Date(option.end_date).getTime();

  for (const pref of preferences) {
    if (pref.participant_id !== participant.id) continue;

    const penaltyWeight = pref.importance * 10;
    const rewardWeight = pref.importance * 10;

    if (pref.type === 'budget' && typeof pref.value.max === 'number') {
      if (option.budget_estimate > pref.value.max) {
        if (pref.is_hard_constraint) {
          is_viable = false;
          conflict_reasons.push(`Budget exceeds max of $${pref.value.max}`);
        } else {
          score -= penaltyWeight;
          conflict_reasons.push(`Slightly over budget target of $${pref.value.max}`);
        }
      } else {
        score += rewardWeight / 2;
        match_reasons.push(`Within budget ($${pref.value.max})`);
      }
    }

    if (pref.type === 'dates' && pref.value.start && pref.value.end) {
      const pStart = new Date(pref.value.start).getTime();
      const pEnd = new Date(pref.value.end).getTime();

      const overlaps = optStart >= pStart && optEnd <= pEnd;
      if (!overlaps) {
        if (pref.is_hard_constraint) {
          is_viable = false;
          conflict_reasons.push(`Dates conflict with available window ${pref.value.start} to ${pref.value.end}`);
        } else {
          score -= penaltyWeight;
          conflict_reasons.push(`Not optimal dates (${pref.value.start} to ${pref.value.end})`);
        }
      } else {
        match_reasons.push(`Fits scheduling window`);
        score += rewardWeight / 2;
      }
    }

    if (pref.type === 'activity' && pref.value.name) {
      const hasMatch = option.activities.some(act => act.toLowerCase() === pref.value.name.toLowerCase());
      if (!hasMatch) {
        if (pref.is_hard_constraint) {
          is_viable = false;
          conflict_reasons.push(`Required activity missed: ${pref.value.name}`);
        } else {
           score -= penaltyWeight / 2; 
        }
      } else {
        score += rewardWeight;
        match_reasons.push(`Includes preferred activity: ${pref.value.name}`);
      }
    }

    if (pref.type === 'exclusion' && pref.value.name) {
       const hasMatch = option.activities.some(act => act.toLowerCase() === pref.value.name.toLowerCase());
       if (hasMatch) {
         if (pref.is_hard_constraint) {
           is_viable = false;
           conflict_reasons.push(`Contains excluded activity: ${pref.value.name}`);
         } else {
           score -= penaltyWeight;
           conflict_reasons.push(`Contains disliked activity: ${pref.value.name}`);
         }
       }
    }
  }

  return {
    option_id: option.id,
    participant_id: participant.id,
    score: Math.max(0, Math.min(score, 100)), // Normalize to 0-100
    is_viable,
    conflict_reasons,
    match_reasons
  };
}

export function rankOptions(
  options: CandidateOption[],
  participants: Participant[],
  preferences: Preference[]
) {
  const evaluations: EvaluationResult[] = [];
  const optionScores: Record<string, { option: CandidateOption, viableCount: number, totalScore: number }> = {};

  for (const option of options) {
    optionScores[option.id] = { option, viableCount: 0, totalScore: 0 };

    for (const participant of participants) {
      const evalData = evaluateOption(option, participant, preferences);
      evaluations.push(evalData);

      if (evalData.is_viable) {
        optionScores[option.id].viableCount++;
      }
      optionScores[option.id].totalScore += evalData.score;
    }
  }

  // Sort by viableCount (must work for most people), then totalScore
  const ranked = Object.values(optionScores).sort((a, b) => {
    if (a.viableCount !== b.viableCount) {
      return b.viableCount - a.viableCount;
    }
    return b.totalScore - a.totalScore;
  });

  return { 
    evaluations, 
    recommended_options: ranked.slice(0, 3).map(r => r.option.id) 
  };
}
