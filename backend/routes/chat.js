const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Multer for chat image uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/chat'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  },
});

// Ensure upload dir exists
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, '../uploads/chat'), { recursive: true });

const isAdmin = (user) => user.role === 'admin' || user.role === 'super_admin';

// GET /chat/conversations
// Admin: all conversations with last message + unread count
// User: their own conversation (auto-create if none)
router.get('/conversations', async (req, res, next) => {
  try {
    if (isAdmin(req.user)) {
      const result = await db.query(
        `SELECT cc.id, cc.status, cc.created_at, cc.last_message_at,
                u.id AS user_id, u.first_name, u.last_name, u.email, u.avatar_url,
                (SELECT body FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) AS last_body,
                (SELECT image_url FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) AS last_image,
                (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id AND is_read = FALSE AND sender_id != $1) AS unread_count
         FROM chat_conversations cc
         JOIN users u ON u.id = cc.user_id
         ORDER BY cc.last_message_at DESC`,
        [req.user.id]
      );
      return res.json(result.rows);
    }

    // User: get or create their conversation
    let result = await db.query(
      `SELECT id, status, created_at, last_message_at FROM chat_conversations WHERE user_id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      result = await db.query(
        `INSERT INTO chat_conversations (user_id) VALUES ($1) RETURNING id, status, created_at, last_message_at`,
        [req.user.id]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /chat/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conv = await db.query(`SELECT user_id FROM chat_conversations WHERE id = $1`, [req.params.id]);
    if (!conv.rows.length) return res.status(404).json({ error: 'Not found' });
    if (!isAdmin(req.user) && conv.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT m.id, m.body, m.image_url, m.is_read, m.created_at,
              u.id AS sender_id, u.first_name, u.last_name, u.role, u.avatar_url
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    // Mark incoming messages as read
    await db.query(
      `UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
      [req.params.id, req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /chat/conversations/:id/messages — text message
router.post('/conversations/:id/messages', async (req, res, next) => {
  const body = String(req.body?.body ?? '').trim();
  if (!body) return res.status(400).json({ error: 'body is required' });

  try {
    const conv = await db.query(`SELECT user_id FROM chat_conversations WHERE id = $1`, [req.params.id]);
    if (!conv.rows.length) return res.status(404).json({ error: 'Not found' });
    if (!isAdmin(req.user) && conv.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, image_url, is_read, created_at`,
      [req.params.id, req.user.id, body]
    );

    await db.query(
      `UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      sender_id: req.user.id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      role: req.user.role,
      avatar_url: req.user.avatar_url,
    });
  } catch (err) {
    next(err);
  }
});

// POST /chat/conversations/:id/messages/image — image message
router.post('/conversations/:id/messages/image', upload.single('image'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const conv = await db.query(`SELECT user_id FROM chat_conversations WHERE id = $1`, [req.params.id]);
    if (!conv.rows.length) return res.status(404).json({ error: 'Not found' });
    if (!isAdmin(req.user) && conv.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const imageUrl = `/uploads/chat/${req.file.filename}`;
    const result = await db.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, image_url)
       VALUES ($1, $2, $3)
       RETURNING id, body, image_url, is_read, created_at`,
      [req.params.id, req.user.id, imageUrl]
    );

    await db.query(
      `UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      sender_id: req.user.id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      role: req.user.role,
      avatar_url: req.user.avatar_url,
    });
  } catch (err) {
    next(err);
  }
});

// GET /chat/unread — quick unread badge count
router.get('/unread', async (req, res, next) => {
  try {
    let count;
    if (isAdmin(req.user)) {
      const result = await db.query(
        `SELECT COUNT(*) FROM chat_messages m
         JOIN chat_conversations cc ON cc.id = m.conversation_id
         WHERE m.is_read = FALSE AND m.sender_id != $1`,
        [req.user.id]
      );
      count = parseInt(result.rows[0].count, 10);
    } else {
      const conv = await db.query(`SELECT id FROM chat_conversations WHERE user_id = $1`, [req.user.id]);
      if (!conv.rows.length) { return res.json({ count: 0 }); }
      const result = await db.query(
        `SELECT COUNT(*) FROM chat_messages WHERE conversation_id = $1 AND is_read = FALSE AND sender_id != $2`,
        [conv.rows[0].id, req.user.id]
      );
      count = parseInt(result.rows[0].count, 10);
    }
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
