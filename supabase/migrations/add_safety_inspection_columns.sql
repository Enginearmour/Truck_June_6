/*
  # Add safety inspection columns to trucks table

  1. Changes
    - Add `safetyInspectionDate` column to store the date when the last safety inspection was performed
    - Add `safetyInspectionExpiryDate` column to store the date when the safety inspection expires
  
  2. Reason
    - Track yearly safety inspection stickers for trucks
    - Allow monitoring of safety inspection expiry dates
    - Enable notifications for upcoming or overdue safety inspections
*/

DO $$ 
BEGIN
  -- Check if the safetyInspectionDate column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'safetyInspectionDate'
  ) THEN
    -- Add the safetyInspectionDate column
    ALTER TABLE trucks ADD COLUMN "safetyInspectionDate" date;
  END IF;

  -- Check if the safetyInspectionExpiryDate column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'safetyInspectionExpiryDate'
  ) THEN
    -- Add the safetyInspectionExpiryDate column
    ALTER TABLE trucks ADD COLUMN "safetyInspectionExpiryDate" date;
  END IF;
END $$;
