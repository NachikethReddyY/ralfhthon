# Product Requirements Document

## 1. Product Summary

**Working title:** Lumina

**One-line description:** An AI-assisted issue intake, routing, and task-management platform for software teams.

**Product description:** Lumina connects GitHub issues with an internal developer workspace, turning raw bug reports and feature requests into structured, prioritized, and assignable tasks. It helps teams reduce manual triage by using AI routing to classify issues, estimate urgency, recommend ownership, and route work to the right person based on workload and availability. It also generates developer-ready context such as summaries, likely root cause, fix plans, and reproduction steps.

**Problem we're solving:** Teams lose time manually reading, reproducing, classifying, routing, and coordinating issue resolution. Developers need better issue context, and admins need a safe way to manage tasks at scale.

**Proposed solution:** Build a web app on ExpressJS, PostgreSQL, React, and TypeScript that supports two-way sync with GitHub issues, uses AI to route tasks based on labels, story points, workload, severity, team ownership, and assignee availability, and provides a Codex-style AI assistant that can analyze a task card, generate reproduction steps, summarize likely root cause, and recommend a fix plan without executing code.

**Positioning statement:** For software teams overwhelmed by issue triage, Lumina is an AI-powered task operations layer that transforms GitHub issues into actionable developer work. Unlike generic project boards, Lumina combines sync, routing intelligence, workload awareness, and task-level AI assistance so teams can move from reported problem to fix-ready plan faster and with less manual coordination.

---

## 2. Goals

**Core goal:** Lumina shortens the path from issue reported to issue understood, assigned, and ready to fix.

- Automate issue intake by syncing GitHub issues into Lumina as structured tasks with relevant metadata, labels, status, severity, and ownership context.
- Let developers create issues directly in Lumina when work starts outside GitHub.
- Improve routing quality by recommending the best team or developer for each task using severity, labels, story points, workload, team ownership, and availability.
- Speed up developer understanding with concise summaries, reproduction steps, likely root cause, and suggested fix plans directly inside each task.
- Connect task analysis to a Codex-style assistant workflow that prepares a plan, then waits for the developer's go-ahead before any high-impact action.
- Support admin-scale task management through AI-assisted bulk edits, reassignment, prioritization, and cleanup.
- Preserve human control by requiring confirmation for destructive or high-impact actions and keeping AI advisory-only.
- Create a strong demo loop from GitHub issue intake to AI routing, task review, developer AI assistance, approval, and status sync-back.

## 3. Non-Goals

- Auto-fixing code or executing code changes automatically.
- Replacing developers or admins in final decision-making.
- Supporting a fixed set of task categories at launch.
- Building a full enterprise workflow system beyond the hackathon scope.
- Supporting GitLab, Bitbucket, Jira, or Linear in the MVP.

## 4. Users / Personas

### Primary user
- Developer triaging and resolving issues.

### Secondary users
- Lumina admin managing people, routing, bulk actions, and task coordination.
- Product or ops user creating tasks from GitHub or the internal portal.

## 5. Core Use Cases

- Link a GitHub repository to a Lumina workspace.
- Pull issues from GitHub into Lumina.
- Create a task manually inside Lumina.
- Ask AI to classify, prioritize, assign, and balance work based on labels, story points, severity, team ownership, workload, and availability.
- Open a task and ask the Codex-style assistant for summary, reproduction steps, likely root cause, risk, and a recommended fix plan.
- Developer reviews the AI/Codex analysis and gives a go signal before work proceeds.
- Sync task status back to GitHub when the source issue changes, is assigned, or is resolved.
- Ask the AI to perform bulk task actions such as edits, reassignment, or deletion, with confirmation required before destructive actions.

## 6. Requirements

### Functional Requirements

- Repository linking:
  - Accept a GitHub repository URL or `owner/repo` identifier.
  - Store linked repository metadata in the Lumina workspace.
  - Show latest sync state and source branch/repository context.

- GitHub issue intake:
  - Pull open GitHub issues into Lumina.
  - Preserve title, description, labels, issue number, issue URL, author, timestamps, and status.
  - Avoid duplicate tasks when the same GitHub issue is synced repeatedly.

- Lumina issue creation:
  - Let users create issues directly in Lumina with title, description, severity, labels, and story points.
  - Optionally mark a Lumina-created issue as ready to push to GitHub.

