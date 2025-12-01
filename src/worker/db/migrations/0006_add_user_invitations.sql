-- Add user_invitations table for super-admin user management
CREATE TABLE user_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by TEXT REFERENCES user(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX user_invitations_email_idx ON user_invitations(email);
CREATE INDEX user_invitations_token_idx ON user_invitations(token);
CREATE INDEX user_invitations_status_idx ON user_invitations(status);
