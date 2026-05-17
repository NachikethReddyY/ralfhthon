# What We Need From You To Ship Lumina

This is the practical handoff list. The product now has a complete MVP loop in code, with mock fallbacks where external services are not configured.

## Current MVP Status

Implemented and verified:

- Workspace at `/workspace`
- GitHub repository linking shape
- GitHub issue import shape
- Duplicate-safe imported issue upsert
- Mock GitHub import fallback
- Lumina-native issue creation
- Issue status updates
- AI routing recommendation
- Human-applied routing
- Bulk routing preview
- Codex-style issue analysis
- Developer approval states:
  - `awaiting_go`
  - `approved`
  - `needs_more_info`
- Sync-back endpoint shape
- Audit event endpoint
- OpenAI integration with rules fallback
- Gemini fallback remains available for older ticket flows
- Frontend build verification
- Backend smoke test

Verified commands:

```bash
pnpm run build:frontend
pnpm --dir backend test
node --check backend/routes/lumina.js
```

## Required From You

### 1. OpenAI

Required for real AI routing and analysis:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Recommended:

- Set a monthly spend limit in the OpenAI dashboard.
- Use a project-scoped key for Lumina, not a personal all-purpose key.

### 2. PostgreSQL

Required for production persistence:

```bash
DATABASE_URL=
```

We need:

- Database host
- Database name
- User
- Password
- Port
- SSL requirement, if any

Current MVP Lumina workspace data is in-memory. The existing auth/ticket system already expects PostgreSQL.

### 3. Auth Secrets

Required:

```bash
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

Provide two different long random strings.

### 4. Email Provider

Required for account verification and password reset:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

Acceptable providers:

- Resend SMTP
- Postmark SMTP
- SendGrid SMTP
- Mailgun SMTP
- Gmail app password for demos only

### 5. Google OAuth

Required if Google login should work:

```bash
GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
```

We need the production frontend URL to add to Google OAuth allowed origins.

### 6. GitHub

For the current MVP live import path, either provide:

```bash
GITHUB_TOKEN=
```

or:

```bash
GITHUB_PAT=
```

The token needs read access to repository issues.

For production-grade GitHub App sync, provide:

```bash
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Production sync-back will need GitHub App installation flow and write permissions for issues, labels, comments, and assignees.

### 7. Deployment URLs

Required:

```bash
FRONTEND_URL=
VITE_API_URL=
VITE_API_PREFIX=/api/v1
```

We need:

- frontend domain
- backend/API domain
- whether frontend and backend will be deployed together or separately

## Optional But Recommended

### Gemini Fallback

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

Not required if OpenAI is provided.

### Monitoring

Pick one:

- Sentry
- Axiom
- Datadog
- Logtail
- hosting-provider logs only for demo

### Product Analytics

Pick one:

- PostHog
- Plausible
- Vercel Analytics
- none for hackathon demo

## Remaining Engineering Before Production

The MVP is demo-complete, but these are needed before real customer use:

1. Move Lumina workspace repositories/issues/developers from in-memory arrays into PostgreSQL tables.
2. Add database migrations instead of relying on a single DDL file.
3. Implement full GitHub App installation and webhook flow.
4. Implement real GitHub sync-back writes for comments, labels, assignees, and close/reopen actions.
5. Add tenant/workspace isolation.
6. Add billing if this becomes a paid SaaS.
7. Add stronger RBAC around admin routing and bulk actions.
8. Add durable audit logs for every AI action.
9. Add AI token usage tracking.
10. Add retry queues for GitHub sync and email.
11. Split the large frontend bundle with route-level lazy loading.
12. Add Playwright end-to-end tests for the browser workflow.

## Demo Without Any Keys

You can demo the full product loop without keys:

1. Run the app.
2. Open `/workspace`.
3. Link a repository using `owner/repo`.
4. Import issues.
5. Create a Lumina issue.
6. Run routing.
7. Apply routing.
8. Run analysis.
9. Approve the plan.
10. Sync back.

Without keys:

- GitHub import uses mock issues.
- OpenAI routing/analysis uses rules fallback.
- Sync-back records a mock sync event.

With keys:

- OpenAI powers routing and analysis.
- GitHub token powers live issue import.
