# Supabase Production Database

Lumina production is configured for Supabase project `vuzfvgawbqbqrqbfuhzg`.

## Required Supabase Values

```bash
DATABASE_URL=postgresql://postgres:[YOUR-SUPABASE-DB-PASSWORD]@db.vuzfvgawbqbqrqbfuhzg.supabase.co:5432/postgres
VITE_SUPABASE_URL=https://vuzfvgawbqbqrqbfuhzg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4y7wbSInrQAcjKAjQrkjnA_P1jMi4Kv
```

For Vercel/serverless, use the Supabase connection pooler URL for `DATABASE_URL` when possible. Keep `DATABASE_POOL_MAX=1` unless the backend is moved to a long-running server.

## Apply Schema

After setting `DATABASE_URL` locally to the Supabase connection string:

```bash
psql "$DATABASE_URL" -f backend/db/DDL.sql
```

The schema creates `pgcrypto`, app enums, users, ticket data, seed users, and the test login accounts.

## Vercel Production Variables

Set these in Vercel Production and Preview:

```bash
NODE_ENV=production
LUMINA_PROFILE=hosting
FRONTEND_URL=https://lumina-ralfh.vercel.app
VITE_API_URL=
VITE_API_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres:[YOUR-SUPABASE-DB-PASSWORD]@db.vuzfvgawbqbqrqbfuhzg.supabase.co:5432/postgres
DATABASE_POOL_MAX=1
DATABASE_APPLICATION_NAME=lumina-api
JWT_SECRET=replace-with-long-random-production-secret
VITE_SUPABASE_URL=https://vuzfvgawbqbqrqbfuhzg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4y7wbSInrQAcjKAjQrkjnA_P1jMi4Kv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
GITHUB_TOKEN=github_pat_...
```

Do not set production `DATABASE_URL` to `localhost` or the Vercel API will fail at runtime.
