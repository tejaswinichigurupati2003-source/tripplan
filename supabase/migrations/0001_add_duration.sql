-- Adds a human-readable trip length captured at room creation (e.g. "Weekend (2 nights)")
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS duration TEXT;
