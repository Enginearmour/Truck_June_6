/*
  # Add Unit Number to trucks table

  1. New Columns
    - `unitNumber` (text, nullable) - Optional identifier used by companies to track trucks

  2. Reason
    - Adding support for company-specific truck identifiers
    - Allows fleet managers to use their internal numbering system alongside VINs
*/

DO $$ 
BEGIN
  -- Check if the column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'unitNumber'
  ) THEN
    -- Add the unitNumber column
    ALTER TABLE trucks ADD COLUMN "unitNumber" text;
  END IF;
END $$;