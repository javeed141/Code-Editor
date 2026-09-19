# AI Coding Agent — Simple Implementation Plan
## Phased plan for the existing GitHub Web Code Editor

## Main Goal

Build the AI chatbot so a user can type a request such as:

> Add JWT authentication to the login route.

and the application follows:

```text
User request
    ↓
AI Agent
    ↓
Understand current local workspace
    ↓
Find relevant files
    ↓
Read relevant files
    ↓
Plan changes
    ↓
Propose file changes
    ↓
Show changes in Monaco Diff
    ↓
User reviews
    ↓
Apply / Reject
    ↓
Local React state
    ↓
IndexedDB
    ↓
Existing Commit → GitHub
```

## Core architecture rule

```text
GitHub
  = remote repository / source of truth

IndexedDB
  = persistent local branch workspace

React state
  = current live editor content, including unsaved changes

AI Agent
  = reads the local workspace and proposes changes

GitHub Commit
  = explicit user action after reviewing changes
```

The AI must **not directly edit or push to GitHub**.

---

# Phase 0 — Freeze the Current Workspace Architecture

## Goal

Make the existing editor a stable foundation before adding AI.

Verify that the current application supports:

- GitHub sign-in
- repository selection
- branch selection
- branch snapshot loading
- IndexedDB storage
- File Explorer
- Monaco Editor
- manual editing
- local Save
- Commit to GitHub

Use one clear workspace model:

```text
IndexedDB snapshot
        +
current React editor changes
        ↓
Effective workspace
```

When a file has an unsaved React change, React state is newer and must win.

When it has no unsaved change, use the IndexedDB snapshot.

## Package

No new package.

## Done when

The agent can clearly identify:

- current repository
- current branch
- local saved file
- current unsaved file
- how the latest effective file content is obtained

---

# Phase 1 — Connect ChatPanel to an LLM

## Goal

Make the existing right-side chat panel work with an LLM.

Architecture:

```text
ChatPanel
    ↓
Next.js /api/agent
    ↓
OpenAI SDK
    ↓
Model
```

The model API key stays server-side.

## Package

Install:

```text
openai
```

The current official OpenAI JavaScript/TypeScript SDK uses the Responses API as its primary interface. The Responses API also supports custom function tools. 

## Environment variable

```text
OPENAI_API_KEY
```

Do not expose it to the browser.

## Scope

First implement normal chat only.

Example:

```text
User: Explain what this project does.
AI: ...
```

Do not add file editing yet.

## Done when

```text
Chat message
    ↓
AI API
    ↓
Model response
    ↓
Chat UI
```

---

# Phase 2 — Create the Workspace Bridge

## Goal

Give the AI access to the **current local workspace**.

Important browser boundary:

```text
IndexedDB exists in the browser.
```

A server-side agent cannot directly query browser IndexedDB.

Therefore create a small bridge:

```text
React + IndexedDB
       ↓
Effective workspace payload
       ↓
/api/agent
       ↓
AI Agent
```

## Effective workspace

The browser combines:

```text
IndexedDB snapshot
+
current React editor buffers
+
pending local changes
```

The AI must see the newest local content.

## Simple MVP approach

For the first version, it is acceptable for the browser to send the supported local text-file snapshot with the agent request.

Do not optimize for huge repositories yet.

## Important

This phase must not call GitHub to read files.

The branch snapshot is already local.

## Done when

The AI API can receive the current local repository workspace without making per-file GitHub requests.

---

# Phase 3 — Add Read-Only Agent Tools

## Goal

Turn the chatbot into an actual coding agent.

Start with only these tools:

```text
1. list_files
2. read_file
3. search_files
4. get_current_file
5. get_changed_files
```

## Tool responsibilities

### list_files

Returns the files available in the current workspace.

### read_file

Returns the current effective content of a specific file.

### search_files

Finds text such as:

```text
auth
login
JWT
database
router
```

inside the local workspace.

### get_current_file

Returns the file currently open in Monaco, using its newest local content.

### get_changed_files

Returns files that already have local changes.

## Important

The model requests a tool; **your application executes it** and returns the result. The OpenAI Responses function-tool flow is application-executed rather than the model directly accessing your files. 

## Do not add yet

```text
commit
push
merge
terminal
npm install
shell execution
```

## Done when

For:

> Where is the login logic?

the agent can:

```text
list_files
    ↓
search_files("login")
    ↓
read_file(...)
    ↓
answer
```

---

# Phase 4 — Build the Agent Loop

## Goal

Allow the agent to make multiple tool calls before giving its answer.

Flow:

```text
User request
      ↓
Agent
      ↓
Need tool?
   /      \\
 yes       no
  ↓         ↓
execute   final answer
  ↓
tool result
  ↓
Agent
  ↓
more tools?
  ↓
...
```

## Example

User:

> Add error handling to the login route.

The agent may:

```text
search_files("login")
        ↓
read_file("src/routes/login.js")
        ↓
read_file("src/server.js")
        ↓
final response / proposal
```

## Limits

Add simple limits:

```text
maximum tool calls
maximum files read
maximum context size
maximum execution time
```

