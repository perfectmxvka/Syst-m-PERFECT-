-- Run once in Supabase SQL Editor, after the verified import.
-- Existing documents and counts are preserved. Duplicate identifiers fail loudly.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS perfect_source_documents_identity
  ON perfect_import.source_documents (collection, document_id);
CREATE INDEX IF NOT EXISTS perfect_source_documents_rows
  ON perfect_import.source_documents (collection, (document #> '{kind}'), (document #> '{sheet}'), (document #> '{index}'));
CREATE INDEX IF NOT EXISTS perfect_source_documents_names
  ON perfect_import.source_documents (collection, (document #> '{name}'));
-- This table contains login hashes and internal state. Only the server's direct
-- database connection may access it; do not expose perfect_import via Data API.
ALTER TABLE perfect_import.source_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA perfect_import FROM PUBLIC, anon, authenticated;
REVOKE ALL ON perfect_import.source_documents FROM PUBLIC, anon, authenticated;
COMMIT;
