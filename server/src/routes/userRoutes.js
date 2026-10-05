import express from 'express';
import { registerOrUpdateUser, getUserStats, getActiveUsersCount } from '../services/userService.js';

const router = express.Router();

// POST /api/users/register
// Register or update a user based on IP
router.post('/register', async (req, res) => {
  try {
    const { fingerprint, userAgent } = req.body;
    
    // Get client IP (handle proxies)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket.remoteAddress || 
               '0.0.0.0';

    if (!fingerprint || !userAgent) {
      return res.status(400).json({
        error: 'Missing required fields: fingerprint, userAgent'
      });
    }

    const result = await registerOrUpdateUser(ip, fingerprint, userAgent);
    
    res.status(result.isNew ? 201 : 200).json({
      userId: result.userId,
      isNew: result.isNew
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// GET /api/users/:userId/stats
// Get user statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await getUserStats(userId);

    if (!stats) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// GET /api/users/active/count
// Get currently active users count
router.get('/active/count', async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const count = await getActiveUsersCount(parseInt(hours));

    res.json({ activeCount: count, timeframe: `${hours} hour(s)` });
  } catch (err) {
    console.error('Error fetching active users:', err);
    res.status(500).json({ error: 'Failed to fetch active users count' });
  }
});

export default router;
