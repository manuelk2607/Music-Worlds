CREATE TABLE worlds_guest_link_proofs (
 proof_hash text PRIMARY KEY,
 central_session_id text NOT NULL REFERENCES worlds_auth_sessions(id) ON DELETE CASCADE,
 guest_session_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
 local_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX worlds_guest_link_proofs_expiry ON worlds_guest_link_proofs(expires_at);
CREATE INDEX worlds_guest_link_proofs_central ON worlds_guest_link_proofs(central_session_id);
CREATE INDEX worlds_guest_link_proofs_guest ON worlds_guest_link_proofs(guest_session_hash);
CREATE INDEX worlds_guest_link_proofs_profile ON worlds_guest_link_proofs(local_profile_id);
