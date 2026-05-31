ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_city VARCHAR(100);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_state VARCHAR(100);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_latitude NUMERIC(10, 7);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_longitude NUMERIC(10, 7);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_location_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_role_profile_city_state
ON users (role, profile_state, profile_city);

CREATE INDEX IF NOT EXISTS idx_users_profile_coordinates
ON users (profile_latitude, profile_longitude);
