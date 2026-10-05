import express from 'express';
import { startSession, endSession, getSessionStats, getRecentSessions } from '../services/sessionService.js';

const router = express.Router();

// POST /api/sessions/start
// Start a new game session
router.post('/start', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: userId, sessionId'
      });
    }

    const result = await startSession(userId, sessionId);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/sessions/end
// End a game session with final stats
router.post('/end', async (req, res) => {
  try {
    const { userId, sessionId, finalLevel, finalGold, destructionCount, maxGoldDuringSession, isBankrupt } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: userId, sessionId'
      });
    }

    const result = await endSession(userId, sessionId, {
      finalLevel,
      finalGold,
      destructionCount,
      maxGoldDuringSession,
      isBankrupt
    });

    res.json(result);
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// GET /api/sessions/:userId/stats
// Get session statistics for a user
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await getSessionStats(userId);

    res.json(stats);
  } catch (err) {
    console.error('Error fetching session stats:', err);
    res.status(500).json({ error: 'Failed to fetch session stats' });
  }
});

// GET /api/sessions/:userId/recent
// Get recent sessions for a user
router.get('/:userId/recent', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const sessions = await getRecentSessions(userId, parseInt(limit));

    res.json({ sessions, count: sessions.length });
  } catch (err) {
    console.error('Error fetching recent sessions:', err);
    res.status(500).json({ error: 'Failed to fetch recent sessions' });
  }
});

export default router;
