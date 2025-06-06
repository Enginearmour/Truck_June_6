/*
  # Add air filter and fuel filter interval columns to trucks table

  1. Changes
    - Add `airFilterMileageInterval` column to the `trucks` table as an integer with default value of 15000
    - Add `fuelFilterMileageInterval` column to the `trucks` table as an integer with default value of 25000
  
  2. Reason
    - To track the mileage interval between air filter changes for each truck
    - To track the mileage interval between fuel filter changes for each truck
    - This allows for mileage-based maintenance tracking and alerts for all filter types
*/

DO $$ 
BEGIN
  -- Check if the air filter column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'airFilterMileageInterval'
  ) THEN
    -- Add the airFilterMileageInterval column with default value
    ALTER TABLE trucks ADD COLUMN "airFilterMileageInterval" integer DEFAULT 15000;
  END IF;

  -- Check if the fuel filter column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'fuelFilterMileageInterval'
  ) THEN
    -- Add the fuelFilterMileageInterval column with default value
    ALTER TABLE trucks ADD COLUMN "fuelFilterMileageInterval" integer DEFAULT 25000;
  END IF;
END $$;