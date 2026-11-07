-- Create enum types
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'arrived', 'seated', 'completed', 'cancelled', 'no_show');
CREATE TYPE reservation_channel AS ENUM ('website', 'instagram', 'google', 'whatsapp', 'walk_in', 'phone', 'host', 'chope_import');
CREATE TYPE venue_role AS ENUM ('host', 'admin');
CREATE TYPE actor_type AS ENUM ('user', 'guest', 'system');

-- venues
CREATE TABLE venues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    time_zone text NOT NULL,
    tagline text NOT NULL,
    intro text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    whatsapp text NOT NULL,
    email text NOT NULL,
    maps_url text NOT NULL,
    booking_interval_minutes smallint NOT NULL DEFAULT 30,
    party_min smallint NOT NULL DEFAULT 1,
    party_max smallint NOT NULL DEFAULT 8,
    dining_minutes smallint NOT NULL DEFAULT 120,
    lead_time_minutes smallint NOT NULL DEFAULT 60,
    cutoff_minutes smallint NOT NULL DEFAULT 120,
    no_show_target_percent smallint NOT NULL DEFAULT 8,
    over_capacity_alert_percent smallint NOT NULL DEFAULT 85,
    cancellation_policy text NOT NULL,
    feedback_title text,
    feedback_subtitle text,
    feedback_tags text[] NOT NULL DEFAULT '{}',
    feedback_message_template text NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now()
);

-- opening_hours
CREATE TABLE opening_hours (
    venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    weekday smallint NOT NULL,
    open_minute smallint NOT NULL,
    close_minute smallint NOT NULL,
    PRIMARY KEY (venue_id, weekday)
);

-- closed_dates
CREATE TABLE closed_dates (
    venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    date date NOT NULL,
    reason text,
    PRIMARY KEY (venue_id, date)
);

-- seating_areas
CREATE TABLE seating_areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES venues(id),
    name text NOT NULL,
    capacity smallint NOT NULL,
    bookable boolean NOT NULL DEFAULT true,
    min_party smallint,
    max_party smallint,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    UNIQUE (venue_id, name),
    UNIQUE (id, venue_id)
);

-- guests
CREATE TABLE guests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES venues(id),
    full_name text NOT NULL,
    phone text,
    email text,
    country text,
    allergies text[] NOT NULL DEFAULT '{}',
    accessibility text,
    seating_preference text,
    notes text,
    marketing_consent boolean NOT NULL DEFAULT false,
    marketing_consent_at timestamptz(6),
    anonymized_at timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    UNIQUE (venue_id, phone),
    UNIQUE (id, venue_id)
);

-- reservations
CREATE TABLE reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES venues(id),
    booking_code text NOT NULL UNIQUE,
    guest_id uuid NOT NULL,
    seating_area_id uuid NOT NULL,
    starts_at timestamptz(6) NOT NULL,
    party_size smallint NOT NULL,
    occasion text,
    guest_notes text,
    internal_notes text,
    source reservation_channel NOT NULL,
    status reservation_status NOT NULL,
    idempotency_key uuid UNIQUE,
    created_by_id uuid,
    updated_by_id uuid,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now()
);

-- reservation_status_events
CREATE TABLE reservation_status_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid NOT NULL REFERENCES reservations(id),
    from_status reservation_status,
    to_status reservation_status NOT NULL,
    actor_type actor_type NOT NULL,
    actor_user_id uuid,
    reason text,
    at timestamptz(6) NOT NULL DEFAULT now()
);

-- feedback
CREATE TABLE feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES venues(id),
    reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id),
    rating smallint NOT NULL,
    comments text NOT NULL,
    service_tags text[] NOT NULL DEFAULT '{}',
    submitted_at timestamptz(6) NOT NULL DEFAULT now()
);

-- users
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    login text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    is_super_admin boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now()
);

-- user_venues
CREATE TABLE user_venues (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    role venue_role NOT NULL,
    PRIMARY KEY (user_id, venue_id)
);

