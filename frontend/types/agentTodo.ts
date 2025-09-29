export type AgentTodoStatus = "pending" | "in_progress" | "completed";

export type AgentTodo = {
  content: string;
  status: AgentTodoStatus;
};
