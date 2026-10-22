-- Bounded persistent counters: one row per account and category.
CREATE TABLE api_limits (
 user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 bucket text NOT NULL,
 window_start timestamptz NOT NULL,
 hits integer NOT NULL,
 PRIMARY KEY(user_id,bucket)
);