-- sessions
CREATE TABLE sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz(6) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now()
);

-- audit_events
CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid REFERENCES venues(id),
    actor_type actor_type NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    changes json,
    note text,
    request_id text,
    at timestamptz(6) NOT NULL DEFAULT now()
);

-- Composite foreign keys on reservations
ALTER TABLE reservations
    ADD CONSTRAINT reservations_guest_fk FOREIGN KEY (guest_id, venue_id) REFERENCES guests(id, venue_id);
ALTER TABLE reservations
    ADD CONSTRAINT reservations_area_fk FOREIGN KEY (seating_area_id, venue_id) REFERENCES seating_areas(id, venue_id);

-- Indexes
CREATE INDEX idx_reservations_venue_starts_at ON reservations(venue_id, starts_at);
CREATE INDEX idx_reservations_area_starts_at ON reservations(seating_area_id, starts_at);
CREATE INDEX idx_reservations_guest_starts_at ON reservations(guest_id, starts_at);
CREATE INDEX idx_status_events_reservation_at ON reservation_status_events(reservation_id, at);
CREATE INDEX idx_feedback_venue_submitted ON feedback(venue_id, submitted_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_audit_events_venue_at ON audit_events(venue_id, at);
CREATE INDEX idx_audit_events_actor_user ON audit_events(actor_user_id);

-- Integrity constraints
ALTER TABLE venues ADD CONSTRAINT venues_party_range CHECK (party_min >= 1 AND party_min <= party_max);
ALTER TABLE venues ADD CONSTRAINT venues_slug_format CHECK (slug ~ '^[a-z0-9-]{2,40}$');
ALTER TABLE venues ADD CONSTRAINT venues_dining_minutes CHECK (dining_minutes > 0);
ALTER TABLE opening_hours ADD CONSTRAINT opening_hours_valid
    CHECK (weekday BETWEEN 0 AND 6 AND open_minute >= 0 AND open_minute < close_minute AND close_minute <= 1440);
ALTER TABLE seating_areas ADD CONSTRAINT seating_areas_capacity CHECK (capacity > 0);
ALTER TABLE seating_areas ADD CONSTRAINT seating_areas_party_range
    CHECK (min_party IS NULL OR max_party IS NULL OR min_party <= max_party);
ALTER TABLE reservations ADD CONSTRAINT reservations_party_size CHECK (party_size BETWEEN 1 AND 100);
ALTER TABLE reservation_status_events ADD CONSTRAINT status_events_changed
    CHECK (from_status IS DISTINCT FROM to_status);
ALTER TABLE reservation_status_events ADD CONSTRAINT status_events_actor
    CHECK ((actor_type = 'user') = (actor_user_id IS NOT NULL));
ALTER TABLE feedback ADD CONSTRAINT feedback_rating CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE users ADD CONSTRAINT users_login_lower CHECK (login = lower(login));
ALTER TABLE guests ADD CONSTRAINT guests_lengths
    CHECK (length(full_name) <= 120 AND length(coalesce(notes, '')) <= 2000);
ALTER TABLE guests ADD CONSTRAINT guests_email_length CHECK (email IS NULL OR length(email) <= 254);
ALTER TABLE venues ADD CONSTRAINT venues_timing_ranges
    CHECK (booking_interval_minutes > 0 AND lead_time_minutes >= 0 AND cutoff_minutes >= 0);
ALTER TABLE venues ADD CONSTRAINT venues_percent_ranges
    CHECK (no_show_target_percent BETWEEN 0 AND 100 AND over_capacity_alert_percent BETWEEN 0 AND 100);
ALTER TABLE seating_areas ADD CONSTRAINT seating_areas_min_party CHECK (min_party IS NULL OR min_party > 0);

-- The app role may not rewrite history.
REVOKE UPDATE, DELETE ON audit_events, reservation_status_events FROM gioi_app;