- AI routing:
  - Recommend an assignee using labels, severity, story points, team ownership, workload, availability, and current active issue count.
  - Explain why the developer was recommended.
  - Keep routing advisory until a human applies the recommendation.

- Task-level Codex analysis:
  - Generate a developer-ready summary.
  - Generate reproduction steps.
  - Identify likely root cause.
  - Recommend a fix plan.
  - Flag risks and unknowns.
  - Show an approval state where the developer can give a go sign.

- GitHub sync-back:
  - Support status sync back to GitHub for assigned, in progress, and resolved states.
  - For hackathon demo reliability, support seeded/mock sync when live GitHub API credentials are unavailable.

- Admin AI chat:
  - Support bulk edit, bulk reassignment, and bulk prioritization suggestions.
  - Require explicit confirmation before destructive actions.

### Non-Functional Requirements

- AI suggestions must be advisory only and never execute code without human approval.
- Bulk actions must require clear confirmation before completion.
- The system should remain responsive for task browsing, chat, routing updates, and Codex analysis.
- The MVP should remain demo-ready even if live GitHub API access is unavailable.
- The codebase should separate frontend workspace flows, backend issue APIs, routing logic, and future persistence.

## 7. User Experience Notes

- The first screen should be the usable developer workspace, not a marketing landing page.
- The workspace should show repository connection, sync controls, issue queue, routing recommendation, Codex analysis, and approval state in one coherent flow.
- Admins should be able to chat with Lumina AI from within the task workspace.
- Bulk actions must always show a confirmation step before execution.
- AI output should be clear, actionable, and written for developers.
- The demo should make the human-in-the-loop step obvious: AI analyzes and recommends, then the developer gives the go sign.

## 8. Success Metrics

- 95%+ of GitHub issues sync into Lumina without manual correction.
- Task status updates sync between Lumina and GitHub within 30 seconds.
- 80%+ of AI routing suggestions are accepted without reassignment.
- Developers can get a useful summary, reproduction path, and fix plan in under 2 minutes.
- AI assistance reduces issue triage and understanding time by at least 30%.
- 100% of destructive bulk actions require explicit admin confirmation.
- Admin bulk workflows reduce manual task management time by at least 40%.
- The hackathon demo clearly shows the full flow: GitHub intake to AI routing to developer AI assistant to approval to sync-back.

## 9. Assumptions / Risks / Dependencies

### Assumptions

- Lumina remains focused on developer issue operations, not general project management.
- GitHub issues are a primary source of truth for part of the task lifecycle.
- GitHub is the primary external source for issue data in the MVP.
- Admins will be trusted to review and confirm bulk actions.
- AI suggestions are advisory and do not execute code or make final decisions.
- The MVP should prioritize a polished end-to-end workflow over broad enterprise workflow coverage.
- PostgreSQL is the target persistence layer, but seeded in-memory data is acceptable for local hackathon demos.

### Risks

- Incorrect routing could assign work to the wrong person or team.
- Bulk AI actions could cause data loss if confirmations are weak.
- AI-generated reproduction or fix guidance may be inaccurate or incomplete.
- GitHub API rate limits or missing tokens could interrupt the live demo.

### Dependencies

- GitHub API for issue sync.
- Backend task and user management in ExpressJS.
- PostgreSQL for task, routing, and user data.
- Frontend AI chat and admin workflows in React and TypeScript.
- Codex or Codex-style analysis integration for task understanding and developer approval workflows.

## 10. Open Questions

- Should GitHub sync be bi-directional for comments and status, or only status updates?
- What bulk actions should Lumina AI support at launch besides delete, edit, reassign, and prioritize?
- Should routing be fully automated after confidence exceeds a threshold, or always require human approval?
- Should one Lumina workspace connect to one repository for MVP simplicity, or support multiple repositories immediately?
- Should Codex analysis remain a structured task-plan generator, or eventually open a real code workspace?

## 11. Notes / Ideas

- Build the MVP around a polished end-to-end demo before expanding secondary workflows.
- Use seeded issue/task data if live GitHub integration is unstable during the hackathon demo.
- Make the "developer gives go sign" interaction a visible state change, because it clearly communicates the safety model.
- Keep the backend API shaped like real integration endpoints even when returning seeded demo data.
