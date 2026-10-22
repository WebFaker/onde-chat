CREATE TABLE exchange_profiles (
 user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
 spoken text[] NOT NULL DEFAULT '{}',
 learning text[] NOT NULL DEFAULT '{}',
 interests text[] NOT NULL DEFAULT '{}',
 goal text NOT NULL DEFAULT '' CHECK(length(goal)<=160),
 discoverable boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(cardinality(spoken)<=3 AND cardinality(learning)<=3 AND cardinality(interests)<=5),
 CHECK(NOT discoverable OR (cardinality(spoken)>0 AND cardinality(learning)>0))
);
CREATE INDEX exchange_discover_idx ON exchange_profiles(user_id) WHERE discoverable;
CREATE TABLE duo_sessions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 channel_id bigint NOT NULL REFERENCES channels(id),
 offered_by uuid NOT NULL REFERENCES profiles(id),
 first_language text NOT NULL,
 second_language text NOT NULL,
 minutes integer NOT NULL CHECK(minutes IN (5,10,15,20)),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','ended')),
 created_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz,
 ended_at timestamptz,
 CHECK(first_language<>second_language)
);
CREATE INDEX duo_channel_idx ON duo_sessions(channel_id,id DESC);
CREATE UNIQUE INDEX duo_open_idx ON duo_sessions(channel_id) WHERE status<>'ended';
