CREATE TABLE IF NOT EXISTS profiles (
 id uuid PRIMARY KEY, name varchar(40) NOT NULL, theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
 hub_subject text UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS contributions (
 id uuid PRIMARY KEY, author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
 body jsonb NOT NULL, fingerprint text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','blocked','withdrawn')),
 review jsonb NOT NULL DEFAULT '{"status":"pending"}', revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contribution_identity ON contributions(fingerprint) WHERE status <> 'withdrawn';
CREATE INDEX IF NOT EXISTS contribution_public ON contributions(status,updated_at DESC);
CREATE INDEX IF NOT EXISTS contribution_owner ON contributions(author_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS contribution_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, contribution_id uuid NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
 actor text NOT NULL, action text NOT NULL, revision integer NOT NULL, snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS songs (
 id uuid PRIMARY KEY, identity text NOT NULL UNIQUE, title text NOT NULL, artists text[] NOT NULL, album text NOT NULL DEFAULT '',
 year integer, genre text NOT NULL, language text NOT NULL DEFAULT '', external_ids jsonb NOT NULL DEFAULT '{}', source text NOT NULL
);
CREATE TABLE IF NOT EXISTS contribution_songs (
 contribution_id uuid PRIMARY KEY REFERENCES contributions(id) ON DELETE CASCADE, song_id uuid NOT NULL REFERENCES songs(id)
);
CREATE TABLE IF NOT EXISTS rooms (
 code varchar(8) PRIMARY KEY, version integer NOT NULL, state jsonb NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS results (
 match_id uuid NOT NULL, profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 score integer NOT NULL CHECK(score>=0), rounds integer NOT NULL, won boolean NOT NULL, finished_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(match_id,profile_id)
);
CREATE TABLE IF NOT EXISTS reports (
 id uuid PRIMARY KEY, contribution_id uuid NOT NULL REFERENCES contributions(id), reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
 reason text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contribution_id,reporter_id)
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
-- Upload adapter remains private and unbound until a licence/storage acceptance check passes.
CREATE TABLE IF NOT EXISTS media_assets (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES profiles(id), contribution_id uuid REFERENCES contributions(id),
 storage_key text NOT NULL UNIQUE, mime text NOT NULL, bytes integer NOT NULL, sha256 text NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('audio','image','video','evidence')),
 status text NOT NULL DEFAULT 'private' CHECK(status IN ('private','reviewed','removed')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS game_types (id text PRIMARY KEY, config jsonb NOT NULL);
INSERT INTO game_types VALUES ('guess-song','{"answerTypes":["choice","text"],"maxPlayers":10,"mediaIndependent":true}') ON CONFLICT DO NOTHING;
