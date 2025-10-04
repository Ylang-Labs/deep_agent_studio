# Deep Researcher Agent Backend

This package hosts the LangGraph server that powers the Deep Agent Studio "deep researcher" experience. It stitches together planning, delegated research, and a virtual file system so the frontend can stream TODO progress and artifacts in real time.

## What Ships in This Backend

- **`deep_researcher_agent.agent`** assembles the production graph via `create_react_agent` with a deterministic Gemini 2.5 Pro model, TODO/file tooling, and a delegation layer for research sub-agents.
- **Stateful planning** extends LangGraph's `AgentState` with TODOs and file artifacts (`state.DeepAgentState`), ensuring plans and long-form notes persist across turns.
- **Virtual artifact cabinet** (`file_tools.py`) exposes `ls`, `read_file`, and `write_file` so research captures stay outside the model context window while remaining queryable.
- **Research delegation** (`task_tool.py`) spins up scoped sub-agents that only use `tavily_search` + `think_tool`, capped by concurrency and iteration guardrails.
- **Guidance prompts** (`prompts.py`) keep the primary agent disciplined about TODO hygiene, file management, and when to delegate.

## Local Setup

```bash
# 1. Navigate into the backend package
cd backend

# 2. Copy environment template and add provider keys
cp .env.example .env
# Required: OPENAI_API_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY (plus any others you enable)

# 3. Install dependencies (editable mode)
uv sync
# OR
pip install -e .[dev]
```

### Running the Dev Server

```bash
uvx --refresh --from "langgraph-cli[inmem]" --with-editable . --python 3.11 langgraph dev --allow-blocking
# OR
make run-dev
```

### Tests and Quality Gates

```bash
python -m pytest tests/unit_tests/
# OR
make test
```

```bash
python -m ruff check .
python -m ruff format . --diff
python -m ruff check --select I .
python -m mypy --strict .
python -m mypy --strict . --cache-dir .mypy_cache
# OR
make lint
```

```bash
ruff format .
ruff check --select I --fix .
# OR
make format
```

Use `python -m pytest tests/unit_tests/test_module.py` (or `make test TEST_FILE=...`) for targeted runs. Ruff and mypy caches are configured inside the repo so repeated runs stay fast.

## Integrating with the Frontend

The Next.js UI communicates with this backend by:

- Creating threads and streaming LangGraph runs through the `/api` proxy in `frontend/lib/chatApi.ts`.
- Listening for `todos` and `files` fields in state updates to keep the timeline and artifact sidebar synchronized.
- Surfacing the same `deep_researcher_agent` exported in `backend/langgraph.json` (assistant id `"Deep Researcher"`).

When deploying, ensure the frontend's `LANGGRAPH_API_URL` (or `NEXT_PUBLIC_LANGGRAPH_API_URL`) points at the hosted LangGraph server, and propagate the API key via the proxy headers if you enforce authentication.

## Customizing the Agent

- **Models**: Change the `model=` call in `agent.py` to use a different provider; the rest of the graph remains unchanged.
- **Tooling**: Add or swap tools by extending the `built_in_tools` list or amending `sub_agent_tools` in `agent.py`.
- **Prompts & guardrails**: Edit `prompts.py` to tweak TODO, file, or delegation discipline; changes automatically flow into the primary agent instructions.
- **State**: Extend `DeepAgentState` if you need extra persisted fields (e.g., metrics, citations). Remember to update reducers in `state.py` accordingly.
