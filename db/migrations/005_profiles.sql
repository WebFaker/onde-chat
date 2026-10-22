ALTER TABLE profiles ADD COLUMN status text NOT NULL DEFAULT 'online' CHECK(status IN ('online','idle','dnd','invisible'));
ALTER TABLE profiles ADD COLUMN custom_status text NOT NULL DEFAULT '' CHECK(length(custom_status)<=80);
ALTER TABLE profiles ADD COLUMN accent_color text NOT NULL DEFAULT '#5865f2' CHECK(accent_color ~ '^#[0-9a-f]{6}$');
CREATE TABLE profile_media (
 user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('avatar','banner')),
 version uuid NOT NULL DEFAULT gen_random_uuid(),
 bytes bytea NOT NULL,
 size integer NOT NULL CHECK(size BETWEEN 1 AND 524288),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,kind)
);
