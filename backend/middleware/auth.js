const db = require('../db');
const { verifyAccessToken } = require('../lib/jwt');

const USER_SELECT = `id, email, first_name, last_name, role, status, email_is_verified, avatar_url,
              approved_by, approved_at, created_at, last_login_at, job_title, department, onboarding_completed`;

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyAccessToken(match[1]);
    const result = await db.query(
      `SELECT ${USER_SELECT}
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    const status = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    next(Object.assign(error, { status }));
  }
}

async function requireAuthAny(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyAccessToken(match[1]);
    const result = await db.query(
      `SELECT ${USER_SELECT}
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    const status = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    next(Object.assign(error, { status }));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { requireAuth, requireAuthAny, requireRole };
