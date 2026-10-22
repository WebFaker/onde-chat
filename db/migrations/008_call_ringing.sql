CREATE TABLE call_invites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 channel_id integer NOT NULL REFERENCES channels(id),
 caller_id uuid NOT NULL REFERENCES profiles(id),
 callee_id uuid NOT NULL REFERENCES profiles(id),
 status text NOT NULL DEFAULT 'ringing' CHECK(status IN ('ringing','accepted','declined','cancelled','ended','expired')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '45 seconds',
 CHECK(caller_id<>callee_id)
);
CREATE INDEX call_invites_caller_idx ON call_invites(caller_id,created_at DESC);
CREATE INDEX call_invites_callee_idx ON call_invites(callee_id,created_at DESC);
