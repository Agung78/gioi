-- Optional special notice shown (and to be acknowledged) when a guest books on notice_date.
ALTER TABLE venues
    ADD COLUMN notice_enabled boolean NOT NULL DEFAULT false,
    ADD COLUMN notice_date date,
    ADD COLUMN notice_text text NOT NULL DEFAULT '';
