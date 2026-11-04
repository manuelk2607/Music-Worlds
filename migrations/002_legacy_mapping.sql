CREATE TABLE IF NOT EXISTS legacy_imports (
 source_project text NOT NULL, source_id uuid NOT NULL, target_id uuid NOT NULL REFERENCES contributions(id),
 source_revision integer NOT NULL, source_author_reference text, archive_checksum text NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(source_project,source_id)
);
