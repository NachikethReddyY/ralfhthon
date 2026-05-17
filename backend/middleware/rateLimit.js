const buckets = new Map();

function rateLimit({ windowMs, max, key = (req) => req.ip || 'global' }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${req.path}:${key(req)}`;
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      res.setHeader('Retry-After', Math.ceil((existing.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    existing.count += 1;
    next();
  };
}

module.exports = { rateLimit };

