-- We'll create a single mock decision and 5 participants with constraints, plus evaluations to demo recommendations visually.
-- Actually the easiest way to test it end to end is just to create the seed data that puts everything in a "collecting" state with 5 participants already having submitted preferences. Then the user just hits "Generate Recommendations".

INSERT INTO decisions (id, title, description, status) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Seed Trip: Group Getaway', 'A test trip to see the engine in action', 'collecting');

-- Participants
INSERT INTO participants (id, decision_id, name, role, has_submitted) VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Alice (Budget Conscious)', 'creator', true),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bob (Luxury Hater)', 'invitee', true),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Charlie (Nature Lover)', 'invitee', true),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Dave (Beach Bum)', 'invitee', true),
('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Eve (Date Restricted)', 'invitee', true);

-- Alice: Hard limits on budget
INSERT INTO constraints (participant_id, type, is_hard_constraint, value, importance) VALUES
('22222222-2222-2222-2222-222222222221', 'budget', true, '{"max": 2000}', 5),
('22222222-2222-2222-2222-222222222221', 'activity', false, '{"name": "culture"}', 3);

-- Bob: Doesn't want too much city
INSERT INTO constraints (participant_id, type, is_hard_constraint, value, importance) VALUES
('22222222-2222-2222-2222-222222222222', 'exclusion', true, '{"name": "city"}', 5),
('22222222-2222-2222-2222-222222222222', 'budget', false, '{"max": 3000}', 2);

-- Charlie: Wants hiking
INSERT INTO constraints (participant_id, type, is_hard_constraint, value, importance) VALUES
('22222222-2222-2222-2222-222222222223', 'activity', true, '{"name": "hiking"}', 5),
('22222222-2222-2222-2222-222222222223', 'activity', false, '{"name": "nature"}', 4);

-- Dave: Strictly beach
INSERT INTO constraints (participant_id, type, is_hard_constraint, value, importance) VALUES
('22222222-2222-2222-2222-222222222224', 'activity', true, '{"name": "beach"}', 5);

-- Eve: Strict on dates
INSERT INTO constraints (participant_id, type, is_hard_constraint, value, importance) VALUES
('22222222-2222-2222-2222-222222222225', 'dates', true, '{"start": "2026-07-01", "end": "2026-07-31"}', 5);
