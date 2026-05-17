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
DATABASE_URL=postgresql://postgres:[YOUR-SUPABASE-DB-PASSWORD]@db.vuzfvgawbqbqrqbfuhzg.supabase.co:5432/postgres
DATABASE_POOL_MAX=1
DATABASE_APPLICATION_NAME=lumina-api
JWT_SECRET=long-random-production-secret
FRONTEND_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
VITE_API_URL=
VITE_API_PREFIX=/api/v1
VITE_SUPABASE_URL=https://vuzfvgawbqbqrqbfuhzg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4y7wbSInrQAcjKAjQrkjnA_P1jMi4Kv
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
```

## Database

Production uses the Supabase Postgres database for project `vuzfvgawbqbqrqbfuhzg`. The direct connection string above works once the database password is filled in; for Vercel/serverless, prefer Supabase's connection pooler URL if it is available in the Supabase dashboard.

Apply the schema against Supabase before testing login/signup:

```bash
psql "$DATABASE_URL" -f backend/db/DDL.sql
```

For local-only development, use `.env.development.example` and a local Postgres database.

```bash
createdb ralfhton
psql postgresql://nr@localhost:5432/ralfhton -f backend/db/DDL.sql
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
