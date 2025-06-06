/*
  # Add oil change interval column to trucks table

  1. Changes
    - Add `oilChangeMileageInterval` column to the `trucks` table as an integer with default value of 5000 miles
  
  2. Reason
    - To track the mileage interval between oil changes for each truck
    - This allows for mileage-based maintenance tracking and alerts
*/

DO $$ 
BEGIN
  -- Check if the column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'oilChangeMileageInterval'
  ) THEN
    -- Add the oilChangeMileageInterval column with default value
    ALTER TABLE trucks ADD COLUMN "oilChangeMileageInterval" integer DEFAULT 5000;
  END IF;
END $$;