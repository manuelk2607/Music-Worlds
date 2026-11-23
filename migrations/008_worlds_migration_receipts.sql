ALTER TABLE public.worlds_identity_links
 ADD COLUMN legacy_migration boolean NOT NULL DEFAULT false;

CREATE TABLE public.worlds_migration_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 issuer text NOT NULL,
 subject text NOT NULL,
 local_profile_id uuid NOT NULL,
 event text NOT NULL CHECK (event IN ('linked','unlinked')),
 receipt_reported_at timestamptz,
 receipt_conflict_at timestamptz
);
REVOKE ALL ON public.worlds_migration_audit FROM PUBLIC;

CREATE INDEX worlds_migration_receipts_pending ON public.worlds_migration_audit(issuer,id)
 WHERE receipt_reported_at IS NULL AND receipt_conflict_at IS NULL;

CREATE FUNCTION public.worlds_queue_migration_receipt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.legacy_migration THEN
   INSERT INTO public.worlds_migration_audit(issuer,subject,local_profile_id,event)
   VALUES (OLD.issuer,OLD.subject,OLD.local_profile_id,'unlinked');
  END IF;
  RETURN OLD;
 END IF;
 IF NEW.legacy_migration AND (TG_OP='INSERT' OR NOT OLD.legacy_migration) THEN
  INSERT INTO public.worlds_migration_audit(issuer,subject,local_profile_id,event)
  VALUES (NEW.issuer,NEW.subject,NEW.local_profile_id,'linked');
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.worlds_queue_migration_receipt() FROM PUBLIC;
CREATE TRIGGER worlds_queue_migration_receipt
 AFTER INSERT OR UPDATE OF legacy_migration OR DELETE ON public.worlds_identity_links
 FOR EACH ROW EXECUTE FUNCTION public.worlds_queue_migration_receipt();

CREATE FUNCTION public.worlds_stage_reviewed_guest_receipt(identity_issuer text, identity_subject text, profile_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH written AS (
  UPDATE public.worlds_identity_links link
  SET legacy_migration=true
  FROM public.profiles profile
  WHERE link.issuer=identity_issuer AND link.subject=identity_subject AND link.local_profile_id=profile_id
   AND profile.id=link.local_profile_id AND profile.created_at<link.linked_at
   AND NOT link.legacy_migration RETURNING 1
 )
 SELECT EXISTS(SELECT 1 FROM written);
$$;

CREATE FUNCTION public.worlds_pending_migration_receipts(identity_issuer text)
RETURNS TABLE(revision text, subject text, local_profile_id uuid, event text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT audit.id::text,audit.subject,audit.local_profile_id,audit.event
 FROM public.worlds_migration_audit audit
 WHERE audit.issuer=identity_issuer AND audit.receipt_reported_at IS NULL AND audit.receipt_conflict_at IS NULL
 ORDER BY audit.id LIMIT 10;
$$;

CREATE FUNCTION public.worlds_finish_migration_receipt(identity_issuer text, receipt_id bigint, accepted boolean)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH written AS (
  UPDATE public.worlds_migration_audit
  SET receipt_reported_at=CASE WHEN accepted THEN now() END,
      receipt_conflict_at=CASE WHEN NOT accepted THEN now() END
  WHERE issuer=identity_issuer AND id=receipt_id AND accepted IS NOT NULL
   AND receipt_reported_at IS NULL AND receipt_conflict_at IS NULL
  RETURNING 1
 )
 SELECT EXISTS(SELECT 1 FROM written);
$$;

REVOKE ALL ON FUNCTION public.worlds_stage_reviewed_guest_receipt(text,text,uuid),
 public.worlds_pending_migration_receipts(text), public.worlds_finish_migration_receipt(text,bigint,boolean) FROM PUBLIC;
DO $grants$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='music_worlds_app') THEN
  GRANT EXECUTE ON FUNCTION public.worlds_stage_reviewed_guest_receipt(text,text,uuid),
   public.worlds_pending_migration_receipts(text), public.worlds_finish_migration_receipt(text,bigint,boolean) TO music_worlds_app;
 END IF;
END;
$grants$;
