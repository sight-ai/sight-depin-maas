CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS
$$
DECLARE
    _new record;
BEGIN
    _new := NEW;
    _new.updated_at = NOW();
    RETURN _new;
END;
$$
LANGUAGE plpgsql;

CREATE SCHEMA IF NOT EXISTS saito_miner;

-------------------------------------------------
------------------ saito_miner -------------------
-------------------------------------------------

-- First create the device_status table since other tables will reference it
CREATE TABLE saito_miner.device_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in-progress', 'connected', 'disconnected', 'failed')),
    up_time_start timestamp,
    up_time_end timestamp,
    reward_address text,
    gateway_address text,
    key text,
    code text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE saito_miner.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_duration double precision,
    load_duration double precision,
    prompt_eval_count integer,
    prompt_eval_duration double precision,
    eval_count integer,
    eval_duration double precision,
    updated_at timestamp NOT NULL DEFAULT now(),
    source text NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'gateway')),
    device_id uuid,
    FOREIGN KEY (device_id) REFERENCES saito_miner.device_status(id)
);

CREATE TABLE saito_miner.earnings ( 
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_rewards double precision NOT NULL DEFAULT 0,
    job_rewards double precision NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    source text NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'gateway')),
    device_id uuid,
    task_id uuid,
    FOREIGN KEY (device_id) REFERENCES saito_miner.device_status(id),
    FOREIGN KEY (task_id) REFERENCES saito_miner.tasks(id)
);

CREATE TRIGGER set_timestamp_tasks
    BEFORE UPDATE ON saito_miner.tasks
    FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_timestamp_earnings
    BEFORE UPDATE ON saito_miner.earnings
    FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_timestamp_device_status
    BEFORE UPDATE ON saito_miner.device_status
    FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
