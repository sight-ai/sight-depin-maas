CREATE
    EXTENSION IF NOT EXISTS pgcrypto;

CREATE
    OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"()
    RETURNS TRIGGER AS
$$
DECLARE
    _new record;
BEGIN
    _new := NEW;
    _new."updated_at" = NOW();
    RETURN _new;
END;
$$
    LANGUAGE plpgsql;

create schema if not exists saito_miner;

-------------------------------------------------
------------------ saito_miner -------------------
-------------------------------------------------

create table saito_miner.tasks
(
    id                   text primary key,
    model                text not null,
    created_at           timestamp not null default now(),
    status               text not null,
    total_duration       double precision,
    load_duration        double precision,
    prompt_eval_count    integer,
    prompt_eval_duration double precision,
    eval_count           integer,
    eval_duration        double precision,
    updated_at           timestamp not null default now()
);

table saito_miner.earnings ( 
    id text primary key,
    block_rewards double precision not null default 0,
    job_rewards double precision not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table saito_miner.device_status (
    id text primary key,
    name text not null,
    status text not null,
    up_time_start timestamp,
    up_time_end timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create trigger set_timestamp_earnings
    before update on saito_miner.earnings
    for each row
execute procedure public.set_current_timestamp_updated_at();

create trigger set_timestamp_device_status
    before update on saito_miner.device_status
    for each row
execute procedure public.set_current_timestamp_updated_at();