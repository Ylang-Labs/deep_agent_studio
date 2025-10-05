"""Deep researcher agent assembly.

This module wires together the tools, prompts, and state configuration required
for the deep research agent. The structure mirrors the tutorial agent from
``docs/4_full_agent.py`` while adapting imports to the backend package layout.
"""

from datetime import datetime

from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent

from deep_researcher_agent.file_tools import ls, read_file, write_file
from deep_researcher_agent.prompts import (
    FILE_USAGE_INSTRUCTIONS,
    RESEARCHER_INSTRUCTIONS,
    SUBAGENT_USAGE_INSTRUCTIONS,
    TODO_USAGE_INSTRUCTIONS,
)
from deep_researcher_agent.research_tools import (
    get_today_str,
    tavily_search,
    think_tool,
)
from deep_researcher_agent.state import DeepAgentState
from deep_researcher_agent.task_tool import _create_task_tool
from deep_researcher_agent.todo_tools import write_todos, read_todos

# Model configuration matches the tutorial agent for consistent behaviour.
model = init_chat_model(model="anthropic:claude-sonnet-4-5-20250929", temperature=0)

# Limits for delegation and sub-agent coordination.
max_concurrent_research_units = 3
max_researcher_iterations = 3

# Tools available to the research sub-agent.
sub_agent_tools = [tavily_search, think_tool]

# Core tools available to the primary agent.
built_in_tools = [ls, read_file, write_file, write_todos, read_todos, think_tool]

# Define the specialized research sub-agent configuration.
research_sub_agent = {
    "name": "research-agent",
    "description": (
        "Delegate research to the sub-agent researcher. Only give this "
        "researcher one topic at a time."
    ),
    "prompt": RESEARCHER_INSTRUCTIONS.format(date=get_today_str()),
    "tools": ["tavily_search", "think_tool"],
}

# Task delegation tool for spawning isolated sub-agent contexts.
task_tool = _create_task_tool(
    sub_agent_tools, [research_sub_agent], model, DeepAgentState
)

delegation_tools = [task_tool]
all_tools = sub_agent_tools + built_in_tools + delegation_tools

# Assemble the full instruction block for the primary agent.
SUBAGENT_INSTRUCTIONS = SUBAGENT_USAGE_INSTRUCTIONS.format(
    max_concurrent_research_units=max_concurrent_research_units,
    max_researcher_iterations=max_researcher_iterations,
    date=datetime.now().strftime("%a %b %-d, %Y"),
)

INSTRUCTIONS = (
    "# TODO MANAGEMENT\n"
    + TODO_USAGE_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + "# FILE SYSTEM USAGE\n"
    + FILE_USAGE_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + "# SUB-AGENT DELEGATION\n"
    + SUBAGENT_INSTRUCTIONS
)

# Create the primary agent during module import. The caller can import
# ``agent`` directly without invoking a factory function.
agent = create_react_agent(
    model,
    all_tools,
    prompt=INSTRUCTIONS,
    state_schema=DeepAgentState,
).with_config({"recursion_limit": 50})

__all__ = ["agent"]
