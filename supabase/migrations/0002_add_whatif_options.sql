-- "What-if" options are AI-generated candidates that deliberately bend one or two
-- hard constraints (budget, dates, an excluded activity) by a small, realistic amount.
-- They live in the same table as regular candidate_options but are flagged separately
-- so they never affect the deterministic scoring/voting of the real recommendations.
ALTER TABLE candidate_options ADD COLUMN IF NOT EXISTS is_whatif BOOLEAN DEFAULT FALSE;
ALTER TABLE candidate_options ADD COLUMN IF NOT EXISTS flex_notes JSONB DEFAULT '[]';
