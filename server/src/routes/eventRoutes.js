import express from 'express';
import { batchLogEvents, getSessionEvents, getEventStats } from '../services/eventService.js';

const router = express.Router();

// POST /api/events/batch
// Batch log events
router.post('/batch', async (req, res) => {
  try {
    const { userId, sessionId, events } = req.body;

    if (!userId || !sessionId || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Missing required fields: userId, sessionId, events (array)'
      });
    }

    const result = await batchLogEvents(userId, sessionId, events);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error batch logging events:', err);
    res.status(500).json({ error: 'Failed to log events' });
  }
});

// GET /api/events/:sessionId
// Get all events for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100 } = req.query;
    const events = await getSessionEvents(sessionId, parseInt(limit));

    res.json({ events, count: events.length });
  } catch (err) {
    console.error('Error fetching session events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:userId/stats
// Get event statistics for a user
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await getEventStats(userId);

    res.json({ stats });
  } catch (err) {
    console.error('Error fetching event stats:', err);
    res.status(500).json({ error: 'Failed to fetch event stats' });
  }
});

export default router;
