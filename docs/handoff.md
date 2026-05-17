# Lumina Handoff Specification

## Product Overview

Lumina is an AI-assisted developer issue portal that connects GitHub issues with an internal workspace. It turns raw bug reports and feature requests into structured, prioritized, assignable tasks, then helps developers understand and act on those tasks faster.

The MVP should demonstrate a complete loop:

1. Link a GitHub repository.
2. Pull issues from GitHub into Lumina.
3. Create issues directly in Lumina when needed.
4. Use AI routing to recommend the best assignee.
5. Use a Codex-style assistant to analyze the issue.
6. Show the developer a summary, reproduction steps, likely root cause, risks, and fix plan.
7. Wait for the developer's explicit go-ahead.
8. Sync assignment/status back to GitHub.

## Core Positioning

For software teams overwhelmed by issue triage, Lumina is an AI-powered task operations layer that transforms GitHub issues into actionable developer work. Unlike generic project boards, Lumina combines GitHub sync, routing intelligence, workload awareness, and task-level AI assistance so teams can move from reported problem to fix-ready plan faster.

## Users

### Developer

- Pulls issues from GitHub or receives Lumina-routed tasks.
- Opens a task to understand what is broken or requested.
- Uses AI/Codex analysis to get a summary, reproduction steps, likely root cause, and fix plan.
- Gives explicit approval before AI-assisted work proceeds.

### Admin / Lead

- Links repositories.
- Oversees the issue queue.
- Uses AI routing to assign issues based on workload and availability.
- Confirms high-impact or destructive bulk actions.

### Product / Ops User

- Creates tasks directly in Lumina when work starts outside GitHub.
- Tracks whether work is open, assigned, in progress, blocked, or resolved.

## MVP Scope

### In Scope

- React + TypeScript frontend.
- ExpressJS backend.
- PostgreSQL-ready backend model, with seeded/demo data acceptable for hackathon reliability.
- GitHub repository linking.
- GitHub issue pull/import flow.
- Lumina-native issue creation.
- AI routing recommendation based on workload, availability, issue count, severity, labels, story points, and ownership.
- Task-level AI/Codex analysis.
- Developer approval / go-sign workflow.
- Status and assignment sync-back shape for GitHub.
- Admin bulk action confirmation pattern.

### Out of Scope

- Fully autonomous code changes.
- AI executing code without developer approval.
- Enterprise workflow management.
- Billing, multi-tenant SaaS administration, SAML, SCIM, or advanced RBAC.
- GitLab, Bitbucket, Jira, or Linear integrations.
- Custom AI model training.

## Main User Flows

### 1. Repository Linking

The user enters a GitHub repository URL or `owner/repo`.

Lumina should:

- Parse the owner and repository name.
- Store the linked repository in the workspace.
- Show connection status.
- Provide a sync button for pulling issues.
- Support a demo fallback when no GitHub token is configured.

### 2. Pull Issues From GitHub

The user clicks sync/import.

Lumina should:

- Fetch open GitHub issues.
- Convert each issue into a Lumina task.
- Preserve source metadata:
  - GitHub issue number
  - GitHub URL
  - title
  - body/description
  - labels
  - author
  - state
  - timestamps
- Avoid duplicates on repeated syncs.
- Show synced tasks in the workspace queue.

### 3. Create Issue in Lumina

The user creates an issue manually.

Required fields:

- title
- description
- severity
- labels
- story points

Optional fields:

- target repository
- team ownership area
- desired assignee
- GitHub push status

The created issue should appear immediately in the Lumina queue and be eligible for AI routing.

### 4. AI Routing

The user selects one issue or asks Lumina to route the queue.

AI routing should recommend an assignee using:

- issue labels
- severity
- story points
- current active issue count per developer
- developer availability
- team ownership
- workload balance

The recommendation must include:

- suggested assignee
- confidence score
- reason/explanation
- workload comparison
- fallback assignee if confidence is low

Routing should be advisory by default. A human applies the recommendation.

