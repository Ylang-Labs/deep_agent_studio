"""Runtime configuration for the deep researcher agent graph."""

from __future__ import annotations

import os
from typing import Any, ClassVar, Mapping, Optional

from pydantic import BaseModel, Field


class Configuration(BaseModel):
    """Pydantic model describing configurable graph parameters."""

    model: str = Field(
        default="anthropic:claude-3-5-sonnet-20240620",
        description="Language model used for both the coordinator and sub-agents.",
    )
    temperature: float = Field(
        default=0.0,
        description="Sampling temperature applied to the language model.",
    )
    max_concurrent_research_units: int = Field(
        default=3,
        description="Maximum number of concurrent research tasks delegated to sub-agents.",
        ge=1,
    )
    max_researcher_iterations: int = Field(
        default=3,
        description="Maximum number of iterations allowed for the researcher sub-agent.",
        ge=1,
    )
    summarization_model: str = Field(
        default="openai:gpt-4o-mini",
        description="Language model used for webpage summarization within Tavily results.",
    )
    api_key: str | None = Field(
        default=None,
        description=(
            "API key forwarded to LangChain when instantiating chat models. "
            "Defaults to LANGCHAIN_API_KEY or LANGSMITH_API_KEY if unset."
        ),
    )

    _ENV_PREFIX: ClassVar[str] = "DEEP_RESEARCHER_"
    _ENV_SUFFIXES: ClassVar[dict[str, str]] = {
        "model": "MODEL",
        "temperature": "TEMPERATURE",
        "max_concurrent_research_units": "MAX_CONCURRENT_UNITS",
        "max_researcher_iterations": "MAX_ITERATIONS",
        "summarization_model": "SUMMARIZATION_MODEL",
        "api_key": "API_KEY",
    }

    @classmethod
    def _get_env_override(cls, field_name: str) -> Any | None:
        """Return an environment override for the provided field name."""
        candidates = []
        if suffix := cls._ENV_SUFFIXES.get(field_name):
            candidates.append(f"{cls._ENV_PREFIX}{suffix}")
        candidates.append(field_name.upper())

        for key in candidates:
            if key in os.environ:
                return os.environ[key]
        if field_name == "api_key":
            for key in ("LANGCHAIN_API_KEY", "LANGSMITH_API_KEY"):
                if key in os.environ:
                    return os.environ[key]
        return None

    @classmethod
    def from_runnable_config(
        cls,
        config: Optional[Mapping[str, Any]] = None,
        overrides: Optional[Mapping[str, Any]] = None,
    ) -> "Configuration":
        """Construct configuration from a LangGraph runnable config and overrides."""
        configurable: Mapping[str, Any] = {}
        if config is not None and hasattr(config, "get"):
            maybe_configurable = config.get("configurable", {})  # type: ignore[arg-type]
            if isinstance(maybe_configurable, Mapping):
                configurable = maybe_configurable
            elif isinstance(config, Mapping):
                configurable = config
        elif isinstance(config, Mapping):
            configurable = config

        overrides = overrides or {}
        values: dict[str, Any] = {}

        for field_name in cls.model_fields:
            if field_name in overrides and overrides[field_name] is not None:
                values[field_name] = overrides[field_name]
                continue

            if field_name in configurable and configurable[field_name] is not None:
                values[field_name] = configurable[field_name]
                continue

            env_value = cls._get_env_override(field_name)
            if env_value is not None:
                values[field_name] = env_value

        return cls(**values)


__all__ = ["Configuration"]
