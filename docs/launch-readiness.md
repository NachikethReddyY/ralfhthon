# Lumina Launch Readiness

This document lists what Lumina needs to become a functional shipped SaaS and what must be provided before deployment.

## Implemented in this pass

- Installed requested local agent skills:
  - `frontend-design`
  - `web-design-guidelines`
  - `agent-browser`
  - `brainstorming`
- Added a demo workspace at `/workspace` with:
  - repository panel
  - issue queue
  - issue detail panel
  - action area
  - seeded repositories, developers, and issues
  - Lumina issue creation
  - status updates for `open`, `triaged`, `assigned`, `in_progress`, `blocked`, and `resolved`
  - AI routing and issue analysis buttons
- Added backend mock/demo endpoints under `/api/v1/lumina`:
  - `GET /repositories`
  - `GET /developers`
  - `GET /issues`
  - `POST /issues`
  - `PATCH /issues/:issueId/status`
  - `POST /routing/recommend`
  - `POST /routing/bulk`
  - `POST /analysis`
- Added OpenAI integration support:
  - OpenAI-backed routing recommendation
  - OpenAI-backed issue analysis with structured JSON output
  - OpenAI-backed ticket Q&A through existing `/tickets/:id/ask`
  - fallback to Gemini or rules when OpenAI is not configured

## Required environment variables

### Core app

```bash
NODE_ENV=production
LUMINA_PROFILE=hosting
FRONTEND_URL=https://your-lumina-domain.com
VITE_API_URL=https://your-api-domain.com
VITE_API_PREFIX=/api/v1
```

### Database

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Production needs a managed PostgreSQL database and a migration/seed process. The current schema lives in `backend/db/DDL.sql`.

### Authentication and sessions

```bash
JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-long-random-secret
```

Use different secrets for access and refresh tokens. Store them in the deployment provider's secret manager.

### Email

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=no-reply@your-lumina-domain.com
```

Needed for account verification and password reset flows.

### Google OAuth

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Configure the OAuth redirect/origin allowlist in Google Cloud for the production frontend URL.

### OpenAI

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

OpenAI is used for structured routing, issue analysis, and ticket Q&A. The implementation uses the OpenAI Responses API with structured outputs for routing and analysis. Official docs used: https://platform.openai.com/docs/api-reference/responses/create and https://platform.openai.com/docs/guides/structured-outputs.

### Optional Gemini fallback

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

Gemini remains as a fallback for the older routing and Q&A paths. Lumina can run without Gemini if `OPENAI_API_KEY` is provided.

### GitHub integration

```bash
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

These are not fully wired yet. They are required for live repository linking, issue import, duplicate-safe sync, webhook updates, and sync-back.

## Product work still needed to ship

1. Persist the `/workspace` Lumina domain model in PostgreSQL instead of in-memory mock arrays.
2. Add GitHub App authentication, repository linking, issue import, webhook handling, and duplicate-safe sync.
3. Add a production issue table shape for GitHub metadata: owner, repo, issue number, URL, labels, author, GitHub state, timestamps, and sync status.
4. Add approval state persistence for Codex-style analysis: `awaiting_go`, `approved`, `needs_more_info`.
5. Add audit logs for all AI recommendations, approvals, applied routing decisions, and bulk actions.
6. Add admin AI bulk action endpoints with preview/confirm behavior.
7. Add billing and tenant isolation before real customer use.
8. Add production rate limits for auth, AI calls, GitHub sync, and write endpoints.
9. Add monitoring for backend errors, AI failures, token usage, GitHub sync failures, and email delivery.
10. Add end-to-end tests for signup, login, issue creation, routing, analysis, approval, and sync fallback.

## Demo-ready flow

1. Start the backend and frontend.
2. Open `/workspace`.
3. Select a seeded repository.
4. Create a Lumina issue.
5. Select the new issue.
6. Update its status.
7. Run routing.
8. Run issue analysis.

This flow works without GitHub credentials. With `OPENAI_API_KEY`, routing and analysis use OpenAI. Without it, the demo uses deterministic fallback responses.

## Deployment checklist

- Provision PostgreSQL.
- Set all required secrets in the hosting platform.
- Run schema creation/migrations.
- Configure frontend and backend domains.
- Configure CORS through `FRONTEND_URL`.
- Configure Google OAuth origins.
- Configure SMTP provider and verify sender domain.
- Add OpenAI API key and budget limits.
- Add GitHub App credentials when live sync is ready.
- Run frontend build, backend smoke test, and browser QA.
- Verify `/workspace`, auth, email verification, ticket creation, AI routing, and issue analysis in staging.
