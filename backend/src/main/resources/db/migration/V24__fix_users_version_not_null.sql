-- V24: Fix NULL version values on seeded users to prevent Hibernate @Version NullPointerException
UPDATE users SET version = 0 WHERE version IS NULL;
ALTER TABLE users ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN version SET NOT NULL;
