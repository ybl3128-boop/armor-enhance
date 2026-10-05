-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(64) PRIMARY KEY,
  fingerprint_id VARCHAR(64),
  ip_hash VARCHAR(64),
  user_agent TEXT,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_sessions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INT,
  final_level INT,
  final_gold BIGINT,
  destruction_count INT,
  max_gold_during_session BIGINT,
  is_bankrupt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  event_id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Daily active users view
CREATE OR REPLACE VIEW vw_dau AS
SELECT
  DATE(s.started_at) as play_date,
  COUNT(DISTINCT s.user_id) as dau
FROM sessions s
WHERE s.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(s.started_at);

-- Monthly active users view
CREATE OR REPLACE VIEW vw_mau AS
SELECT
  DATE_TRUNC('month', s.started_at)::DATE as month_start,
  COUNT(DISTINCT s.user_id) as mau
FROM sessions s
WHERE s.started_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', s.started_at);
