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
