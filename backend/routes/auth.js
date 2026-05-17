const express = require('express');
const db = require('../db');
const { signAccessToken } = require('../lib/jwt');
const {
  validationError,
  validateSignupBody,
  validateLoginBody,
} = require('../lib/authValidation');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => req.ip });

router.use(authLimiter);

router.post('/login', async (req, res, next) => {
  const parsed = validateLoginBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { email, password } = parsed;

  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, status, email_is_verified, created_at
       FROM users
       WHERE lower(email) = lower($1)
         AND password_hash IS NOT NULL
         AND crypt($2, password_hash) = password_hash`,
      [email, password]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact a super admin.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

    const accessToken = signAccessToken(user);
    return res.status(200).json({
      accessToken,
      refreshToken: '',
      user,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/signup', async (req, res, next) => {
  const parsed = validateSignupBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { email, password, firstName, lastName } = parsed;

  try {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified, onboarding_completed)
       VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, 'user'::user_role, 'active'::user_status, TRUE, TRUE)
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, created_at, onboarding_completed`,
      [email, password, firstName, lastName]
    );
    const user = result.rows[0];
    const accessToken = signAccessToken(user);

    return res.status(201).json({
      user,
      accessToken,
      refreshToken: '',
      message: 'Account created.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return next(err);
  }
});

router.post('/refresh', (req, res) => {
  res.status(501).json({ error: 'Refresh token flow is not implemented yet' });
});

module.exports = router;
