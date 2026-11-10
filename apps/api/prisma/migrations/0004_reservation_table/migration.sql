-- A reservation can hold one floor table. Deleting a table (layout save) releases it, keeping the reservation.
ALTER TABLE reservations ADD COLUMN table_id uuid REFERENCES floor_tables(id) ON DELETE SET NULL;

CREATE INDEX reservations_table_id_starts_at_idx ON reservations(table_id, starts_at);
