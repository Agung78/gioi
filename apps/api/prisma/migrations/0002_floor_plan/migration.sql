-- docs/floor_plan_seating.md

-- floor_plans: one backdrop drawing per venue (super admin upload). NULL image = plain canvas.
CREATE TABLE floor_plans (
    venue_id uuid PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
    image text,
    width smallint NOT NULL DEFAULT 1200,
    height smallint NOT NULL DEFAULT 900,
    updated_at timestamptz(6) NOT NULL DEFAULT now()
);

-- floor_tables: seated tables; seats per area are summed into seating_areas.capacity by the API
CREATE TABLE floor_tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    seating_area_id uuid NOT NULL,
    seats smallint NOT NULL,
    x real NOT NULL,
    y real NOT NULL,
    rotation smallint NOT NULL DEFAULT 0,
    -- composite FK: a table can only sit in a seating area of its own venue
    CONSTRAINT floor_tables_area_fk FOREIGN KEY (seating_area_id, venue_id)
        REFERENCES seating_areas(id, venue_id) ON DELETE CASCADE
);

-- floor_objects: non-seated objects (stage, bar, …)
CREATE TABLE floor_objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    label text NOT NULL DEFAULT '',
    width smallint NOT NULL,
    height smallint NOT NULL,
    color text NOT NULL,
    x real NOT NULL,
    y real NOT NULL,
    rotation smallint NOT NULL DEFAULT 0
);

CREATE INDEX floor_tables_venue_id_idx ON floor_tables(venue_id);
CREATE INDEX floor_tables_seating_area_id_idx ON floor_tables(seating_area_id);
CREATE INDEX floor_objects_venue_id_idx ON floor_objects(venue_id);

ALTER TABLE floor_plans ADD CONSTRAINT floor_plans_size
    CHECK (width BETWEEN 100 AND 4000 AND height BETWEEN 100 AND 4000);
ALTER TABLE floor_plans ADD CONSTRAINT floor_plans_image
    CHECK (image IS NULL OR (image ~ '^data:image/(svg\+xml|png|jpeg|webp);base64,' AND length(image) <= 4000000));
ALTER TABLE floor_tables ADD CONSTRAINT floor_tables_seats CHECK (seats BETWEEN 1 AND 16);
ALTER TABLE floor_tables ADD CONSTRAINT floor_tables_rotation CHECK (rotation BETWEEN 0 AND 359);
ALTER TABLE floor_objects ADD CONSTRAINT floor_objects_size
    CHECK (width BETWEEN 20 AND 600 AND height BETWEEN 20 AND 600);
ALTER TABLE floor_objects ADD CONSTRAINT floor_objects_rotation CHECK (rotation BETWEEN 0 AND 359);
ALTER TABLE floor_objects ADD CONSTRAINT floor_objects_label CHECK (length(label) <= 24);
ALTER TABLE floor_objects ADD CONSTRAINT floor_objects_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
