CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type') THEN
    CREATE TYPE ticket_type AS ENUM ('hardware', 'software', 'bug');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM (
      'open',
      'assigned',
      'in_progress',
      'resolved',
      'closed',
      'on_hold',
      'pending_routing'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
    CREATE TYPE oauth_provider AS ENUM ('google');
  END IF;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL,
  email_is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url VARCHAR(255),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type ticket_type NOT NULL,
  priority ticket_priority NOT NULL,
  status ticket_status NOT NULL,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  replication_steps TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ticket assignments
CREATE TABLE IF NOT EXISTS ticket_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Satisfaction ratings (1:1 per ticket)
CREATE TABLE IF NOT EXISTS satisfaction_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL,
  comment TEXT
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments (ticket_id, created_at ASC);

-- Chat conversations (one per user-to-support thread)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations (user_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT,
  image_url VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages (conversation_id, created_at ASC);

-- OAuth accounts
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  provider_user_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email verifications
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- If the table already exists (from an older init.sql), ensure the OTP column exists too.
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

-- Password resets
CREATE TABLE IF NOT EXISTS password_reset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT NOT NULL,
  ipaddress TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower_unique ON categories ((lower(name)));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_by ON tickets (submitted_by);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets (category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets (status, priority);
CREATE INDEX IF NOT EXISTS idx_ticket_assignment_active ON ticket_assignment (ticket_id, assigned_to, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications (user_id, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset (user_id, used_at, expires_at);

CREATE OR REPLACE VIEW admin_workload AS
SELECT
  u.id AS admin_id,
  u.email,
  u.first_name,
  u.last_name,
  COALESCE(SUM(CASE WHEN t.priority = 'P1' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_1_count,
  COALESCE(SUM(CASE WHEN t.priority = 'P2' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_2_count,
  COALESCE(SUM(CASE WHEN t.priority = 'P3' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_3_count,
  COALESCE(SUM(CASE WHEN t.priority = 'P4' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_4_count,
  COALESCE(COUNT(CASE WHEN t.status IN ('open', 'assigned', 'in_progress') THEN 1 END), 0)::int AS total_open,
  (
    COALESCE(SUM(CASE WHEN t.priority = 'P1' AND t.status IN ('open', 'assigned', 'in_progress') THEN 3 ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.priority = 'P2' AND t.status IN ('open', 'assigned', 'in_progress') THEN 2 ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.priority = 'P3' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.priority = 'P4' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)
  )::int AS load_score
FROM users u
LEFT JOIN ticket_assignment ta
  ON ta.assigned_to = u.id
 AND ta.is_active = TRUE
LEFT JOIN tickets t
  ON t.id = ta.ticket_id
WHERE u.role = 'admin'
GROUP BY u.id, u.email, u.first_name, u.last_name;

-- Seed users for local development and demos.
INSERT INTO users (
  email, password_hash, first_name, last_name, role, status, email_is_verified, approved_at
)
VALUES (
  lower('ynrdevs@gmail.com'),
  crypt('Nachiketh1', gen_salt('bf')),
  'Nachiketh',
  'Reddy',
  'super_admin'::user_role,
  'active'::user_status,
  TRUE,
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    email_is_verified = EXCLUDED.email_is_verified,
    approved_at = COALESCE(users.approved_at, NOW());

INSERT INTO users (
  email, password_hash, first_name, last_name, role, status, email_is_verified, approved_by, approved_at
)
SELECT
  lower(seed.email),
  crypt(seed.password, gen_salt('bf')),
  seed.first_name,
  seed.last_name,
  seed.role::user_role,
  seed.status::user_status,
  seed.email_is_verified,
  (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')),
  CASE WHEN seed.status = 'active' THEN NOW() ELSE NULL END
FROM (
  VALUES
    ('admin.hardware@lumina.test', 'Testpass1', 'Harper', 'Hardware', 'admin', 'active', TRUE),
    ('admin.software@lumina.test', 'Testpass1', 'Sage', 'Software', 'admin', 'active', TRUE),
    ('admin.bugs@lumina.test', 'Testpass1', 'Bianca', 'Bugs', 'admin', 'active', TRUE),
    ('admin.ops@lumina.test', 'Testpass1', 'Opal', 'Ops', 'admin', 'active', TRUE),
    ('admin.qa@lumina.test', 'Testpass1', 'Quinn', 'Assurance', 'admin', 'active', TRUE),
    ('alice.user@lumina.test', 'Testpass1', 'Alice', 'User', 'user', 'active', TRUE),
    ('bob.user@lumina.test', 'Testpass1', 'Bob', 'User', 'user', 'active', TRUE),
    ('carol.user@lumina.test', 'Testpass1', 'Carol', 'User', 'user', 'active', TRUE),
    ('dan.user@lumina.test', 'Testpass1', 'Dan', 'User', 'user', 'active', TRUE),
    ('eve.user@lumina.test', 'Testpass1', 'Eve', 'User', 'user', 'active', TRUE),
    ('pending.user1@lumina.test', 'Testpass1', 'Pending', 'UserOne', 'user', 'pending', TRUE),
    ('pending.user2@lumina.test', 'Testpass1', 'Pending', 'UserTwo', 'user', 'pending', TRUE),
    ('pending.user3@lumina.test', 'Testpass1', 'Pending', 'UserThree', 'user', 'pending', TRUE),
    ('pending.admin1@lumina.test', 'Testpass1', 'Pending', 'AdminOne', 'admin', 'pending', TRUE),
    ('pending.admin2@lumina.test', 'Testpass1', 'Pending', 'AdminTwo', 'admin', 'pending', TRUE)
) AS seed(email, password, first_name, last_name, role, status, email_is_verified)
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    email_is_verified = EXCLUDED.email_is_verified,
    approved_by = EXCLUDED.approved_by,
    approved_at = COALESCE(users.approved_at, EXCLUDED.approved_at);

INSERT INTO categories (name, description, created_by, is_active)
SELECT *
FROM (
  SELECT 'Hardware Support', 'Device issues, peripherals, and workstation setup', (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')), TRUE
  UNION ALL
  SELECT 'Software Support', 'Application access, account tooling, and configuration help', (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')), TRUE
  UNION ALL
  SELECT 'Bug Reports', 'Crashes, defects, and reproducible product issues', (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')), TRUE
) AS seeded_categories(name, description, created_by, is_active)
ON CONFLICT DO NOTHING;

INSERT INTO tickets (
  title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata
)
SELECT
  seed.title,
  seed.description,
  c.id,
  seed.type::ticket_type,
  seed.priority::ticket_priority,
  seed.status::ticket_status,
  u.id,
  seed.replication_steps,
  seed.metadata::jsonb
FROM (
  VALUES
    ('Laptop screen flickering', 'The display flickers whenever I open design software.', 'Hardware Support', 'hardware', 'P2', 'assigned', 'alice.user@lumina.test', 'Open Illustrator and resize the window.', '{"source":"seed","routing":{"source":"seed","reasoning":"Balanced to least-loaded admin."}}'),
    ('VPN login blocked', 'The VPN rejects my password after the latest reset.', 'Software Support', 'software', 'P1', 'in_progress', 'bob.user@lumina.test', 'Open VPN client and attempt login.', '{"source":"seed","routing":{"source":"seed","reasoning":"Critical auth issue routed to active admin."}}'),
    ('App crashes on startup', 'The app closes instantly after showing the splash screen.', 'Bug Reports', 'bug', 'P1', 'open', 'carol.user@lumina.test', 'Launch app on Windows 11 after fresh install.', '{"source":"seed","routing":{"source":"seed","reasoning":"Awaiting active investigation."}}'),
    ('Keyboard replacement request', 'Several keys are sticking and no longer register.', 'Hardware Support', 'hardware', 'P3', 'resolved', 'dan.user@lumina.test', 'Issue persists across multiple reboots.', '{"source":"seed"}'),
    ('Reporting export timeout', 'CSV export times out after around 30 seconds.', 'Software Support', 'software', 'P2', 'assigned', 'eve.user@lumina.test', 'Run export from finance dashboard.', '{"source":"seed"}'),
    ('Blue screen after update', 'Laptop hits a blue screen after the latest driver patch.', 'Hardware Support', 'hardware', 'P1', 'open', 'alice.user@lumina.test', 'Occurs during boot.', '{"source":"seed"}'),
    ('Notification emails delayed', 'Password reset emails arrive after 15 minutes.', 'Software Support', 'software', 'P2', 'closed', 'bob.user@lumina.test', 'Triggered from forgot password page.', '{"source":"seed"}'),
    ('Search results missing records', 'Two recent tickets do not appear in search results.', 'Bug Reports', 'bug', 'P2', 'in_progress', 'carol.user@lumina.test', 'Search by ticket title after creating a ticket.', '{"source":"seed"}'),
    ('Docking station not detected', 'The docking station is not recognized after reconnecting.', 'Hardware Support', 'hardware', 'P3', 'assigned', 'dan.user@lumina.test', 'Reconnect dock after wake from sleep.', '{"source":"seed"}'),
    ('SSO callback loop', 'Logging in with SSO keeps redirecting back to the login page.', 'Software Support', 'software', 'P1', 'resolved', 'eve.user@lumina.test', 'Happens in Chrome and Edge.', '{"source":"seed"}'),
    ('Attachment upload fails', 'PNG attachments fail with a 500 error.', 'Bug Reports', 'bug', 'P2', 'pending_routing', 'alice.user@lumina.test', 'Upload 2MB PNG to a new ticket.', '{"source":"seed"}'),
    ('Monitor color calibration issue', 'External monitor colors shifted after reconnect.', 'Hardware Support', 'hardware', 'P4', 'closed', 'bob.user@lumina.test', 'Reconnect HDMI after sleep.', '{"source":"seed"}'),
    ('License activation stuck', 'Activation spinner never completes for a desktop tool.', 'Software Support', 'software', 'P3', 'assigned', 'carol.user@lumina.test', 'Click activate after entering key.', '{"source":"seed"}'),
    ('Mobile UI overlaps buttons', 'Action buttons overlap on iPhone Safari.', 'Bug Reports', 'bug', 'P3', 'in_progress', 'dan.user@lumina.test', 'Open settings on iPhone 14.', '{"source":"seed"}'),
    ('Printer queue jam', 'The office printer queue stalls after one successful print.', 'Hardware Support', 'hardware', 'P4', 'open', 'eve.user@lumina.test', 'Send multiple print jobs in sequence.', '{"source":"seed"}')
) AS seed(title, description, category_name, type, priority, status, submitter_email, replication_steps, metadata)
JOIN categories c ON lower(c.name) = lower(seed.category_name)
JOIN users u ON u.email = lower(seed.submitter_email)
WHERE NOT EXISTS (SELECT 1 FROM tickets);

INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assigned_at)
SELECT
  t.id,
  assignee.id,
  approver.id,
  TRUE,
  NOW() - (seed.days_ago * INTERVAL '1 day')
FROM (
  VALUES
    ('Laptop screen flickering', 'admin.hardware@lumina.test', 7),
    ('VPN login blocked', 'admin.software@lumina.test', 6),
    ('Keyboard replacement request', 'admin.hardware@lumina.test', 10),
    ('Reporting export timeout', 'admin.ops@lumina.test', 4),
    ('Notification emails delayed', 'admin.qa@lumina.test', 8),
    ('Search results missing records', 'admin.bugs@lumina.test', 5),
    ('Docking station not detected', 'admin.hardware@lumina.test', 3),
    ('SSO callback loop', 'admin.software@lumina.test', 9),
    ('License activation stuck', 'admin.qa@lumina.test', 2),
    ('Mobile UI overlaps buttons', 'admin.bugs@lumina.test', 1)
) AS seed(ticket_title, assignee_email, days_ago)
JOIN tickets t ON t.title = seed.ticket_title
JOIN users assignee ON assignee.email = lower(seed.assignee_email)
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
WHERE NOT EXISTS (SELECT 1 FROM ticket_assignment);

INSERT INTO satisfaction_ratings (ticket_id, rated_by, rating, comment)
SELECT
  t.id,
  u.id,
  seed.rating,
  seed.comment
FROM (
  VALUES
    ('Keyboard replacement request', 'dan.user@lumina.test', 5, 'Fast turnaround and clear updates.'),
    ('Notification emails delayed', 'bob.user@lumina.test', 4, 'Issue fixed after SMTP tuning.'),
    ('SSO callback loop', 'eve.user@lumina.test', 5, 'Resolved quickly with a clean workaround.')
) AS seed(ticket_title, user_email, rating, comment)
JOIN tickets t ON t.title = seed.ticket_title
JOIN users u ON u.email = lower(seed.user_email)
WHERE NOT EXISTS (SELECT 1 FROM satisfaction_ratings);

INSERT INTO audit_logs (actor_id, action, metadata)
SELECT
  actor.id,
  seed.action,
  seed.metadata::jsonb
FROM (
  VALUES
    ('ynrdevs@gmail.com', 'seed_users_loaded', '{"source":"init.sql"}'),
    ('ynrdevs@gmail.com', 'seed_tickets_loaded', '{"source":"init.sql"}'),
    ('admin.hardware@lumina.test', 'seed_assignment_reviewed', '{"source":"init.sql","area":"hardware"}')
) AS seed(actor_email, action, metadata)
JOIN users actor ON actor.email = lower(seed.actor_email)
WHERE NOT EXISTS (SELECT 1 FROM audit_logs);

-- Clean up legacy demo accounts from earlier local seeds so routing and approvals stay focused
-- on the current Lumina test set.
UPDATE categories
SET created_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE created_by = (SELECT id FROM users WHERE email = lower('admin@example.com'));

UPDATE ticket_assignment
SET assigned_to = (SELECT id FROM users WHERE email = lower('admin.hardware@lumina.test'))
WHERE assigned_to IN (
  (SELECT id FROM users WHERE email = lower('admin@example.com')),
  (SELECT id FROM users WHERE email = lower('y.nachiketh.reddy@gmail.com')),
  (SELECT id FROM users WHERE email = lower('itsnachikethreddy@gmail.com')),
  (SELECT id FROM users WHERE email = lower('ynrworks@gmail.com'))
);

UPDATE ticket_assignment
SET assigned_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE assigned_by = (SELECT id FROM users WHERE email = lower('admin@example.com'));

UPDATE users
SET approved_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE approved_by = (SELECT id FROM users WHERE email = lower('admin@example.com'));

UPDATE audit_logs
SET actor_id = (SELECT id FROM users WHERE email = lower('admin.hardware@lumina.test'))
WHERE actor_id IN (
  (SELECT id FROM users WHERE email = lower('y.nachiketh.reddy@gmail.com')),
  (SELECT id FROM users WHERE email = lower('itsnachikethreddy@gmail.com')),
  (SELECT id FROM users WHERE email = lower('ynrworks@gmail.com'))
);

DELETE FROM users
WHERE email IN (
  lower('admin@example.com'),
  lower('alice@test.lumina'),
  lower('bob@test.lumina'),
  lower('carol@test.lumina'),
  lower('itsnachikethreddyy@gmail.com'),
  lower('y.nachiketh.reddy@gmail.com'),
  lower('itsnachikethreddy@gmail.com'),
  lower('ynrworks@gmail.com')
);
