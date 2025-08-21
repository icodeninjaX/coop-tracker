-- Drop existing objects if they exist to start fresh
DROP TRIGGER IF EXISTS update_coop_state_updated_at ON coop_state;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP POLICY IF EXISTS "Users can only access their own data" ON coop_state;
DROP TABLE IF EXISTS coop_state;

-- Create the coop_state table for storing user data
CREATE TABLE coop_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create an index on user_id for faster queries
CREATE INDEX idx_coop_state_user_id ON coop_state(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE coop_state ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only access their own data
CREATE POLICY "Users can only access their own data" ON coop_state
  FOR ALL USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_coop_state_updated_at 
  BEFORE UPDATE ON coop_state 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();