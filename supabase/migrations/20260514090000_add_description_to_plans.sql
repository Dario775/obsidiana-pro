-- Add description column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description text;
