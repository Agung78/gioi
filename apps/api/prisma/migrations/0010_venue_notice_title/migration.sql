-- Separate headline from body. Backfill from the legacy "*****HEADLINE***** body" convention.
ALTER TABLE venues ADD COLUMN notice_title text NOT NULL DEFAULT '';

UPDATE venues v
SET notice_title = s.m[1], notice_text = s.m[2]
FROM (
    SELECT id, regexp_match(btrim(notice_text), '^\*+\s*(.+?)\s*\*+\s*([\s\S]*)$') AS m FROM venues
) s
WHERE v.id = s.id AND s.m IS NOT NULL;
