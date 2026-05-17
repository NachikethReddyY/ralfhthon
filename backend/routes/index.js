const express = require('express');
const auditLogsRoutes = require('./auditLogs');
const authRoutes = require('./auth');
const categoriesRoutes = require('./categories');
const chatRoutes = require('./chat');
const commentsRoutes = require('./comments');
const luminaRoutes = require('./lumina');
const notificationsRoutes = require('./notifications');
const ticketsRoutes = require('./tickets');
const usersRoutes = require('./users');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lumina-api', version: '1' });
});

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/lumina', luminaRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/tickets/:ticketId/comments', commentsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/users', usersRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router;
