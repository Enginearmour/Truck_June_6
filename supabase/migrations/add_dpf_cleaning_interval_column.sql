/*
  # Add DPF Cleaning interval column to trucks table

  1. Changes
    - Add `dpfCleaningMileageInterval` column to the `trucks` table as an integer with default value of 100000
  
  2. Reason
    - To track the mileage interval between DPF (Diesel Particulate Filter) cleaning for each truck
    - This allows for mileage-based maintenance tracking and alerts for DPF cleaning
*/

DO $$ 
BEGIN
  -- Check if the DPF cleaning column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'dpfCleaningMileageInterval'
  ) THEN
    -- Add the dpfCleaningMileageInterval column with default value
    ALTER TABLE trucks ADD COLUMN "dpfCleaningMileageInterval" integer DEFAULT 100000;
  END IF;
END $$;