Do not allow an infinite tool loop.

## Done when

The agent can inspect multiple local files and reach a result without manual file selection for every step.

---

# Phase 5 — Add Structured File-Change Proposals

## Goal

Allow the AI to propose edits.

Add one write-like tool:

```text
propose_file_change
```

The AI must **not** directly overwrite IndexedDB.

## Proposal concept

Each proposal should contain:

```text
file path
operation
original/current version reference
proposed content
reason
```

Operations:

```text
modify
add
delete
```

## Example

User:

> Add JWT middleware.

Agent proposes:

```text
M src/server.js
A src/middleware/auth.js
M package.json
```

This is still only a proposal.

## Done when

The agent can return one or multiple structured file changes instead of only writing code in chat text.

---

# Phase 6 — Connect Proposals to the Existing Diff UI

## Goal

Reuse the existing Monaco Diff Editor and Commit Changes UI.

Do not create another diff system.

Flow:

```text
AI proposal
    ↓
Changed files list
    ↓
Monaco Diff
```

Show:

```text
AI Changes

M src/server.js
A src/middleware/auth.js
M package.json
```

For each file:

```text
Original
   vs
AI proposed version
```

## UI actions

```text
Apply
Reject
```

Also support where practical:

```text
Apply all
Reject all
```

## Done when

The user can inspect AI changes visually before any local file is modified.

---

# Phase 7 — Apply Approved Changes to the Local Workspace

## Goal

Make approved AI changes behave exactly like manual edits.

Flow:

```text
AI proposal
    ↓
User clicks Apply
    ↓
React editor state
    ↓
Monaco
    ↓
IndexedDB on Save
```

Do not update GitHub automatically.

## Key design idea

Both editing methods feed the same local workspace:

```text
Manual edit ──┐
              ↓
          Local workspace
              ↑
AI Apply ──────┘
              ↓
          Commit → GitHub
```

## Done when

The user can manually edit one file and apply an AI edit to another file, and both appear together in the existing changed-files list.

---

# Phase 8 — Protect Manual Changes from AI Changes

## Goal

Prevent AI from overwriting newer user edits.

Example:

```text
AI reads server.js version A
        ↓
User manually changes server.js to version B
        ↓
AI returns a proposal based on A
```

Do not blindly replace B.

The proposal should carry enough version information to detect that its source is stale.

If stale:

```text
File changed since the AI read it.
Please review/regenerate the change.
```

For the MVP, do not build a sophisticated merge engine.

## Effective-content rule

```text
Current unsaved React content
        >
Saved IndexedDB content
        >
Original GitHub snapshot
```

where `>` means newer content has priority.

## Done when

A newer manual edit cannot be silently erased by an older AI proposal.

---

# Phase 9 — Improve Repository Understanding

## Goal

Make the agent better at finding relevant code without adding RAG yet.

Strengthen `search_files` with:

- case-insensitive search
- path filtering
- language filtering
- multiple matches
- concise matching results

Potential later tools:

```text
get_file_info
get_project_metadata
get_imports
get_symbol_info
get_related_files
```

Do not add AST parsing or embeddings yet unless there is a concrete need.

## Done when

Common requests such as:

```text
Find all JWT usage.
Where is the database connection?
Where is the login controller?
```

can be answered reliably from local workspace data.

---

# Phase 10 — Conversation Memory

## Goal

Support follow-up requests.

Example:

```text
User: Add authentication.
AI: I proposed changes.
User: Now add refresh tokens.
```

The second message should understand the first interaction.

Store locally, for the MVP:

```text
conversation ID
messages
tool activity
workspace identity
```

Workspace identity should include:

```text
repository
branch
snapshot ID
```

IndexedDB is sufficient for local chat persistence at this stage.

Do not add a server database unless later requirements need cross-device persistence.

## Done when

Follow-up requests continue naturally inside the same repository/branch workspace.

---

# Phase 11 — Agent Activity UI

## Goal

Show what the agent is doing in a useful, concise way.

Example:

```text
Agent activity

✓ Listed files
✓ Searched "authentication"
✓ Read src/routes/login.js
✓ Read src/server.js
→ Preparing changes...
```

Useful states:

```text
Thinking...
Searching...
Reading files...
Preparing changes...
Waiting for approval...
Done
```

Do not expose hidden/private chain-of-thought. Show only useful tool/action status.

## Done when

The user can understand the agent's progress without seeing internal reasoning.

---

# Phase 12 — Streaming

## Goal

Make the chat feel responsive after the non-streaming agent is stable.

Possible flow:

```text
Agent starts
   ↓
stream response
   ↓
show text progressively
   ↓
show tool activity
   ↓
show final response
```

Do this after the basic agent loop works.

The current OpenAI JS SDK supports streaming Responses output, including streamed tool-call argument events. 

## Done when

Longer agent responses appear progressively rather than waiting for the entire response.

---

# Phase 13 — Agent Safety and Limits

## Goal

Keep the AI agent controlled.

For the first version, the AI may only:

```text
read
search
propose changes
```

It must NOT:

```text
commit
push
merge
change GitHub permissions
delete repositories
run shell commands
install packages
```

## Add limits

```text
maximum tool calls
maximum files read
maximum context size
maximum proposed files
maximum request duration
```

When the limit is reached:

```text
The agent reached its operation limit.
Please continue with another request.
```

## Done when

The agent cannot autonomously perform dangerous repository operations.

---

# Phase 14 — Connect to the Existing GitHub Commit Flow

## Goal

Reuse the commit/push system that is already working.

Final chain:

```text
AI
 ↓
Proposal
 ↓
Diff
 ↓
User Apply
 ↓
Local React state
 ↓
IndexedDB
 ↓
Changed files
 ↓
Existing Commit Changes modal
 ↓
GitHub
```

There should be no direct:

```text
AI → GitHub
```

path.

## Done when

An AI-generated modification becomes indistinguishable from a manual modification from the point of view of the Git commit workflow.

---

# Phase 15 — Final AI Capabilities

The first useful version should support:

## Understand

```text
Explain this file.
Where is authentication handled?
How does the API connect to the database?
```

## Search

```text
Find all places where JWT is used.
```

## Modify

```text
Add error handling to the login route.
Refactor this controller.
Add validation.
Update the API response.
```

## Multi-file changes

```text
Add authentication middleware and update the login route.
```

The agent should be able to:

```text
search
→ read multiple files
→ plan
→ propose multiple changes
```

## Review

```text
Explain what you changed.
```

## Apply / reject

```text
Apply
Reject
Apply all
Reject all
```

## Commit

The existing commit workflow remains responsible for the remote GitHub update.

---

# Final Architecture

```text
                         GitHub
                            ↑
                            │
                     Commit / Push
                            │
                    ┌───────┴───────┐
                    │ Local Changes │
                    └───────┬───────┘
                            ↑
                 ┌──────────┴──────────┐
                 │                     │
           Manual Editing          AI Apply
                 │                     │
                 └──────────┬──────────┘
                            │
                     React Workspace
                            │
                       Save / Read
                            │
                        IndexedDB
                            │
                       Local Snapshot
                            │
             ┌──────────────┴──────────────┐
             │                             │
        File Explorer                  AI Agent
             │                             │
          Monaco                    list_files
                                      read_file
                                   search_files
                                  get_current_file
                                  get_changed_files
                                 propose_file_change
```

---

# Package Plan

## First required AI package

```text
openai
```

## Optional validation package

Add only when needed:

```text
zod
```

Use it for strict validation of tool inputs/outputs if the implementation benefits from it.

## Do not add initially

```text
❌ Vector database
❌ RAG framework
❌ Redis
❌ WebSockets
❌ Agent orchestration framework
❌ Terminal
❌ Docker
❌ Git CLI
❌ Second state-management library
```

A direct OpenAI SDK + Responses API + function tools is deliberately simple and keeps the agent loop understandable. The higher-level OpenAI Agents SDK exists, but it is not necessary for the first version. 

---

# Recommended Build Order

```text
PHASE 1  → Basic AI chat
PHASE 2  → Workspace bridge
PHASE 3  → Read-only tools
PHASE 4  → Agent loop
PHASE 5  → Change proposals
PHASE 6  → Diff review
PHASE 7  → Apply to local workspace
PHASE 8  → Protect manual + AI changes
PHASE 9  → Better repository search
PHASE 10 → Conversation memory
PHASE 11 → Agent activity UI
PHASE 12 → Streaming
PHASE 13 → Safety limits
PHASE 14 → Existing GitHub commit flow
```

Do not skip directly from chat to autonomous file modification.

---

# Critical Acceptance Test

Do not consider the AI feature complete until this exact scenario works:

```text
1. Select repository + branch
2. Branch snapshot exists locally
3. Open src/login.js
4. Manually edit it
5. Save locally
6. Ask AI:

   "Add JWT authentication to the login flow."

7. AI searches local workspace
8. AI reads the CURRENT local login.js
9. AI reads related files
10. AI proposes multi-file changes
11. Diff viewer appears
12. User reviews changes
13. User rejects one file
14. User applies the others
15. Applied changes appear in Monaco
16. Save locally
17. Changed-files count updates
18. Open Commit Changes
19. Review final diff
20. Commit through existing GitHub workflow
21. GitHub receives the final approved changes
```

## Network rule

During the AI workflow:

```text
❌ Do not fetch individual files from GitHub because the AI needs them.
```

The agent should use the local workspace already loaded from:

```text
IndexedDB + current React state
```

GitHub remains the remote destination, not the AI's file-reading database.

---

# STOP CONDITION

The first AI milestone is complete when:

```text
User asks for a code change
        ↓
Agent finds relevant local files
        ↓
Agent reads current local content
        ↓
Agent proposes changes
        ↓
User sees Monaco diff
        ↓
User applies/rejects
        ↓
Local workspace changes
        ↓
IndexedDB stores changes
        ↓
Existing Commit flow can send them to GitHub
```

Do NOT add RAG, embeddings, terminal execution, Docker, or autonomous Git operations until this complete loop is reliable.
