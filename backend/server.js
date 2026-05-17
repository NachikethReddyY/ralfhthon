require('./lib/loadRootEnv').loadRootEnv();

const { createApp } = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 6001;
const app = createApp();

const initializeDatabase = async () => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS n FROM users');
    if (result.rows[0].n === 0) {
      console.warn(
        'No users found. Apply backend/db/init.sql to load the schema and development seed data.'
      );
    }
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error(
      'Hint: apply schema with `psql "$DATABASE_URL" -f db/init.sql` if tables are missing.'
    );
  }
};

if (process.env.VERCEL) {
  // Database check without blocking in serverless context
  initializeDatabase();
} else {
  initializeDatabase().then(() => {
    const server = app.listen(PORT, (error) => {
      if (error instanceof Error) {
        console.error(`Server failed to listen on port ${PORT}:`, error.message);
        process.exit(1);
      }
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      console.error(`Server failed to listen on port ${PORT}:`, err.message);
      process.exit(1);
    });
  });
}

module.exports = app;
