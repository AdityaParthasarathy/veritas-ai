-- VERITAS AI Database Initialization
-- Phase 1: Base database setup

-- Ensure uuid-ossp extension is available if needed for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log completion of init script
DO $$
BEGIN
    RAISE NOTICE 'VERITAS AI database initialized successfully.';
END $$;
