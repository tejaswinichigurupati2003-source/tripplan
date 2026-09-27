import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parsePreferencesWithGemini(userInput: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `
You are a trip planning assistant. Extract preferences from user input.
Convert natural language into a JSON array of constraints/preferences.
Types allowed: 'activity', 'exclusion'. (Budget and dates are handled separately by the UI).
Importance: 1 (nice to have) to 5 (crucial).
is_hard_constraint: true if wording implies absolute requirement (must, cannot, strictly), false if preference.
Return ONLY valid JSON.
Format example:
[
  { "type": "activity", "is_hard_constraint": false, "value": { "name": "beach" }, "importance": 4 },
  { "type": "exclusion", "is_hard_constraint": true, "value": { "name": "hiking" }, "importance": 5 }
]

User Input: "${userInput}"
`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (err) {
    console.error("Failed to parse Gemini output:", err);
    return [];
  }
}

export async function generateCandidateOptions(participants: any[], constraints: any[]) {
  const contextStr = participants.map(p => {
    const pConstraints = constraints.filter(c => c.participant_id === p.id);
    const rules = pConstraints.map(c =>
      `- ${c.type}: ${JSON.stringify(c.value)} (Hard requirement: ${c.is_hard_constraint})`
    ).join('\n');
    return `Traveler: ${p.name}\n${rules.length > 0 ? rules : '- No specific constraints provided'}`;
  }).join('\n\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `
You are an expert travel coordinator. A group of friends is planning a trip.
Here are their combined preferences and constraints:

${contextStr}

Generate exactly 5 distinct, realistic, high-quality travel options that attempt to accommodate these diverse preferences.
If no specific dates are provided by anyone, assume a 7-day trip approximately 6-12 months in the future.
Return ONLY a valid JSON array of objects.
Each object MUST have exact keys:
- title (string): Name of the destination/trip
- description (string): A short 1-sentence hook
- budget_estimate (number): Estimated cost per person in INR (integer)
- start_date (string): format "YYYY-MM-DD"
- end_date (string): format "YYYY-MM-DD"
- activities (array of strings): 3-5 tags describing the trip (e.g. ["beach", "relaxation", "spa"])

Do NOT wrap the output in markdown code blocks. Respond with purely the JSON array.
`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (err) {
    console.error("Failed to generate options with Gemini:", err);
    return [];
  }
}

// "What-if" simulator: options that deliberately bend one or two hard
// constraints a small, realistic amount (budget, dates, an excluded
// activity) to show the group what's possible with a little flexibility.
export async function generateWhatIfOptions(participants: any[], constraints: any[]) {
  const contextStr = participants.map(p => {
    const pConstraints = constraints.filter(c => c.participant_id === p.id);
    const rules = pConstraints.map(c =>
      `- ${c.type}: ${JSON.stringify(c.value)} (Hard requirement: ${c.is_hard_constraint})`
    ).join('\n');
    return `Traveler: ${p.name}\n${rules.length > 0 ? rules : '- No specific constraints provided'}`;
  }).join('\n\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `
You are an expert travel negotiator helping a group see what's possible if they're willing to bend slightly on their stated hard constraints.
Here are their combined preferences and constraints:

${contextStr}

Generate exactly 3 "what-if" travel options. Each one must assume a SMALL, REALISTIC relaxation of ONE OR TWO hard constraints only — never all of them at once, and never a drastic change. Examples of acceptable relaxations:
- Increasing someone's max budget by roughly 10-20%.
- Shifting someone's available date window by a few days (2-5 days earlier or later).
- Softly including one activity someone marked as excluded, framed as optional/skippable.
Do NOT invent options that ignore constraints entirely or change more than two things per option. Keep every other constraint respected exactly as stated.

Return ONLY a valid JSON array of objects. Each object MUST have exact keys:
- title (string): Name of the destination/trip
- description (string): A short 1-sentence hook
- budget_estimate (number): Estimated cost per person in INR (integer)
- start_date (string): format "YYYY-MM-DD"
- end_date (string): format "YYYY-MM-DD"
- activities (array of strings): 3-5 tags describing the trip
- flex_notes (array of strings): plain-language notes on exactly what was relaxed and for whom, e.g. "Assumes Priya's budget is ₹3,000 higher" or "Shifts Karan's start date 3 days later"

Do NOT wrap the output in markdown code blocks. Respond with purely the JSON array.
`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (err) {
    console.error("Failed to generate what-if options with Gemini:", err);
    return [];
  }
}
