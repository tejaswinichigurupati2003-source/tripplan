# Decision Room - Collaborative Group Trip Planner

Decision Room is a production-quality MVP for collaborative group trip decision making. It resolves conflicts between participants, takes naturally phrased preferences (budget, dates, needs), and outputs mathematically optimal collective recommendations.

## Features
- **Create Decision Rooms**: Start a new event and invite users.
- **Natural Language Parsing (Gemini AI)**: Users submit preferences (e.g. "Beach trip in July under $500, absolutely no hiking") and AI extracts structured constraints.
- **Deterministic Decision Engine**: Math-based evaluation scoring every possible travel option against every person's constraints. It rigorously flags hard-constraint violations and scores soft preferences.
- **Transparent Results**: See exactly why an option was recommended and why someone might have a conflict (e.g. "Violates Budget Max $500").

## Tech Stack
- Frontend: Next.js 16+, React 19, Tailwind CSS 4
- API / Server Actions: Next.js standard Server Actions
- DB / Auth: Supabase (PostgreSQL)
- AI: Google Gemini

## Local Setup

### 1. Supabase setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Get your `URL` and `anon public key` (publishable key) from Project Settings -> API.
3. In the Supabase SQL Editor, run the script provided in `supabase/migrations/0000_init.sql` to create all tables and RLS policies.
4. To test with mock data instantly, run the `supabase/seed.sql` script which seeds 5 conflicting participants into a demo decision (id: `11111111-1111-1111-1111-111111111111`).

### 2. Configure Environment Variables
Copy the `.env.example` file:
```bash
cp .env.example .env.local
```
Fill in the values:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
```

### 3. Run the App
Install dependencies and run:
```bash
pnpm install
pnpm dev
```
Visit `http://localhost:3000`.

To view the seeded example (after running `seed.sql`), visit `http://localhost:3000/decisions/11111111-1111-1111-1111-111111111111`.
You can join as any name and hit "Generate Recommendations" because the seeds already have submitted preferences.
