const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Returns recent activity relevant to the current user:
// - for users: events on tickets they submitted
// - for admins/super_admin: all recent system events
router.get('/', async (req, res, next) => {
  try {
    let result;
    if (req.user.role === 'user') {
      result = await db.query(
        `SELECT a.id, a.action, a.metadata, a.created_at,
                u.first_name, u.last_name, u.email AS actor_email
         FROM audit_logs a
         JOIN users u ON u.id = a.actor_id
         WHERE a.metadata->>'ticket_id' IN (
           SELECT id::text FROM tickets WHERE submitted_by = $1
         )
         OR a.actor_id = $1
         ORDER BY a.created_at DESC
         LIMIT 30`,
        [req.user.id]
      );
    } else {
      result = await db.query(
        `SELECT a.id, a.action, a.metadata, a.created_at,
                u.first_name, u.last_name, u.email AS actor_email
         FROM audit_logs a
         JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC
         LIMIT 50`
      );
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/ai-decisions', requireAuth, async (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const result = await db.query(
      `SELECT t.id, t.title, t.priority, t.type, t.created_at,
              t.metadata->'routing' AS routing,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       WHERE t.metadata->'routing' IS NOT NULL
         AND t.metadata->'routing' != 'null'
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
