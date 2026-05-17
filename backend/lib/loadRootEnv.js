const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Resolve which env file to load at the repo root.
 *
 * Priority:
 * 1. `LUMINA_ENV_FILE` — absolute path, or relative to `process.cwd()`
 * 2. Profile-based file from `LUMINA_PROFILE`:
 *    - `development` | `local` → `.env.development`
 *    - `hosting` | `production` → `.env.hosting`
 *    If that file is missing, fall back to legacy `.env` when present.
 * 3. If `LUMINA_PROFILE` is unset: prefer `.env` if it exists, else `.env.development`.
 *
 * On platforms like Vercel, secrets are often injected without a file; if the resolved
 * file is missing, we warn and skip `dotenv` (existing `process.env` values still apply).
 */
function resolveEnvPath() {
  const override = process.env.LUMINA_ENV_FILE;
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.resolve(process.cwd(), override);
  }

  const legacy = path.join(REPO_ROOT, '.env');
  const development = path.join(REPO_ROOT, '.env.development');
  const hosting = path.join(REPO_ROOT, '.env.hosting');

  const rawProfile = process.env.LUMINA_PROFILE;
  if (rawProfile) {
    const p = String(rawProfile).toLowerCase();
    const isHosting = p === 'hosting' || p === 'production';
    const named = isHosting ? hosting : development;
    if (fs.existsSync(named)) return named;
    if (fs.existsSync(legacy)) return legacy;
    return named;
  }

  if (fs.existsSync(legacy)) return legacy;
  if (fs.existsSync(development)) return development;
  if (fs.existsSync(hosting)) return hosting;
  return development;
}

function loadRootEnv() {
  const pathToUse = resolveEnvPath();

  if (!fs.existsSync(pathToUse)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[env] No file at ${pathToUse}. Set variables in the host environment, or create this file (see .env.development.example / .env.hosting.example), or use LUMINA_ENV_FILE.`
      );
    }
    return null;
  }

  require('dotenv').config({ path: pathToUse });
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[env] Loaded ${pathToUse}`);
  }
  return pathToUse;
}

module.exports = { loadRootEnv, resolveEnvPath };
