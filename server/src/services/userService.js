import crypto from 'crypto';
import { query } from '../db.js';

function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function registerOrUpdateUser(ip, fingerprint, userAgent) {
  const ipHash = hashIP(ip);
  
  // Try to find existing user by IP hash
  const existingUser = await query(
    'SELECT user_id FROM users WHERE ip_hash = $1',
    [ipHash]
  );

  if (existingUser.rows.length > 0) {
    // Update last_seen_at for existing user
    const userId = existingUser.rows[0].user_id;
    await query(
      'UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
    return { userId, isNew: false };
  }

  // Create new user
  const userId = `user_${crypto.randomBytes(16).toString('hex')}`;
  
  try {
    await query(
      `INSERT INTO users (user_id, ip_hash, fingerprint_id, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId, ipHash, fingerprint, userAgent]
    );
    return { userId, isNew: true };
  } catch (err) {
    // Handle race condition where user was created by another request
    if (err.code === '23505') { // Unique violation
      const retry = await query(
        'SELECT user_id FROM users WHERE ip_hash = $1',
        [ipHash]
      );
      if (retry.rows.length > 0) {
        return { userId: retry.rows[0].user_id, isNew: false };
      }
    }
    throw err;
  }
}

export async function getUserStats(userId) {
  const result = await query(
    `SELECT 
      total_sessions,
      first_seen_at,
      last_seen_at,
      created_at
    FROM users WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function getAllUsersCount() {
  const result = await query('SELECT COUNT(*) as total FROM users');
  return result.rows[0].total;
}

export async function getActiveUsersCount(hours) {
  const result = await query(
    `SELECT COUNT(DISTINCT user_id) as active_count
     FROM sessions
     WHERE started_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' * $1`,
    [hours]
  );
  return result.rows[0].active_count;
}