### 5. Codex-Style Issue Analysis

The developer opens a task and requests analysis.

Lumina should generate:

- concise summary
- reproduction steps
- likely root cause
- recommended fix plan
- files or areas likely involved, when inferable
- risks and unknowns
- suggested verification plan

The assistant must not execute code automatically. It prepares the developer to act.

### 6. Developer Go Sign

After reviewing analysis, the developer can approve the plan.

The UI should make this explicit:

- "Awaiting developer go-ahead"
- "Approved for implementation"
- "Needs more investigation"

The approval state should be stored on the task and visible in the issue detail panel.

### 7. Sync Back to GitHub

When a Lumina task changes state, Lumina should be able to sync back to GitHub.

MVP sync-back should support:

- assignment status
- labels
- task status represented as labels or issue comments
- resolution updates

Live GitHub sync may be replaced by seeded/mock sync for demo reliability, but backend endpoints should be shaped for real integration.

## Suggested Data Model

### Repository

- `id`
- `provider`: `github`
- `owner`
- `name`
- `url`
- `default_branch`
- `last_synced_at`
- `sync_status`

### Issue / Task

- `id`
- `source`: `github` or `lumina`
- `repository_id`
- `github_issue_number`
- `github_url`
- `title`
- `description`
- `labels`
- `severity`
- `story_points`
- `status`: `open`, `triaged`, `assigned`, `in_progress`, `blocked`, `resolved`, `closed`
- `assignee_id`
- `routing_recommendation`
- `codex_analysis`
- `approval_status`: `awaiting_go`, `approved`, `needs_more_info`
- `created_at`
- `updated_at`

### Developer

- `id`
- `name`
- `email`
- `role`
- `skills`
- `owned_labels`
- `active_issue_count`
- `availability`: `available`, `limited`, `unavailable`

### Routing Recommendation

- `issue_id`
- `recommended_assignee_id`
- `confidence`
- `reason`
- `workload_snapshot`
- `fallback_assignee_id`
- `created_at`

### Codex Analysis

- `issue_id`
- `summary`
- `reproduction_steps`
- `likely_root_cause`
- `fix_plan`
- `risks`
- `verification_plan`
- `approval_status`
- `created_at`

## Backend API Shape

Base path: `/api/v1`

### Repository Endpoints

- `GET /repositories`
- `POST /repositories`
- `POST /repositories/:id/sync`

### Issue Endpoints

- `GET /issues`
- `POST /issues`
- `GET /issues/:id`
- `PATCH /issues/:id`
- `POST /issues/:id/sync-back`

### AI Routing Endpoints

- `POST /issues/:id/route`
- `POST /routing/bulk`

### Codex Analysis Endpoints

- `POST /issues/:id/analyze`
- `POST /issues/:id/approve`
- `POST /issues/:id/request-more-info`

### Admin AI Endpoints

- `POST /admin/ai/suggest-bulk-action`
- `POST /admin/ai/confirm-bulk-action`

## Frontend Screens

### Main Workspace

The first screen should be the actual working portal, not a marketing page.

It should include:

- repository connection panel
- sync/import controls
- create issue form
- issue queue
- selected issue detail
- routing recommendation panel
- Codex analysis panel
- developer approval controls
- GitHub sync-back status

### Admin Queue View

Should include:

- filters by status, severity, label, assignee
- workload overview
- AI routing action
- bulk action assistant
- confirmation modal for destructive actions

### Issue Detail View

Should include:

- source metadata
- title and description
- labels, severity, story points
- assignee and status
- routing rationale
- Codex analysis
- approval state
- sync-back controls

## AI Safety Rules

- AI must be advisory by default.
- AI must explain routing recommendations.
- AI must not execute code automatically.
- Developer approval is required before implementation-oriented actions.
- Destructive bulk actions require explicit admin confirmation.
- Low-confidence suggestions should be labeled clearly.
- Live sync failures should be visible and recoverable.

## Demo Script

