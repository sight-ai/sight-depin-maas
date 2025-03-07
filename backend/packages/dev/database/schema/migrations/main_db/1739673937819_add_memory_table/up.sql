-- Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS saito_memory;

-------------------------------------------------
------------------ saito_memory -----------------
-------------------------------------------------

CREATE TABLE saito_memory.memories
(
    id          BIGSERIAL PRIMARY KEY, -- Auto-incrementing primary key
    user_id     UUID NOT NULL, -- Reference to saito_auth.users.user_id
    message_id  BIGINT NOT NULL, -- External reference to messages
    category    TEXT NOT NULL,
    name        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES saito_auth.users (user_id)
);

-- Attach the trigger to `memories` table
CREATE TRIGGER update_memories_updated_at
BEFORE UPDATE ON saito_memory.memories
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
