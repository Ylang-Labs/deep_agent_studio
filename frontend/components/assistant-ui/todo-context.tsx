"use client";

import { createContext, PropsWithChildren, useContext } from "react";

import type { AgentTodo } from "@/types/agentTodo";

type TodosContextValue = {
  todos: AgentTodo[];
  lastUpdatedAt: number;
};

const defaultValue: TodosContextValue = {
  todos: [],
  lastUpdatedAt: 0,
};

const TodosContext = createContext<TodosContextValue>(defaultValue);

type TodosProviderProps = PropsWithChildren<{
  value: TodosContextValue;
}>;

export const TodosProvider = ({ value, children }: TodosProviderProps) => {
  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
};

export const useTodos = () => useContext(TodosContext);
