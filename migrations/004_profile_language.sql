ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de';
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_language CHECK(language IN ('de','en'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
