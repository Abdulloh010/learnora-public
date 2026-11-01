-- Increase icon column from VARCHAR(10) to VARCHAR(50)
-- to support full FontAwesome class names like "fas fa-flask"

ALTER TABLE subjects    MODIFY COLUMN icon VARCHAR(50);
ALTER TABLE achievements MODIFY COLUMN icon VARCHAR(50);
