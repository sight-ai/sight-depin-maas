create schema saito_tasks;
create table saito_tasks.trigger_tasks
(
  id                    bigserial primary key,
  user_id               uuid        not null,
  chat_id               numeric     not null,
  session_id            uuid        not null,
  trigger_condition     jsonb       not null,
  program               jsonb       not null,
  triggered             boolean     not null default false,
  cancelled             boolean     not null default false,
  triggered_workflow_id varchar,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

CREATE INDEX "idx_trigger_tasks_triggered" ON "saito_tasks"."trigger_tasks" USING BTREE ("triggered");
