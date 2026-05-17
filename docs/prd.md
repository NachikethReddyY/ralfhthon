# Product Requirements Document

## 1. Product Summary

**Working title:** Lumina

**One-line description:** An AI-assisted issue intake, routing, and task-management platform for developers and Lumina admins.

**Problem we’re solving:** Teams lose time manually reading, reproducing, classifying, routing, and coordinating issue resolution. Developers need better issue context, and admins need a safe way to manage tasks at scale.

**Proposed solution:** Build a web app on ExpressJS, Postgres, React, and TypeScript that supports two-way sync with GitHub issues, uses AI to route tasks based on labels, story points, workload, severity, team ownership, and assignee availability, and provides an AI assistant that can analyze a task card, generate reproduction steps, summarize root cause, and recommend a fix plan without executing code.

---

## 2. Goals

- Automate two-way issue intake and status syncing between GitHub and Lumina.
- Help developers understand bugs faster with AI-generated reproduction steps, root-cause summaries, and fix guidance.
- Help admins manage routing, assignment, and bulk task operations with AI assistance and confirmation safeguards.
- Keep developers in control by making the AI advisory-only, not code-executing.

## 3. Non-Goals

- Auto-fixing code base or modifying code. 
- Replacing developers, admins, or collaboratives in final decision-making.
- Rerouting tasks after it has been allocated to a developer
- Building a seperate workflow to work around tasks it has been delegated with

## 4. Users / Personas

### Primary user
- Developer triaging and resolving issues.

### Secondary user
- Lumina admin managing people, routing, bulk actions, and task coordination.
- Product/ops user creating tasks from GitHub or the internal portal.

## 5. Core Use Cases

- Create a task manually in the portal or ingest one from GitHub.
- Sync task status back to GitHub when the source issue changes or is resolved.
- Use AI routing to classify, prioritize, assign, and balance work based on labels, story points, severity, team ownership, and workload.
- Open a task card and ask the AI for reproduction steps, root-cause summary, and a recommended fix plan.
- Ask the AI to perform bulk task actions such as edits or deletions, with confirmation required before destructive actions.

## 6. Requirements

### Functional Requirements
- Two-way sync between GitHub issues and Lumina tasks.
- AI routing that considers labels, story points, severity, workload, team ownership, and assignee availability.
- Task-level AI assistant that can summarize the issue, suggest reproduction steps, identify likely root cause, and recommend a fix plan.
- Admin AI chat that supports bulk edits and bulk actions with explicit confirmation before destructive operations.

### Non-Functional Requirements
- AI suggestions must be advisory only and never execute code.
- Bulk actions must require clear confirmation before completion.
- The system should remain responsive for task browsing, chat, and routing updates.

## 7. User Experience Notes

- Admins should be able to chat with Lumina AI from within the task workspace.
- Bulk actions must always show a confirmation step before execution.
- AI output should be clear, actionable, and written for developers.

## 8. Success Metrics

- 
- 
- 

## 9. Assumptions / Risks / Dependencies

### Assumptions
- GitHub issues are a primary source of truth for part of the task lifecycle.
- Admins will be trusted to review and confirm bulk actions.
- AI suggestions are advisory and do not execute code or make final decisions.

### Risks
- Incorrect routing could assign work to the wrong person or team.
- Bulk AI actions could cause data loss if confirmations are weak.
- AI-generated reproduction or fix guidance may be inaccurate or incomplete.

### Dependencies
- GitHub API for issue sync.
- Backend task and user management in ExpressJS.
- PostgreSQL for task, routing, and user data.
- Frontend AI chat and admin workflows in React and TypeScript.

## 10. Open Questions

- Should GitHub sync be bi-directional for comments and status, or only status updates?
- What bulk actions should Lumina AI support at launch besides delete and edit?
- Should routing be fully automated or require human approval before assignment changes?

## 11. Notes / Ideas

- 
- 
- 
