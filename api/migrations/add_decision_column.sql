-- Add decision column to movements table for sortie operations
ALTER TABLE movements ADD COLUMN decision VARCHAR(50) NULL COMMENT 'Decision for sortie operations: tri, rebut, libération';

-- Add index for decision column for better query performance
CREATE INDEX idx_movements_decision ON movements(decision);