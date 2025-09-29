"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";

import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";
import { TodosProvider } from "@/components/assistant-ui/todo-context";
import { FilesProvider } from "@/components/assistant-ui/files-context";
import { FilesSidebar } from "@/components/assistant-ui/files-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import type { AgentTodo, AgentTodoStatus } from "@/types/agentTodo";

const isAgentTodoStatus = (value: unknown): value is AgentTodoStatus => {
  switch (value) {
    case "pending":
    case "in_progress":
    case "completed":
      return true;
    default:
      return false;
  }
};

const parseTodos = (value: unknown): AgentTodo[] | undefined => {
  if (value == null) return [];
  if (!Array.isArray(value)) return undefined;

  const validTodos: AgentTodo[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { content, status } = entry as Record<string, unknown>;
    if (typeof content !== "string" || !isAgentTodoStatus(status)) continue;
    validTodos.push({ content, status });
  }

  return validTodos;
};

const parseFiles = (value: unknown): Record<string, string> | undefined => {
  if (value == null) return {};
  if (typeof value !== "object") return undefined;

  const entries = Object.entries(value as Record<string, unknown>);
  const sanitizedEntries = entries.filter(
    ([key, fileContent]) =>
      typeof key === "string" && typeof fileContent === "string",
  ) as Array<[string, string]>;

  return Object.fromEntries(sanitizedEntries);
};

const MAX_STATE_SEARCH_DEPTH = 6;

const findStateField = <T,>(
  payload: unknown,
  fieldName: string,
  extractor: (value: unknown) => T | undefined,
  depth = 0,
): T | undefined => {
  if (payload == null || depth > MAX_STATE_SEARCH_DEPTH) return undefined;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const result = findStateField(item, fieldName, extractor, depth + 1);
      if (result !== undefined) return result;
    }
    return undefined;
  }

  if (typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;

  if (fieldName in record) {
    const parsed = extractor(record[fieldName]);
    if (parsed !== undefined) return parsed;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "__interrupt__" || key === "messages") continue;
    const nested = findStateField(value, fieldName, extractor, depth + 1);
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

const areFilesEqual = (
  left: Record<string, string>,
  right: Record<string, string>,
) => {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) return false;

  for (const [key, value] of leftEntries) {
    if (right[key] !== value) return false;
  }
  return true;
};

const createEmptyTodos = () => [] as AgentTodo[];
const createEmptyFiles = () => ({}) as Record<string, string>;

const useTrackedValue = <T,>(
  initialValue: () => T,
  isEqual: (current: T, next: T) => boolean,
) => {
  const [{ value, lastUpdatedAt }, setState] = useState(() => ({
    value: initialValue(),
    lastUpdatedAt: 0,
  }));

  const update = useCallback(
    (nextValue: T) => {
      setState((previous) =>
        isEqual(previous.value, nextValue)
          ? previous
          : { value: nextValue, lastUpdatedAt: Date.now() },
      );
    },
    [isEqual],
  );

  const reset = useCallback(() => {
    const baseline = initialValue();
    setState((previous) =>
      isEqual(previous.value, baseline)
        ? previous
        : { value: baseline, lastUpdatedAt: Date.now() },
    );
  }, [initialValue, isEqual]);

  return { value, lastUpdatedAt, update, reset };
};

export function MyAssistant() {
  const threadIdRef = useRef<string | undefined>(undefined);
  const {
    value: todos,
    lastUpdatedAt: todosLastUpdatedAt,
    update: updateTodos,
    reset: resetTodos,
  } = useTrackedValue(createEmptyTodos, areTodosEqual);
  const {
    value: files,
    lastUpdatedAt: filesLastUpdatedAt,
    update: updateFiles,
    reset: resetFiles,
  } = useTrackedValue(createEmptyFiles, areFilesEqual);

  const applyStateUpdates = useCallback(
    (payload: unknown, fallbackToEmpty = false) => {
      const extractedTodos = findStateField(payload, "todos", parseTodos);
      if (extractedTodos !== undefined) {
        updateTodos(extractedTodos);
      } else if (fallbackToEmpty) {
        resetTodos();
      }

      const extractedFiles = findStateField(payload, "files", parseFiles);
      if (extractedFiles !== undefined) {
        updateFiles(extractedFiles);
      } else if (fallbackToEmpty) {
        resetFiles();
      }
    },
    [resetFiles, resetTodos, updateFiles, updateTodos],
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

      async function* streamWithState() {
        for await (const chunk of stream) {
          if (chunk?.event === "updates") {
            applyStateUpdates(chunk.data);
          }
          yield chunk;
        }
      }

      return streamWithState();
    },
    onSwitchToNewThread: async () => {
      const { thread_id } = await createThread();
      threadIdRef.current = thread_id;
      resetTodos();
      resetFiles();
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      threadIdRef.current = threadId;
      applyStateUpdates(state.values, true);
      return { messages: state.values.messages };
    },
  });

  const todosContextValue = useMemo(
    () => ({ todos, lastUpdatedAt: todosLastUpdatedAt }),
    [todos, todosLastUpdatedAt],
  );

  const filesContextValue = useMemo(
    () => ({ files, lastUpdatedAt: filesLastUpdatedAt }),
    [files, filesLastUpdatedAt],
  );

  return (
    <FilesProvider value={filesContextValue}>
      <TodosProvider value={todosContextValue}>
        <AssistantRuntimeProvider runtime={runtime}>
          <div className="aui-assistant-layout relative flex h-full min-h-0 flex-col bg-gradient-to-b from-background via-background to-muted/30">
            <div className="aui-assistant-shell relative flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="aui-assistant-thread-container relative flex min-h-0 flex-1 justify-center px-3 py-4 sm:px-6 lg:px-10">
                <div className="aui-assistant-thread-wrapper min-h-0 w-full max-w-4xl">
                  <Thread />
                </div>
              </div>
              <FilesSidebar />
            </div>
          </div>
        </AssistantRuntimeProvider>
      </TodosProvider>
    </FilesProvider>
  );
}
