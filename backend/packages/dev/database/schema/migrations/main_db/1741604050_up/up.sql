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

CREATE TABLE saito_miner.tasks (
    id                   text PRIMARY KEY,
    model                text NOT NULL,
    created_at           timestamp NOT NULL DEFAULT now(),
    status               text NOT NULL,
    total_duration       double precision,
    load_duration        double precision,
    prompt_eval_count    integer,
    prompt_eval_duration double precision,
    eval_count           integer,
    eval_duration        double precision,
    updated_at           timestamp NOT NULL DEFAULT now()
);

CREATE TABLE saito_miner.earnings ( 
    id text PRIMARY KEY,
    block_rewards double precision NOT NULL DEFAULT 0,
    job_rewards double precision NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE saito_miner.device_status (
    name text NOT NULL,
    status text NOT NULL,
    device_id text NOT NULL,
    up_time_start timestamp,
    up_time_end timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TRIGGER set_timestamp_earnings
    BEFORE UPDATE ON saito_miner.earnings
    FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_timestamp_device_status
    BEFORE UPDATE ON saito_miner.device_status
    FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
