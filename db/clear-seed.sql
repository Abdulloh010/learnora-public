-- ============================================================
-- Learnora · clear-seed.sql
-- Removes existing seed data (subjects, quizzes, questions)
-- then re-runs the seed so you get the latest content cleanly.
-- Run this BEFORE seed.sql when you need to refresh seed data.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE quiz_attempts;   -- depends on quizzes
TRUNCATE TABLE questions;       -- depends on quizzes
TRUNCATE TABLE quizzes;         -- depends on subjects
TRUNCATE TABLE subjects;

SET FOREIGN_KEY_CHECKS = 1;

-- Reset all XP scores to 0 (quiz attempts are already cleared above)
UPDATE users SET xp = 0;
