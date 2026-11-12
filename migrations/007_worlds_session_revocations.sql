CREATE TABLE public.worlds_session_revocations (
 issuer text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 2048),
 subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 512),
 revoked_through bigint NOT NULL CHECK (revoked_through > 0),
 PRIMARY KEY (issuer,subject)
);
REVOKE ALL ON public.worlds_session_revocations FROM PUBLIC;

DO $grants$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='music_worlds_app') THEN
  GRANT SELECT,INSERT,UPDATE(revoked_through) ON public.worlds_session_revocations TO music_worlds_app;
  GRANT SELECT,INSERT,DELETE ON public.worlds_auth_transactions,public.worlds_auth_sessions,
   public.worlds_auth_replays,public.worlds_guest_link_proofs TO music_worlds_app;
  GRANT SELECT,INSERT ON public.worlds_identity_links TO music_worlds_app;
 END IF;
END;
$grants$;

-- A guest token is minted only on creation of its profile. Every guest
-- credential for an already-linked profile predates its central sign-out.
CREATE FUNCTION public.worlds_revoke_guest_sessions() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 DELETE FROM public.sessions s USING public.worlds_identity_links l
 WHERE l.issuer=NEW.issuer AND l.subject=NEW.subject AND s.profile_id=l.local_profile_id;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.worlds_revoke_guest_sessions() FROM PUBLIC;
CREATE TRIGGER worlds_revoke_guest_sessions AFTER INSERT OR UPDATE ON public.worlds_session_revocations
 FOR EACH ROW EXECUTE FUNCTION public.worlds_revoke_guest_sessions();

-- An old guest credential must not survive when the first link is confirmed
-- after a revocation was already received for its central identity.
CREATE FUNCTION public.worlds_revoke_late_link_guest_sessions() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.worlds_session_revocations r
  WHERE r.issuer=NEW.issuer AND r.subject=NEW.subject) THEN
  DELETE FROM public.sessions WHERE profile_id=NEW.local_profile_id;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.worlds_revoke_late_link_guest_sessions() FROM PUBLIC;
CREATE TRIGGER worlds_revoke_late_link_guest_sessions AFTER INSERT ON public.worlds_identity_links
 FOR EACH ROW EXECUTE FUNCTION public.worlds_revoke_late_link_guest_sessions();
