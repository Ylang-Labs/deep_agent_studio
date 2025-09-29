"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";

import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";
import { TodosProvider } from "@/components/assistant-ui/todo-context";
import { Thread } from "@/components/assistant-ui/thread";
import type { AgentTodo, AgentTodoStatus } from "@/types/agentTodo";

const TODO_STATUSES: ReadonlySet<AgentTodoStatus> = new Set([
  "pending",
  "in_progress",
  "completed",
]);

const parseTodos = (value: unknown): AgentTodo[] | undefined => {
  if (value == null) return [];
  if (!Array.isArray(value)) return undefined;

  const validTodos: AgentTodo[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { content, status } = entry as Record<string, unknown>;
    if (typeof content !== "string") continue;
    if (typeof status !== "string" || !TODO_STATUSES.has(status as AgentTodoStatus))
      continue;
    validTodos.push({ content, status: status as AgentTodoStatus });
  }

  return validTodos;
};

const MAX_TODO_SEARCH_DEPTH = 6;

const findTodosInPayload = (
  payload: unknown,
  depth = 0,
): AgentTodo[] | undefined => {
  if (payload == null || depth > MAX_TODO_SEARCH_DEPTH) return undefined;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const result = findTodosInPayload(item, depth + 1);
      if (result !== undefined) return result;
    }
    return undefined;
  }

  if (typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;

  if ("todos" in record) {
    const parsed = parseTodos(record.todos);
    if (parsed !== undefined) return parsed;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "__interrupt__" || key === "messages") continue;
    const nested = findTodosInPayload(value, depth + 1);
    if (nested !== undefined) return nested;
  }

  return undefined;
};

const areTodosEqual = (a: AgentTodo[], b: AgentTodo[]) => {
  if (a.length !== b.length) return false;
  return a.every(
    (todo, index) =>
      todo.content === b[index]?.content && todo.status === b[index]?.status,
  );
};

export function MyAssistant() {
  const threadIdRef = useRef<string | undefined>(undefined);
  const [todosState, setTodosState] = useState<{
    todos: AgentTodo[];
    lastUpdatedAt: number;
  }>({ todos: [], lastUpdatedAt: 0 });

  const updateTodos = useCallback((nextTodos: AgentTodo[]) => {
    setTodosState((previous) =>
      areTodosEqual(previous.todos, nextTodos)
        ? previous
        : { todos: nextTodos, lastUpdatedAt: Date.now() },
    );
  }, []);

  const resetTodos = useCallback(() => {
    setTodosState((previous) =>
      previous.todos.length === 0
        ? previous
        : { todos: [], lastUpdatedAt: Date.now() },
    );
  }, []);

  const applyTodos = useCallback(
    (payload: unknown, fallbackToEmpty = false) => {
      const extracted = findTodosInPayload(payload);
      if (extracted !== undefined) {
        updateTodos(extracted);
      } else if (fallbackToEmpty) {
        resetTodos();
      }
    },
    [resetTodos, updateTodos],
  );

  const runtime = useLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (messages, { command, runConfig, abortSignal }) => {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      const stream = await sendMessage({
        threadId,
        messages,
        command,
        runConfig,
        abortSignal,
      });

      async function* streamWithTodos() {
        for await (const chunk of stream) {
          if (chunk?.event === "updates") {
            applyTodos(chunk.data);
          }
          yield chunk;
        }
      }

      return streamWithTodos();
    },
    onSwitchToNewThread: async () => {
      const { thread_id } = await createThread();
      threadIdRef.current = thread_id;
      resetTodos();
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      threadIdRef.current = threadId;
      applyTodos(state.values, true);
      return { messages: state.values.messages };
    },
  });

  const todosContextValue = useMemo(
    () => ({
      todos: todosState.todos,
      lastUpdatedAt: todosState.lastUpdatedAt,
    }),
    [todosState],
  );

  return (
    <TodosProvider value={todosContextValue}>
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </TodosProvider>
  );
}
