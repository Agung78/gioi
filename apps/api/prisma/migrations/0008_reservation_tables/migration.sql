-- A reservation can hold several floor tables. table_id moves into a join table.
CREATE TABLE reservation_tables (
    reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    table_id       uuid NOT NULL REFERENCES floor_tables(id) ON DELETE CASCADE,
    PRIMARY KEY (reservation_id, table_id)
);
CREATE INDEX reservation_tables_table_id_idx ON reservation_tables(table_id);

INSERT INTO reservation_tables(reservation_id, table_id)
    SELECT id, table_id FROM reservations WHERE table_id IS NOT NULL;

DROP INDEX reservations_table_id_starts_at_idx;
ALTER TABLE reservations DROP COLUMN table_id;
