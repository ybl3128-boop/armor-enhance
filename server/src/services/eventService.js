import { query, getClient } from '../db.js';

export async function logEvent(eventId, sessionId, userId, eventType, timestamp, payload) {
  try {
    await query(
      `INSERT INTO events (event_id, session_id, user_id, event_type, timestamp, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, sessionId, userId, eventType, new Date(timestamp), JSON.stringify(payload || {})]
    );
    return { acknowledged: true };
  } catch (err) {
    console.error('Error logging event:', err);
    throw err;
  }
}

export async function batchLogEvents(userId, sessionId, events = []) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    let count = 0;
    for (const event of events) {
      const { eventId, type, timestamp, payload } = event;
      
      await client.query(
        `INSERT INTO events (event_id, session_id, user_id, event_type, timestamp, payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [eventId, sessionId, userId, type, new Date(timestamp), JSON.stringify(payload || {})]
      );
      count++;
    }

    await client.query('COMMIT');
    return { acknowledged: true, count };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error batch logging events:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getSessionEvents(sessionId, limit = 100) {
  const result = await query(
    `SELECT 
      event_id,
      event_type,
      timestamp,
      payload
    FROM events 
    WHERE session_id = $1
    ORDER BY timestamp ASC
    LIMIT $2`,
    [sessionId, limit]
  );

  return result.rows;
}

export async function getEventStats(userId) {
  const result = await query(
    `SELECT 
      event_type,
      COUNT(*) as count
    FROM events 
    WHERE user_id = $1
    GROUP BY event_type
    ORDER BY count DESC`,
    [userId]
  );

  return result.rows;
}

export async function getRecentEvents(limit = 100) {
  const result = await query(
    `SELECT 
      event_id,
      user_id,
      session_id,
      event_type,
      timestamp
    FROM events 
    ORDER BY timestamp DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows;
}