1. Open Lumina workspace.
2. Link `owner/repo`.
3. Pull GitHub issues.
4. Select a raw GitHub issue.
5. Run AI routing.
6. Show recommended developer and explanation.
7. Run Codex analysis.
8. Show summary, repro steps, root cause, fix plan, risks, and verification.
9. Click developer go-ahead.
10. Sync status/assignment back to GitHub or show mock sync success.

## Four-Phase Delivery Plan

### Phase 1: Foundation and Workspace Shell

Goal: Build the usable Lumina workspace and core local data flow.

Deliverables:

- Main workspace screen with repository panel, issue queue, issue detail panel, and action area.
- Seeded demo data for repositories, developers, and issues.
- Lumina issue creation form.
- Basic status model: `open`, `triaged`, `assigned`, `in_progress`, `blocked`, `resolved`.
- Backend API scaffold for repositories, issues, developers, routing, and analysis.
- PRD and handoff docs aligned with the final product direction.

Success criteria:

- A user can open the app, see issues, create a Lumina issue, select an issue, and update its status.
- The app is demoable without GitHub credentials.

### Phase 2: GitHub Intake and Sync Shape

Goal: Connect Lumina to GitHub issue workflows while preserving a reliable mock fallback.

Deliverables:

- Repository linking by GitHub URL or `owner/repo`.
- GitHub issue import endpoint.
- Duplicate-safe task creation from GitHub issues.
- Preserved metadata: issue number, URL, title, body, labels, author, state, timestamps.
- Sync status UI showing imported, pending, failed, and synced states.
- Mock sync mode for hackathon demos when GitHub API tokens are unavailable.

Success criteria:

- A user can link a repo, pull issues into Lumina, and see GitHub-sourced tasks in the queue.
- Re-running sync does not create duplicate tasks.

### Phase 3: AI Routing and Codex Analysis

Goal: Make Lumina feel intelligent and developer-focused.

Deliverables:

- AI routing recommendation endpoint and UI.
- Routing logic using severity, labels, story points, workload, issue count, ownership, and availability.
- Recommendation explanation with confidence score and fallback assignee.
- Codex-style analysis endpoint and UI.
- Generated summary, reproduction steps, likely root cause, fix plan, risks, and verification plan.
- Developer approval controls: `awaiting_go`, `approved`, `needs_more_info`.

Success criteria:

- A selected issue can be routed to a recommended developer with a clear explanation.
- A selected issue can be analyzed into developer-ready context.
- The developer must explicitly approve before implementation-oriented action is considered ready.

### Phase 4: Admin Controls, Sync-Back, and Demo Polish

Goal: Finish the end-to-end story and make the project presentation-ready.

Deliverables:

- GitHub sync-back endpoint shape for labels, assignment/status comments, and resolution updates.
- Admin bulk action assistant for reassignment, prioritization, cleanup, and edits.
- Confirmation step for destructive or high-impact bulk actions.
- Workload overview across developers.
- Error and empty states for sync, routing, analysis, and approval.
- Final demo script, seeded data, and UI polish.

Success criteria:

- The demo shows the full loop: GitHub intake, AI routing, Codex analysis, developer go-ahead, and sync-back.
- Destructive or high-impact AI actions require explicit confirmation.
- The app remains usable even if live GitHub integration fails.

## Implementation Notes

- Use `pnpm` for package management.
- Keep the backend API ready for PostgreSQL, but seed in-memory data is acceptable for local demo flow.
- Keep GitHub integration behind a service layer so mock sync and real sync share the same UI contract.
- Prefer clear structured JSON for routing and Codex outputs.
- Keep all AI actions human-readable and auditable.

## Current Product Decisions

- GitHub is the only external integration for MVP.
- One workspace can start with one linked repository, but the model should not block future multi-repo support.
- Routing is advisory and human-applied.
- Codex analysis prepares a fix plan; it does not implement automatically.
- Developer "go sign" is required before implementation-oriented action.
- Seeded demo data is allowed if live GitHub credentials are unavailable.
