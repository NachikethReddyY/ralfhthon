const { Pool } = require('pg');
require('../lib/loadRootEnv').loadRootEnv();

const connectionString = process.env.DATABASE_URL || '';
const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');
const useSSL =
  process.env.DATABASE_SSL === 'true' || (!isLocal && Boolean(connectionString));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  application_name: process.env.DATABASE_APPLICATION_NAME || 'lumina-api',
  max: Number(process.env.DATABASE_POOL_MAX || (process.env.VERCEL ? 1 : 10)),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS || 10000),
  ...(useSSL && {
    ssl: { rejectUnauthorized: false },
  }),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
