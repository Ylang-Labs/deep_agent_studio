"""Graph definition for the deep research agent.

This mirrors the complete agent built in the tutorial notebook, combining:
- TODO planning and tracking
- Virtual file system for context offloading
- Research sub-agent delegation with Tavily search and reflection tooling
"""

from __future__ import annotations

from typing import Sequence

from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent

from legacy_deep_researcher_agent.file_tools import ls, read_file, write_file
from legacy_deep_researcher_agent.configuration import Configuration
from legacy_deep_researcher_agent.prompts import (
    FILE_USAGE_INSTRUCTIONS,
    RESEARCHER_INSTRUCTIONS,
    SUBAGENT_USAGE_INSTRUCTIONS,
    TODO_USAGE_INSTRUCTIONS,
)
from legacy_deep_researcher_agent.research_tools import get_today_str, tavily_search, think_tool
from legacy_deep_researcher_agent.state import DeepAgentState
from legacy_deep_researcher_agent.task_tool import _create_task_tool
from legacy_deep_researcher_agent.todo_tools import read_todos, write_todos


def _build_instruction_block(date_str: str, max_concurrent: int, max_iterations: int) -> str:
    """Compose the system prompt used by the coordinator agent."""
    subagent_instructions = SUBAGENT_USAGE_INSTRUCTIONS.format(
        max_concurrent_research_units=max_concurrent,
        max_researcher_iterations=max_iterations,
        date=date_str,
    )

    return (
        "# TODO MANAGEMENT\n" + TODO_USAGE_INSTRUCTIONS + "\n\n"
        + "=" * 80
        + "\n\n# FILE SYSTEM USAGE\n" + FILE_USAGE_INSTRUCTIONS + "\n\n"
        + "=" * 80
        + "\n\n# SUB-AGENT DELEGATION\n" + subagent_instructions
    )


def _build_research_subagent() -> dict[str, str | Sequence[str]]:
    """Create configuration for the dedicated research sub-agent."""
    return {
        "name": "research-agent",
        "description": (
            "Delegate research to the sub-agent researcher. Only give this researcher one "
            "topic at a time."
        ),
        "prompt": RESEARCHER_INSTRUCTIONS.format(date=get_today_str()),
        "tools": ["tavily_search", "think_tool"],
    }


def build_deep_research_agent(
    *,
    model: str | None = None,
    temperature: float | None = None,
    max_concurrent_research_units: int | None = None,
    max_researcher_iterations: int | None = None,
    api_key: str | None = None,
    configuration: Configuration | None = None,
):
    """Create the compiled LangGraph agent used for deep research workflows."""
    overrides = {
        "model": model,
        "temperature": temperature,
        "max_concurrent_research_units": max_concurrent_research_units,
        "max_researcher_iterations": max_researcher_iterations,
        "api_key": api_key,
    }
    overrides = {key: value for key, value in overrides.items() if value is not None}

    resolved_config = (
        configuration.model_copy(update=overrides)
        if configuration is not None
        else Configuration.from_runnable_config(overrides=overrides)
    )

    chat_model_kwargs = {
        "model": resolved_config.model,
        "temperature": resolved_config.temperature,
        "configurable_fields": ("model", "temperature", "api_key"),
    }
    if resolved_config.api_key:
        chat_model_kwargs["api_key"] = resolved_config.api_key

    chat_model = init_chat_model(**chat_model_kwargs)

    sub_agent_tools = [tavily_search, think_tool]
    core_tools = [ls, read_file, write_file, write_todos, read_todos]

    research_sub_agent = _build_research_subagent()

    task_tool = _create_task_tool(
        sub_agent_tools,
        [research_sub_agent],
        chat_model,
        DeepAgentState,
    )

    all_tools = [*core_tools, think_tool, task_tool, tavily_search]

    prompt = _build_instruction_block(
        date_str=get_today_str(),
        max_concurrent=resolved_config.max_concurrent_research_units,
        max_iterations=resolved_config.max_researcher_iterations,
    )

    agent = create_react_agent(
        chat_model,
        all_tools,
        prompt=prompt,
        state_schema=DeepAgentState,
        name="Deep Research Agent",
    )

    agent.config_schema = Configuration

    return agent


graph = build_deep_research_agent()
"""Default compiled graph exposed for LangGraph runtime usage."""

__all__ = ["build_deep_research_agent", "graph"]
