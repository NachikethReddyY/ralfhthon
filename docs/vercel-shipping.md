# Vercel Shipping Checklist

Lumina ships as a Vercel Services project: a Vite frontend at `/` plus the existing Express API at `/api`.

## Vercel Project Settings

- Framework preset: Services
- Install command: `pnpm install`
- Service config: handled by `vercel.json`

## Required Environment Variables

```bash
NODE_ENV=production
LUMINA_PROFILE=hosting
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=long-random-production-secret
FRONTEND_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
VITE_API_URL=
VITE_API_PREFIX=/api/v1
```

## AI And GitHub Integrations

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
GITHUB_TOKEN=github_pat_...
```

The GitHub token needs fine-grained access to the target repository:

- Metadata: read
- Contents: read
- Issues: read and write

`GITHUB_PAT` is still supported as a fallback name, but `GITHUB_TOKEN` is preferred.

## Optional Variables

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
VITE_SUPABASE_URL=https://vuzfvgawbqbqrqbfuhzg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Database

For local development:

```bash
createdb ralfhton
psql postgresql://nr@localhost:5432/ralfhton -f backend/db/DDL.sql
```

For hosted deployment, run the same schema against the production Postgres URL:

```bash
psql "$DATABASE_URL" -f backend/db/DDL.sql
```

## Smoke Test After Deploy

1. Open `/login`.
2. Sign in with a seeded account or production admin account.
3. Open `/workspace`.
4. Link `owner/repo`.
5. Import GitHub issues.
6. Run routing.
7. Run analysis.
8. Use `Handoff next available`.
9. Use `Sync back` and confirm a GitHub issue/comment is created or updated.
