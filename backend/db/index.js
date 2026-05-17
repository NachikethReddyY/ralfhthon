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
  ...(useSSL && {
    ssl: { rejectUnauthorized: false },
  }),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
