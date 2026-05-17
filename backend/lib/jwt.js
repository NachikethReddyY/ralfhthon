const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return secret || 'lumina-dev-only-change-me';
}

function getAccessTokenTtl() {
  return process.env.JWT_ACCESS_EXPIRES_IN || '7d';
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    getSecret(),
    { expiresIn: getAccessTokenTtl() }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signAccessToken, verifyAccessToken };
