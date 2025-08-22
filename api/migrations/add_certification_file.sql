-- Migration to add certification_file column to movements table

-- Add certification_file column to movements table if it doesn't exist
ALTER TABLE movements ADD COLUMN IF NOT EXISTS certification_file VARCHAR(255) DEFAULT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_movements_certification_file ON movements(certification_file);