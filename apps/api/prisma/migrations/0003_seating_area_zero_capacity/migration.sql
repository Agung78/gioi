-- Seating areas are managed from the floor plan; an area with no tables has capacity 0 until tables are placed.
ALTER TABLE seating_areas DROP CONSTRAINT seating_areas_capacity;
ALTER TABLE seating_areas ADD CONSTRAINT seating_areas_capacity CHECK (capacity >= 0);
