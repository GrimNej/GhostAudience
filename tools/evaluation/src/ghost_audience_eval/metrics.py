from __future__ import annotations

from dataclasses import dataclass

from .models import EvaluationRun, GoldenFixture


@dataclass(frozen=True)
class EvaluationMetrics:
    must_open_recall: float
    forbidden_precision: float
    resolution_timing_accuracy: float
    future_leak_count: int
    invalid_evidence_count: int
    invalid_transition_count: int


def _in_expected_window(
    observed_ordinal: int,
    earliest: int,
    latest: int,
) -> bool:
    return earliest <= observed_ordinal <= latest


def calculate_metrics(
    fixture: GoldenFixture,
    run: EvaluationRun,
) -> EvaluationMetrics:
    observed_by_key = {
        question.semantic_key: question for question in run.observed_questions
    }

    expected_hits = sum(
        1
        for expected in fixture.expected_questions
        if (observed := observed_by_key.get(expected.semantic_key)) is not None
        and _in_expected_window(
            observed.opened_at,
            expected.earliest_segment,
            expected.latest_segment,
        )
    )

    expected_count = len(fixture.expected_questions)
    must_open_recall = expected_hits / expected_count if expected_count > 0 else 1.0

    forbidden_keys = {item.semantic_key for item in fixture.forbidden_questions}
    forbidden_hits = sum(1 for key in forbidden_keys if key in observed_by_key)
    forbidden_precision = (
        1.0 if not forbidden_keys else 1.0 - forbidden_hits / len(forbidden_keys)
    )

    expected_resolutions = [
        expected
        for expected in fixture.expected_questions
        if expected.resolve_at is not None
    ]
    correct_resolutions = sum(
        1
        for expected in expected_resolutions
        if (observed := observed_by_key.get(expected.semantic_key)) is not None
        and observed.resolved_at == expected.resolve_at
    )
    resolution_timing_accuracy = (
        correct_resolutions / len(expected_resolutions) if expected_resolutions else 1.0
    )

    return EvaluationMetrics(
        must_open_recall=must_open_recall,
        forbidden_precision=forbidden_precision,
        resolution_timing_accuracy=(resolution_timing_accuracy),
        future_leak_count=(run.future_leak_count),
        invalid_evidence_count=(run.invalid_evidence_count),
        invalid_transition_count=(run.invalid_transition_count),
    )
