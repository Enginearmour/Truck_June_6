/*
  # Update trucks table column name

  1. Changes
    - Rename `current_mileage` column to `currentMileage` to match camelCase naming in the application code
  
  2. Reason
    - Fixing schema mismatch between database and application code
    - Application is using camelCase naming convention
*/

DO $$ 
BEGIN
  -- Check if the column exists with snake_case naming
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'current_mileage'
  ) THEN
    -- Rename the column from snake_case to camelCase
    ALTER TABLE trucks RENAME COLUMN current_mileage TO "currentMileage";
  
  -- If neither column exists, create the camelCase version
  ELSIF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'currentMileage'
  ) THEN
    ALTER TABLE trucks ADD COLUMN "currentMileage" integer NOT NULL DEFAULT 0;
  END IF;
END $$;