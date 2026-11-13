-- Optional one-slot event override (special notice with name + time).
ALTER TABLE venues
    ADD COLUMN notice_event_name text,
    ADD COLUMN notice_event_time text;
