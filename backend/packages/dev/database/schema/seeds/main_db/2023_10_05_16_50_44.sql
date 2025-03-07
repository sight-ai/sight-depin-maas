--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4
-- Dumped by pg_dump version 15.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ethereum_wallets; Type: TABLE DATA; Schema: saito_asset; Owner: postgres
--

INSERT INTO saito_asset.ethereum_wallets
VALUES ('4ec1f846-c520-431d-bcb2-65c14ef9190d', '6b346971-bbc2-48f2-bffc-054d098594ac',
        '\x446ba3d41262c514e50378dd8b233b61b8286fac', 5,
        '\x45ee6bec08bdc43cca5cf0d618ec34ee8b29720fc4c38bd9107e44a087d89918', '2023-10-27 10:50:38.627693',
        '2023-10-27 10:50:38.627693')
on conflict do nothing;
INSERT INTO saito_asset.ethereum_wallets
VALUES ('8015b256-6c11-42eb-85d0-8322992c0a20', 'ac709eda-14f1-4ee2-b6ed-559dc78d4905',
        '\xe8ca58c4dc30472001cf56c8356f86f003da96fc', 5,
        '\x74828063bb52c7cd19f621fb008a39709cffbdd7b205fa3b9ac674cb14b5a2db', '2023-10-04 13:49:59.515466',
        '2023-10-04 13:49:59.515466')
on conflict do nothing;
INSERT INTO saito_asset.ethereum_wallets
VALUES ('a8117fb9-be88-48a6-b291-2e0568830c24', '1e9252b2-7194-4bda-97b3-601fda90091f',
        '\x48478309629b72738a61c0abfa9ea3f48cc68dc1', 5,
        '\xce2e6666bbd3269e3a941586b44fef63a37910b579d2a7505527eaadf1d17332', '2023-10-05 08:31:22.079263',
        '2023-10-05 08:31:22.079263')
on conflict do nothing;


--
-- Data for Name: telegram_users; Type: TABLE DATA; Schema: saito_auth; Owner: postgres
--

INSERT INTO saito_auth.telegram_users
VALUES (6194809608, '6b346971-bbc2-48f2-bffc-054d098594ac', false, 'Arlen', 'Lili', 'arlen_lilli', 'en', NULL, NULL,
        NULL, NULL, NULL, '2023-10-27 10:50:25.217825', '2023-10-27 10:50:25.217825')
on conflict do nothing;

INSERT INTO saito_auth.telegram_users
VALUES (688092930, 'ac709eda-14f1-4ee2-b6ed-559dc78d4905', false, 'XXXX', 'YYYY', 'b3c3df', 'en', NULL, NULL, NULL,
        NULL, NULL, '2023-10-04 13:49:58.466001', '2023-10-04 13:49:58.466001')
on conflict do nothing;

INSERT INTO saito_auth.telegram_users
VALUES (5593773912, '1e9252b2-7194-4bda-97b3-601fda90091f', false, 'Orca', 'U', 'orca_u', 'en', NULL, NULL, NULL, NULL,
        NULL, '2023-10-05 08:31:22.061616', '2023-10-05 08:31:22.061616')
on conflict do nothing;


--
-- Data for Name: users; Type: TABLE DATA; Schema: saito_auth; Owner: postgres
--

INSERT INTO saito_auth.users
VALUES ('6b346971-bbc2-48f2-bffc-054d098594ac', '2023-10-27 10:50:25.217825', '2023-10-27 10:50:25.217825') on conflict do nothing;
INSERT INTO saito_auth.users
VALUES ('ac709eda-14f1-4ee2-b6ed-559dc78d4905', '2023-10-04 13:49:58.466001', '2023-10-04 13:49:58.466001') on conflict do nothing;
INSERT INTO saito_auth.users
VALUES ('1e9252b2-7194-4bda-97b3-601fda90091f', '2023-10-05 08:31:22.061616', '2023-10-05 08:31:22.061616') on conflict do nothing;


--
-- Data for Name: user_configs; Type: TABLE DATA; Schema: saito_auth; Owner: postgres
--

INSERT INTO saito_auth.user_configs
VALUES ('6b346971-bbc2-48f2-bffc-054d098594ac', 5000000000000000, false, '2023-10-27 10:50:25.217825',
        '2023-10-27 10:50:25.217825') on conflict do nothing;
INSERT INTO saito_auth.user_configs
VALUES ('ac709eda-14f1-4ee2-b6ed-559dc78d4905', 5000000000000000, false, '2023-10-27 10:50:25.217825',
        '2023-10-27 10:50:25.217825') on conflict do nothing;
INSERT INTO saito_auth.user_configs
VALUES ('1e9252b2-7194-4bda-97b3-601fda90091f', 5000000000000000, false, '2023-10-27 10:50:25.217825',
        '2023-10-27 10:50:25.217825') on conflict do nothing;


--
-- PostgreSQL database dump complete
--

INSERT INTO saito_common.air_drop (id, symbol, name, description, created_at) VALUES ('dacaecfe-c4eb-4e4e-b8c9-b52cdffd0425', 'SAITO', 'Saito Airdrop', 'saito''s airdrop event', '2023-12-07 13:47:38.114272') on conflict do nothing;

