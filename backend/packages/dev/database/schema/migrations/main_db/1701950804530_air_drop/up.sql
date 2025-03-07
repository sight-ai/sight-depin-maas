create schema saito_common;

create table saito_common.air_drop
(
  id          uuid               default gen_random_uuid() not null,
  symbol      text      not null unique,
  name        text      not null,
  description text      not null default '',
  created_at  timestamp not null default now()
);

create table saito_common.air_drop_join
(
  air_drop_id uuid      not null,
  user_id     uuid      not null,
  primary key (air_drop_id, user_id),
  created_at  timestamp not null default now()
);

create table saito_common.referral
(
  user_id       uuid      not null,
  referral_code text      not null,
  primary key (user_id),
  created_at    timestamp not null default now()
);

create table saito_common.referral_history
(
  user_id       uuid      not null,
  referral_code text      not null,
  primary key (user_id, referral_code),
  created_at    timestamp not null default now()
);
