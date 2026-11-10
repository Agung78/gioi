-- Minutes after a reservation's start before an unarrived table holder is "late" and staff may give the table to a walk-in.
ALTER TABLE venues ADD COLUMN grace_minutes smallint NOT NULL DEFAULT 15;
