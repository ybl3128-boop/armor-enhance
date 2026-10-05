import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/analytics/export/csv
// Export all logs as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.event_id,
        e.user_id,
        e.session_id,
        e.event_type,
        e.timestamp,
        e.payload,
        s.started_at as session_started,
        s.ended_at as session_ended,
        s.final_level,
        s.final_gold,
        s.destruction_count,
        s.is_bankrupt
      FROM events e
      LEFT JOIN sessions s ON e.session_id = s.session_id
      ORDER BY e.timestamp DESC
    `);

    // Convert to CSV format
    const headers = [
      'Event ID',
      'User ID',
      'Session ID',
      'Event Type',
      'Timestamp',
      'Payload',
      'Session Started',
      'Session Ended',
      'Final Level',
      'Final Gold',
      'Destruction Count',
      'Is Bankrupt'
    ];

    let csv = headers.join(',') + '\n';
    
    result.rows.forEach(row => {
      const values = [
        escapeCSV(row.event_id),
        escapeCSV(row.user_id),
        escapeCSV(row.session_id),
        escapeCSV(row.event_type),
        escapeCSV(row.timestamp),
        escapeCSV(JSON.stringify(row.payload)),
        escapeCSV(row.session_started),
        escapeCSV(row.session_ended),
        row.final_level || '',
        row.final_gold || '',
        row.destruction_count || '',
        row.is_bankrupt ? 'true' : 'false'
      ];
      csv += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="armor-enhance-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// GET /api/analytics/export/json
// Export all logs as JSON
router.get('/export/json', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.event_id,
        e.user_id,
        e.session_id,
        e.event_type,
        e.timestamp,
        e.payload,
        s.started_at as session_started,
        s.ended_at as session_ended,
        s.final_level,
        s.final_gold,
        s.destruction_count,
        s.is_bankrupt
      FROM events e
      LEFT JOIN sessions s ON e.session_id = s.session_id
      ORDER BY e.timestamp DESC
    `);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="armor-enhance-logs-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error exporting JSON:', err);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// GET /api/analytics/summary
// Get basic analytics summary
router.get('/summary', async (req, res) => {
  try {
    const usersResult = await query('SELECT COUNT(DISTINCT user_id) as total_users FROM users');
    const sessionsResult = await query('SELECT COUNT(*) as total_sessions FROM sessions');
    const eventsResult = await query('SELECT COUNT(*) as total_events FROM events');
    const legendaryResult = await query('SELECT COUNT(*) as legendary_count FROM sessions WHERE final_level >= 20');

    res.json({
      totalUsers: parseInt(usersResult.rows[0].total_users),
      totalSessions: parseInt(sessionsResult.rows[0].total_sessions),
      totalEvents: parseInt(eventsResult.rows[0].total_events),
      legendaryClears: parseInt(legendaryResult.rows[0].legendary_count)
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default router;
