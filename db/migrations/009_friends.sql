CREATE TABLE friendships (
 low_id uuid NOT NULL REFERENCES profiles(id),
 high_id uuid NOT NULL REFERENCES profiles(id),
 requester_id uuid NOT NULL REFERENCES profiles(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(low_id,high_id), CHECK(low_id<high_id),
 CHECK(requester_id IN (low_id,high_id))
);
CREATE INDEX friendships_high_idx ON friendships(high_id);
CREATE TABLE user_blocks (
 user_id uuid NOT NULL REFERENCES profiles(id),
 blocked_id uuid NOT NULL REFERENCES profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,blocked_id),CHECK(user_id<>blocked_id)
);
CREATE INDEX user_blocks_blocked_idx ON user_blocks(blocked_id);
-- Existing private conversations remain usable, with their history intact.
INSERT INTO friendships(low_id,high_id,requester_id,status)
SELECT a.user_id,b.user_id,a.user_id,'accepted' FROM dm_members a JOIN dm_members b ON a.channel_id=b.channel_id AND a.user_id<b.user_id ON CONFLICT DO NOTHING;

ALTER TABLE messages ADD COLUMN client_id uuid;
CREATE UNIQUE INDEX messages_client_id_idx ON messages(user_id,client_id) WHERE client_id IS NOT NULL;
