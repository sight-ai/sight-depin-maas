-- Add new fields to the earnings table
ALTER TABLE saito_miner.earnings ADD COLUMN IF NOT EXISTS amount double precision;
ALTER TABLE saito_miner.earnings ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE saito_miner.earnings ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE saito_miner.earnings ADD COLUMN IF NOT EXISTS transaction_hash text;
ALTER TABLE saito_miner.earnings ADD COLUMN IF NOT EXISTS description text;

-- Add constraints to the type and status fields
ALTER TABLE saito_miner.earnings ADD CONSTRAINT earnings_type_check 
  CHECK (type IS NULL OR type IN ('task', 'block', 'referral'));
  
ALTER TABLE saito_miner.earnings ADD CONSTRAINT earnings_status_check 
  CHECK (status IS NULL OR status IN ('pending', 'confirmed', 'rejected'));
