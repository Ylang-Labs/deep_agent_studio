# Open Deep Researcher Agents

This project packages a production-oriented LangGraph deep research agent alongside a Next.js assistant-ui frontend that exposes its stateful planning and artifact system. Use this document as your jumping-off point for understanding how the graphs are wired, how state moves between components, and where to customize behaviour.

## Repository Map

- **backend/** — Python LangGraph server. The registered graph(s) live under `backend/src`. Static assets and developer docs live in `backend/static` and `docs/`.
- **frontend/** — Next.js 15 client built on assistant-ui. It renders the graph's message stream, TODO list, and virtual files in real time.
- **docs/** — Notebooks and tutorial scripts that mirror the backend implementation for learning and experimentation.

## Graph Registry & Entry Points

- `backend/langgraph.json` registers the deployable graphs. Today the only exported graph is `deep_researcher_agent` pointing at `backend/src/deep_researcher_agent/agent.py:agent`.
- The backend is shipped as an editable install (`pip install -e .[dev]`), so importing `deep_researcher_agent` from elsewhere in the project resolves to the same package used by the runtime and tests.

## Deep Researcher Graph

The `deep_researcher_agent` graph extends LangGraph's ReAct template with explicit planning, a virtual file system, and focused research delegation.

### Core Loop

- The primary agent is created via `create_react_agent` with a deterministic Gemini 2.5 Pro chat model and a 50-step recursion limit.
- The system prompt (`INSTRUCTIONS`) stitches together TODO guidance, file system rules, and delegation limits so the agent always plans before acting and only finalizes once all TODOs are complete.

### State Schema

- `DeepAgentState` extends `AgentState` with `todos` and `files` fields so TODO lists and file artifacts persist across turns.
- `file_reducer` merges file dictionaries on updates, letting tools write incrementally without clobbering existing artifacts.

### Tools Available to the Primary Agent

1. **Virtual file system** — `ls`, `read_file`, `write_file` expose a state-backed file cabinet for long-form artifacts.
2. **TODO management** — `write_todos` (create/update lists) and `read_todos` (reflect progress) enforce structured planning.
3. **Research helpers** — `tavily_search` performs context-offloading Tavily searches, and `think_tool` captures deliberate reflections after each research step.
4. **Delegation** — the `task` tool spins up isolated sub-agents so research tasks run with fresh context.

### Research Sub-Agent

- Registered as `research-agent`, it shares the same base model but only receives the research-focused prompt (`RESEARCHER_INSTRUCTIONS`).
- Available tools are limited to `tavily_search` and `think_tool` to keep reflections tightly scoped.
- Concurrency and iteration guards (`max_concurrent_research_units=3`, `max_researcher_iterations=3`) prevent runaway fan-out.

### Context Offloading Workflow

1. Primary agent plans TODOs, delegating discrete research tracks via the `task` tool when needed.
2. Each sub-agent researches a single topic, writing summaries + raw captures to unique files for later synthesis.
3. Completed files surface in LangGraph state and stream to the frontend sidebar for human review.
4. The main agent reads the saved files, updates TODO statuses, and finally produces a consolidated answer.

## Frontend Assistant

- `frontend/components/MyAssistant.tsx` hosts the assistant runtime. It streams messages and `updates` events from LangGraph, watching for `todos` and `files` in the state payload to keep the UI in sync.
- Providers in `components/assistant-ui/` supply context to the threaded chat view, TODO timeline, and files sidebar. The sidebar renders markdown previews, supports expand/collapse, and offers copy-to-clipboard for synthesized artifacts.
- REST calls (create thread, stream runs, fetch state) use `@langchain/langgraph-sdk` through `frontend/lib/chatApi.ts`, defaulting to the local Next.js `/api` proxy unless `NEXT_PUBLIC_LANGGRAPH_API_URL` is set.

## Running the Stack Locally

1. **Backend**
   - `cd backend`
   - `cp .env.example .env` and populate provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, etc.).
   - Install dependencies: `pip install -e .[dev]` (or `uv sync`).
   - Optional smoke checks: `make test`, `make lint`.
   - Launch: `make run-dev` to start the LangGraph server and Studio endpoints on `http://127.0.0.1:2024`.
2. **Frontend**
   - `cd frontend`
   - `cp .env.example .env.local` and set `LANGGRAPH_API_URL`, `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID`, and `LANGCHAIN_API_KEY` for the proxy header.
   - Install dependencies (`pnpm install`) and run `pnpm dev` to serve the UI on `http://localhost:3000`.

## Testing & Validation

- **Backend** — `make test` runs pytest. Add unit tests under `backend/tests/unit_tests/` mirroring the module tree. `make lint` executes Ruff (lint + formatting) and mypy.
- **Frontend** — `pnpm lint` covers ESLint + TypeScript. Add component tests once a standardized framework (e.g., Vitest or Playwright) is introduced; document new commands in this file.
- **End-to-end sanity** — Use LangGraph Studio or the assistant UI to ensure TODO updates, file writes, and sub-agent delegation behave as expected after changes.

## Contributing Checklist

1. Align docs and prompts when adding new behaviour so autogenerated guidance stays accurate.
2. Keep TODO status transitions explicit—update the list after every meaningful step so humans can follow along.
3. Run `make lint`, `make test`, and `pnpm lint` before opening a PR. Call out any knowingly skipped checks.
4. Update this file whenever you add graphs, tools, or UI surfaces that change agent capabilities.
