CREATE TABLE IF NOT EXISTS room_presence (
 room_code varchar(8) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
 profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 last_seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_code,profile_id)
);
