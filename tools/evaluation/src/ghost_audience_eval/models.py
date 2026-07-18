from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class QuestionKind(StrEnum):
    IDENTITY = "identity"
    MOTIVATION = "motivation"
    CAUSALITY = "causality"
    TIMELINE = "timeline"
    REFERENCE = "reference"
    WORLD_RULE = "world_rule"
    KNOWLEDGE_GAP = "knowledge_gap"
    EMOTIONAL_REACTION = "emotional_reaction"
    PROMISE_PAYOFF = "promise_payoff"
    POSSIBLE_CONTRADICTION = "possible_contradiction"
    STAKES = "stakes"
    SPATIAL_RELATION = "spatial_relation"
    OTHER = "other"


class ExpectedQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str = Field(min_length=3)
    kind: QuestionKind
    earliest_segment: int = Field(ge=0)
    latest_segment: int = Field(ge=0)
    resolve_at: int | None = Field(
        default=None,
        ge=0,
    )


class ForbiddenQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str = Field(min_length=3)


class GoldenFixture(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fixture_id: str = Field(min_length=3)
    license: str = Field(min_length=2)
    source_path: str = Field(min_length=1)
    expected_questions: tuple[
        ExpectedQuestion,
        ...,
    ]
    forbidden_questions: tuple[
        ForbiddenQuestion,
        ...,
    ]
    intended_unresolved: tuple[str, ...] = ()


class ObservedQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semantic_key: str
    kind: QuestionKind
    opened_at: int
    resolved_at: int | None


class EvaluationRun(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fixture_id: str
    model_id: str
    prompt_version: str
    future_leak_count: int = Field(ge=0)
    invalid_evidence_count: int = Field(ge=0)
    invalid_transition_count: int = Field(ge=0)
    observed_questions: tuple[
        ObservedQuestion,
        ...,
    ]
    median_step_latency_ms: float = Field(ge=0)
