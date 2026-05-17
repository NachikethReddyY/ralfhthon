const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiVersionHeader } = require('./middleware/apiVersion');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const allowLocalhost = process.env.NODE_ENV !== 'production';

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (configuredOrigins.includes(origin)) return callback(null, true);
        if (allowLocalhost && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          return callback(null, true);
        }
        if (!configuredOrigins.length) return callback(null, true);
        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/', (req, res) => {
    res.json({
      message: 'Backend is running',
      api: { current: '/api/v1', health: '/api/v1/health' },
    });
  });

  app.get('/api', (_req, res) => {
    res.json({ message: 'Use versioned routes', versions: ['1'], basePath: '/api/v1' });
  });

  app.use('/api/v1', apiVersionHeader, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
