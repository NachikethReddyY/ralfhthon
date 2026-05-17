require('./lib/loadRootEnv').loadRootEnv();

const fs = require('fs');
const { createApp } = require('./app');
const db = require('./db');

// #region agent log
const _AGENT_LOG = '/Users/nr/Developer/dbs-restart/.cursor/debug-082fa8.log';
const _AGENT_SESSION = '082fa8';
function _agentDbg(hypothesisId, location, message, data) {
  const payload = {
    sessionId: _AGENT_SESSION,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    fs.appendFileSync(_AGENT_LOG, JSON.stringify(payload) + '\n');
  } catch (_) {}
}
// #endregion

const PORT = process.env.PORT || 5000;
const app = createApp();

// #region agent log
process.on('exit', (code) => {
  try {
    fs.appendFileSync(
      _AGENT_LOG,
      JSON.stringify({
        sessionId: _AGENT_SESSION,
        hypothesisId: 'H3',
        location: 'server.js:exit',
        message: 'process_exit',
        data: { code },
        timestamp: Date.now(),
      }) + '\n'
    );
  } catch (_) {}
});
process.on('uncaughtException', (err) => {
  _agentDbg('H4', 'server.js:uncaughtException', err.message, {
    name: err.name,
  });
});
process.on('unhandledRejection', (reason) => {
  _agentDbg('H5', 'server.js:unhandledRejection', String(reason), {});
});
// #endregion

const initializeDatabase = async () => {
  // #region agent log
  _agentDbg('H1', 'server.js:initializeDatabase', 'start', {});
  // #endregion
  try {
    const result = await db.query('SELECT COUNT(*)::int AS n FROM users');
    if (result.rows[0].n === 0) {
      console.warn(
        'No users found. Apply backend/db/init.sql to load the schema and development seed data.'
      );
    }
    // #region agent log
    _agentDbg('H1', 'server.js:initializeDatabase', 'query_ok', {
      userCount: result.rows[0].n,
    });
    // #endregion
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error(
      'Hint: apply schema with `psql "$DATABASE_URL" -f db/init.sql` if tables are missing.'
    );
    // #region agent log
    _agentDbg('H1', 'server.js:initializeDatabase', 'query_err', {
      message: error.message,
    });
    // #endregion
  }
};

if (process.env.VERCEL) {
  // Database check without blocking in serverless context
  initializeDatabase();
} else {
  initializeDatabase().then(() => {
    const server = app.listen(PORT, (arg) => {
      // Express wires this callback to `server.once('error', done)` as well as the
      // listening callback, so it runs with an Error on bind failures (e.g. EADDRINUSE).
      if (arg instanceof Error) {
        // #region agent log
        _agentDbg('H2', 'server.js:listen', 'listen_failed_callback', {
          code: arg.code,
          message: arg.message,
        });
        // #endregion
        console.error(`Server failed to listen on port ${PORT}:`, arg.message);
        process.exit(1);
      }
      console.log(`Server is running on http://localhost:${PORT}`);
      // #region agent log
      _agentDbg('H2', 'server.js:listen', 'listen_callback', {
        listening: server.listening,
        address: server.address(),
      });
      // #endregion
    });
    // #region agent log
    server.on('error', (err) => {
      _agentDbg('H2', 'server.js:server.error', err.message, {
        code: err.code,
      });
    });
    server.on('close', () => {
      _agentDbg('H2', 'server.js:server.close', 'server_closed', {});
    });
    // #endregion
  }).catch((err) => {
    // #region agent log
    try {
      fs.appendFileSync(
        _AGENT_LOG,
        JSON.stringify({
          sessionId: _AGENT_SESSION,
          hypothesisId: 'H6',
          location: 'server.js:init_chain',
          message: 'initializeDatabase_then_rejected',
          data: { message: err && err.message },
          timestamp: Date.now(),
        }) + '\n'
      );
    } catch (_) {}
    // #endregion
    throw err;
  });
}

module.exports = app;

