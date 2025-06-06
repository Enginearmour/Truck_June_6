/*
  # Create trucks table

  1. New Tables
    - `trucks`
      - `id` (uuid, primary key)
      - `vin` (text, unique)
      - `year` (integer)
      - `make` (text)
      - `model` (text)
      - `currentMileage` (integer)
      - `maintenanceHistory` (jsonb)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `trucks` table
    - Add policy for public access (MVP version without auth)
*/

CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin text UNIQUE NOT NULL,
  year integer NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  currentMileage integer NOT NULL DEFAULT 0,
  maintenanceHistory jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

-- For MVP without authentication, allow public access
CREATE POLICY "Allow public access to trucks"
  ON trucks
  FOR ALL
  TO public
  USING (true);