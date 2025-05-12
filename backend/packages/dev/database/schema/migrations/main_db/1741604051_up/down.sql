-- Remove constraints
ALTER TABLE saito_miner.earnings DROP CONSTRAINT IF EXISTS earnings_type_check;
ALTER TABLE saito_miner.earnings DROP CONSTRAINT IF EXISTS earnings_status_check;

-- Remove new fields from the earnings table
ALTER TABLE saito_miner.earnings DROP COLUMN IF EXISTS amount;
ALTER TABLE saito_miner.earnings DROP COLUMN IF EXISTS type;
ALTER TABLE saito_miner.earnings DROP COLUMN IF EXISTS status;
ALTER TABLE saito_miner.earnings DROP COLUMN IF EXISTS transaction_hash;
ALTER TABLE saito_miner.earnings DROP COLUMN IF EXISTS description;
