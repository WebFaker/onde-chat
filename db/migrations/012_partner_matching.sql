ALTER TABLE exchange_profiles ADD COLUMN objectives text[] NOT NULL DEFAULT '{}';
ALTER TABLE exchange_profiles ADD COLUMN formats text[] NOT NULL DEFAULT '{texte}';
ALTER TABLE exchange_profiles ADD COLUMN availability text[] NOT NULL DEFAULT '{}';
ALTER TABLE exchange_profiles ADD COLUMN timezone text NOT NULL DEFAULT 'UTC';
ALTER TABLE exchange_profiles ADD COLUMN latitude numeric(4,1);
ALTER TABLE exchange_profiles ADD COLUMN longitude numeric(4,1);
ALTER TABLE exchange_profiles ADD COLUMN location_city text NOT NULL DEFAULT '';
ALTER TABLE exchange_profiles ADD COLUMN location_country text NOT NULL DEFAULT '';
ALTER TABLE exchange_profiles ADD COLUMN located_at timestamptz;
ALTER TABLE exchange_profiles ADD CONSTRAINT exchange_location_valid CHECK((latitude IS NULL)=(longitude IS NULL) AND (latitude IS NULL OR latitude BETWEEN -90 AND 90) AND (longitude IS NULL OR longitude BETWEEN -180 AND 180));
ALTER TABLE exchange_profiles ADD COLUMN levels jsonb NOT NULL DEFAULT '{}';
ALTER TABLE exchange_profiles ADD CONSTRAINT exchange_objectives_limit CHECK(cardinality(objectives)<=3 AND cardinality(formats)<=3 AND cardinality(availability)<=6);
CREATE TABLE partner_choices (
 user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 target_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 choice text NOT NULL CHECK(choice IN ('saved','passed')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,target_id),CHECK(user_id<>target_id)
);
CREATE TABLE exchange_invitations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sender_id uuid NOT NULL REFERENCES profiles(id),
 recipient_id uuid NOT NULL REFERENCES profiles(id),
 introduction text NOT NULL CHECK(length(introduction) BETWEEN 3 AND 240),
 proposed_at timestamptz,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 responded_at timestamptz,
 CHECK(sender_id<>recipient_id)
);
CREATE INDEX exchange_invites_inbox_idx ON exchange_invitations(recipient_id,created_at DESC);
CREATE INDEX exchange_invites_outbox_idx ON exchange_invitations(sender_id,created_at DESC);
CREATE UNIQUE INDEX exchange_invite_pair_idx ON exchange_invitations(LEAST(sender_id,recipient_id),GREATEST(sender_id,recipient_id)) WHERE status='pending';
