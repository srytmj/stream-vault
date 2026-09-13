# StreamVault Assistant Guide & Concurrency Protocols

## Build & Development Commands
- Install all: `npm run install:all`
- Start server: `npm start`
- Dev server: `npm run server:dev`
- Dev client: `npm run client:dev`
- Build client: `npm run build:client`
- Sample media: `npm run setup:samples`
- Docker deploy: `docker compose up -d --build`

---

## Agent Workflow & Concurrency Rules

To ensure smooth operation when multiple AI agents are concurrently making changes to this codebase, you MUST adhere to the following strict workflow protocols:

1. **ALWAYS Read Before You Write:**  
   Upon initialization, your VERY FIRST action must be to read this file and `AGENT_LOG.md`.

2. **Task Locking Mechanism (`AGENT_LOG.md`):**  
   Immediately after receiving a user prompt, append an entry to `AGENT_LOG.md` with the exact timestamp, your identity, and a status of `[IN PROGRESS] - <Brief Description of the Task>`. This signals to all concurrent AI agents that specific files or features are locked by you. Don't touch features currently marked as `[IN PROGRESS]` by other agents.

3. **Propose First, Code Later:**  
   When asked to design, add a feature, or modify code, provide a detailed review or a step-by-step proposal of what you intend to do. Do NOT execute destructive changes or write code (via terminal tools or file editors) until the user explicitly responds with an explicit approval (e.g. "go", "gas", "ok").

4. **Task Completion & Unlocking:**  
   Once your proposed task is completed, fully tested, and committed, return to `AGENT_LOG.md`. Update your exact entry from `[IN PROGRESS]` to `[COMPLETED]` and include a brief bulleted summary of finalized changes.
