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

create schema if not exists saito_auth;

-------------------------------------------------
------------------ saito_auth -------------------
-------------------------------------------------

create table saito_auth.users
(
    user_id    uuid               default gen_random_uuid() not null
        constraint users_pkey
            primary key,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table saito_auth.telegram_users
(
    id                          bigint unique not null,
    user_id                     uuid          null, -- saito_auth.users.user_id
    is_bot                      boolean       not null,
    first_name                  text          not null,
    last_name                   text,
    username                    text,
    language_code               text,
    is_premium                  boolean,
    added_to_attachment_menu    boolean,
    can_join_groups             boolean,
    can_read_all_group_messages boolean,
    supports_inline_queries     boolean,
    created_at                  timestamp     not null default now(),
    updated_at                  timestamp     not null default now()
);

create table saito_auth.user_configs
(
    user_id           uuid      unique not null,
    ethereum_slippage bigint             default 5000000000000000, --0.5%
    is_debug_enabled  bool      not null default false,
    created_at        timestamp not null default now(),
    updated_at        timestamp not null default now(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES saito_auth.users (user_id)
);

-------------------------------------------------
------------------ saito_asset ------------------
-------------------------------------------------
create schema if not exists saito_asset;
create table saito_asset.ethereum_wallets
(
    wallet_id             uuid               default gen_random_uuid() not null
        constraint wallets_pkey
            primary key,
    owner_user_id         uuid      not null,
    address               bytea     not null,
    chain_id              numeric   not null,
    encrypted_private_key bytea     not null, -- encrypted
    created_at            timestamp not null default now(),
    updated_at            timestamp not null default now()
);

-------------------------------------------------
------------------ saito_message ------------------
-------------------------------------------------

create schema if not exists saito_message;
-- https://core.telegram.org/bots/api#message
-- mirror the field from API
create table saito_message.telegram_messages
(
    -- Unique message identifier inside this chat
    "message_id"              numeric   not null,
    "date"                    timestamptz,
    -- Conversation the message belongs to
    "chat"                    numeric   NOT NULL,
    "text"                    TEXT,
    "message_thread_id"       numeric,
    "from"                    numeric,
    "sender_chat"             numeric,
    "is_topic_message"        BOOLEAN,
    "forward_from"            numeric,
    "forward_from_chat"       numeric,
    "forward_from_message_id" numeric,
    "forward_signature"       TEXT,
    "forward_sender_name"     TEXT,
    "forward_date"            timestamptz,
    "is_automatic_forward"    BOOLEAN,
    "reply_to_message"        numeric,
    "via_bot"                 numeric,
    "edit_date"               timestamptz,
    "has_protected_content"   BOOLEAN,
    "author_signature"        TEXT,
    "caption"                 TEXT,
    "created_at"              timestamp not null default now(),
    "updated_at"              timestamp not null default now(),
    constraint telegram_messages_pkey
        primary key ("chat", "message_id")
);

create table saito_message.session_messages
(
    "chat_id"    numeric   not null,
    "session_id" uuid      not null,
    "message_id" numeric   not null,
    "role"       text      not null,
    "text"       text,
    "from_id"    numeric,
    "date"       timestamp not null,
    constraint session_messages_pkey primary key ("chat_id", "session_id", "message_id"),
    "created_at" timestamp not null default now()
);

create table saito_message.sessions
(
    "session_id"       uuid      not null default gen_random_uuid() primary key,
    "user_id"          uuid      null, -- saito_auth.users.user_id
    "is_active"        bool      not null default true,
    "is_dialog_active" bool      not null default false,
    "dialog_data"      jsonb     null,
    "created_at"       timestamp not null default now()
)
