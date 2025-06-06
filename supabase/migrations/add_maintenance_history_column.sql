/*
  # Add maintenanceHistory column to trucks table

  1. Changes
    - Add `maintenanceHistory` column to the `trucks` table as a JSONB type with default empty array
  
  2. Reason
    - The application code is expecting a maintenanceHistory column, but it doesn't exist in the database
    - This column will store maintenance records in JSON format
*/

DO $$ 
BEGIN
  -- Check if the column doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'trucks' AND column_name = 'maintenanceHistory'
  ) THEN
    -- Add the maintenanceHistory column
    ALTER TABLE trucks ADD COLUMN "maintenanceHistory" jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;