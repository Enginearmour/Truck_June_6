/*
  # Add distance unit column to trucks table

  1. Changes
    - Add `distanceUnit` column to the `trucks` table as a text field with default value of 'miles'
    - This column will store the user's preferred distance unit (either 'km' or 'miles')
  
  2. Reason
    - To allow users to track truck mileage in either kilometers or miles
    - Provides flexibility for international users with different measurement standards
*/

DO $$ 
BEGIN
  -- Check if the column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'distanceUnit'
  ) THEN
    -- Add the distanceUnit column with default value
    ALTER TABLE trucks ADD COLUMN "distanceUnit" text DEFAULT 'miles';
  END IF;
END $$;