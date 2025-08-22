-- Add is_prison column to locations table
ALTER TABLE locations ADD COLUMN is_prison TINYINT(1) DEFAULT 0 NOT NULL;

-- Update existing records to have is_prison = 0 (not a prison zone by default)
UPDATE locations SET is_prison = 0 WHERE is_prison IS NULL;