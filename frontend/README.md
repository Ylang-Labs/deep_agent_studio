# Deep Agent Studio Frontend

This package delivers the Next.js 15 assistant-ui client for the Deep Researcher agent. It streams LangGraph runs, mirrors TODO progress, and previews virtual file artifacts so you can co-pilot the backend agent in real time.

## Highlights

- **Stateful assistant runtime** powered by `@assistant-ui/react` with LangGraph streaming.
- **TODO timeline + file sidebar** wired to the backend's `DeepAgentState` updates.
- **Edge proxy** under `/api` that forwards requests to LangGraph while injecting API keys server-side.
- **Polished UI kit** built on Radix primitives, Tailwind, and animated markdown previews.

## Prerequisites

- Node.js 18.18+
- A running Deep Agent Studio backend (`uvx --refresh --from "langgraph-cli[inmem]" --with-editable . --python 3.11 langgraph dev --allow-blocking` or `make run-dev` inside `../backend`)
- Your preferred package manager (examples below use pnpm)

## Environment Setup

```bash
cp .env.example .env.local
```

Fill in:
- `LANGGRAPH_API_URL` – Base URL of the backend (e.g. `http://127.0.0.1:2024`)
- `LANGCHAIN_API_KEY` – Forwarded as `x-api-key` by the proxy
- `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID` – Graph identifier from `backend/langgraph.json` (defaults to `"Deep Researcher"`)
- Optional `NEXT_PUBLIC_LANGGRAPH_API_URL` – Override when bypassing the proxy

## Local Development

Install dependencies:

```bash
pnpm install
# OR
npm install
```

Run the dev server:

```bash
next dev --turbopack
# OR
pnpm dev
```

Open `http://localhost:3000`, ask a question, and watch TODOs and files stream from the backend.

## Quality Checks

Lint + typecheck:

```bash
next lint
# OR
pnpm lint
```

Prettier formatting:

```bash
prettier --check .
# OR
pnpm prettier
```

Auto-fix formatting:

```bash
prettier --write .
# OR
pnpm prettier:fix
```

Build for production:

```bash
next build
# OR
pnpm build
```

Preview the production build locally:

```bash
next start
# OR
pnpm start
```

## Deployment Notes

- Configure all required environment variables in your hosting provider; keep `LANGCHAIN_API_KEY` server-side.
- If hosting frontend and backend separately, either continue using the built-in proxy or ensure CORS + API key headers are correctly handled on the backend before exposing it directly to the browser.

Happy shipping!
