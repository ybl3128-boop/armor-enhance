import { query } from '../db.js';

export async function startSession(userId, sessionId) {
  try {
    await query(
      `INSERT INTO sessions (session_id, user_id)
       VALUES ($1, $2)`,
      [sessionId, userId]
    );

    // Increment user's session count
    await query(
      `UPDATE users 
       SET total_sessions = total_sessions + 1 
       WHERE user_id = $1`,
      [userId]
    );

    return { acknowledged: true };
  } catch (err) {
    console.error('Error starting session:', err);
    throw err;
  }
}

export async function endSession(userId, sessionId, data = {}) {
  const {
    finalLevel = 0,
    finalGold = 0,
    destructionCount = 0,
    maxGoldDuringSession = 0,
    isBankrupt = false
  } = data;

  const durationSeconds = Math.floor((Date.now() - new Date(data.startedAt || Date.now())) / 1000);

  try {
    const result = await query(
      `UPDATE sessions 
       SET ended_at = CURRENT_TIMESTAMP,
           duration_seconds = $2,
           final_level = $3,
           final_gold = $4,
           destruction_count = $5,
           max_gold_during_session = $6,
           is_bankrupt = $7
       WHERE session_id = $1
       RETURNING *`,
      [sessionId, durationSeconds, finalLevel, finalGold, destructionCount, maxGoldDuringSession, isBankrupt]
    );

    return { acknowledged: true, session: result.rows[0] };
  } catch (err) {
    console.error('Error ending session:', err);
    throw err;
  }
}

export async function getSessionStats(userId) {
  const result = await query(
    `SELECT 
      COUNT(*) as total_sessions,
      AVG(final_level) as avg_level,
      MAX(final_level) as max_level,
      AVG(duration_seconds) as avg_duration,
      SUM(destruction_count) as total_destructions,
      COUNT(CASE WHEN is_bankrupt THEN 1 END) as bankruptcy_count
    FROM sessions WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

export async function getRecentSessions(userId, limit = 10) {
  const result = await query(
    `SELECT 
      session_id,
      started_at,
      ended_at,
      final_level,
      final_gold,
      destruction_count,
      is_bankrupt
    FROM sessions 
    WHERE user_id = $1
    ORDER BY started_at DESC
    LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}
