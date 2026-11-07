-- gioi database role setup.
-- Run once against the target database (e.g. `docker exec gioi-pg psql -U postgres -d gioi -f scripts/db-roles.sql`).

-- Migration owner role. Used by `prisma migrate deploy`; owns the schema and all tables it creates.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gioi_owner') THEN
    CREATE ROLE gioi_owner LOGIN PASSWORD 'owner_password';
  END IF;
END
$$;

-- Ensure gioi_app exists and is a login role (created in week 2).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gioi_app') THEN
    CREATE ROLE gioi_app LOGIN PASSWORD 'password';
  END IF;
END
$$;

-- Transfer ownership of schema public to the migration owner so gioi_app is not a table owner.
ALTER SCHEMA public OWNER TO gioi_owner;

-- Grants for the migration owner (full DDL/DML on schema).
GRANT USAGE, CREATE ON SCHEMA public TO gioi_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gioi_owner;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gioi_owner;
ALTER DEFAULT PRIVILEGES FOR ROLE gioi_owner IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO gioi_owner;
ALTER DEFAULT PRIVILEGES FOR ROLE gioi_owner IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO gioi_owner;

-- Runtime role: gioi_app. DML on mutable tables only.
GRANT USAGE ON SCHEMA public TO gioi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gioi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gioi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gioi_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gioi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gioi_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO gioi_app;
