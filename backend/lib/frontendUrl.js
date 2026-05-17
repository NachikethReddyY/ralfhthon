/** First origin in FRONTEND_URL (comma-separated) or Vite default. */
function getFrontendBaseUrl() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const first = raw.split(',')[0].trim();
  return first.replace(/\/$/, '');
}

module.exports = { getFrontendBaseUrl };
