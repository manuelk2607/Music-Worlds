CREATE TABLE worlds_auth_transactions (
 id text PRIMARY KEY, payload jsonb NOT NULL, expires bigint NOT NULL
);
CREATE INDEX worlds_auth_transactions_expiry ON worlds_auth_transactions(expires);
CREATE TABLE worlds_auth_sessions (
 id text PRIMARY KEY, issuer text NOT NULL, subject text NOT NULL,
 sid text, payload jsonb NOT NULL, expires bigint NOT NULL
);
CREATE INDEX worlds_auth_sessions_identity ON worlds_auth_sessions(issuer,subject,sid);
CREATE INDEX worlds_auth_sessions_expiry ON worlds_auth_sessions(expires);
CREATE TABLE worlds_auth_replays (id text PRIMARY KEY, expires bigint NOT NULL);
CREATE INDEX worlds_auth_replays_expiry ON worlds_auth_replays(expires);
CREATE TABLE worlds_identity_links (
 issuer text NOT NULL, subject text NOT NULL,
 local_profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
 linked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (issuer,subject)
);
