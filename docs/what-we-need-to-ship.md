# What We Need From You To Run Lumina

Lumina is now trimmed to the main product: simple email/password login, user management basics, GitHub-shaped issue intake, AI routing, Codex-style issue analysis, approvals, and sync-back shape.

## Required Keys And Config

### 1. Database

```bash
DATABASE_URL=postgresql://postgres:[YOUR-SUPABASE-DB-PASSWORD]@db.vuzfvgawbqbqrqbfuhzg.supabase.co:5432/postgres
DATABASE_POOL_MAX=1
DATABASE_APPLICATION_NAME=lumina-api
```

Required for persistent users, tickets, comments, and admin data. For Vercel/serverless, use the Supabase connection pooler URL instead of the direct database URL if Supabase gives you one.

### 2. JWT Secret

```bash
JWT_SECRET=replace-with-long-random-secret
```

Required for password login sessions. Use a long random value in production.

### 3. OpenAI

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Required for real AI routing, Codex-style issue analysis, and ticket Q&A. Without this, the Lumina workspace still demos with deterministic fallback logic.

### 4. Frontend/API URLs

```bash
FRONTEND_URL=https://your-frontend-domain.com
VITE_API_URL=
VITE_API_PREFIX=/api/v1
VITE_SUPABASE_URL=https://vuzfvgawbqbqrqbfuhzg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4y7wbSInrQAcjKAjQrkjnA_P1jMi4Kv
```

For local development:

```bash
FRONTEND_URL=http://localhost:5173,http://localhost:5174,http://localhost:5175
VITE_API_URL=http://localhost:6001
VITE_API_PREFIX=/api/v1
```

## Optional Keys

### Supabase Project Config

```bash
VITE_SUPABASE_URL=https://vuzfvgawbqbqrqbfuhzg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4y7wbSInrQAcjKAjQrkjnA_P1jMi4Kv
```

The Supabase client package and starter files are installed. The active product uses the existing Express API against Supabase Postgres. Provide the real database password or full pooler connection string for:

```bash
postgresql://postgres:[YOUR-PASSWORD]@db.vuzfvgawbqbqrqbfuhzg.supabase.co:5432/postgres
```

### GitHub Live Import

```bash
GITHUB_TOKEN=github_pat_or_token
```

or:

```bash
GITHUB_PAT=github_pat_or_token
```

Needed only for live GitHub issue import. Without it, Lumina uses mock GitHub import data so demos still work.

### Gemini Fallback

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

Optional. OpenAI is the primary AI provider now.

## No Longer Required

These were removed from the active product path:

- Social login keys
- SMTP credentials
- Email verification setup
- Password reset email setup
- GitHub App credentials

## Current Login Model

- Users sign up with email and password.
- Signup creates an active account immediately.
- No email verification.
- No onboarding gate.
- No pending approval gate for normal users.
- Suspended users are blocked.
- Role checks still apply for admin/super-admin pages.

## Verification Commands

```bash
pnpm run lint
pnpm run build:frontend
pnpm --dir backend test
```
