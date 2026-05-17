/** Sets X-API-Version for all /api/v1 responses (for clients and proxies). */
function apiVersionHeader(_req, res, next) {
  res.setHeader('X-API-Version', '1');
  next();
}

module.exports = { apiVersionHeader };
