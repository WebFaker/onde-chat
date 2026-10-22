CREATE TABLE site_admins (
 profile_id uuid PRIMARY KEY REFERENCES profiles(id),
 auth_user_id text NOT NULL UNIQUE REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ADD COLUMN suspended_at timestamptz;
ALTER TABLE profiles ADD COLUMN suspension_reason text NOT NULL DEFAULT '' CHECK(length(suspension_reason)<=300);
ALTER TABLE servers ADD COLUMN archived_at timestamptz;
ALTER TABLE channels ADD COLUMN archived_at timestamptz;
CREATE TABLE admin_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES profiles(id),
 action text NOT NULL,
 target text NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 300),
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON admin_audit(created_at DESC);
