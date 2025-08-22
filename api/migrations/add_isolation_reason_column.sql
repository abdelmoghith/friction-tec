-- Add isolation_reason column to movements table for quality control transfers
ALTER TABLE movements ADD COLUMN isolation_reason TEXT NULL COMMENT 'Reason for isolation when product is marked as non-conforme';

-- Add index for isolation_reason column for better query performance
CREATE INDEX idx_movements_isolation_reason ON movements(isolation_reason(255));