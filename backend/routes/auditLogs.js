const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.action, a.metadata, a.created_at,
              u.id AS actor_id, u.email AS actor_email, u.first_name, u.last_name
       FROM audit_logs a
       JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

