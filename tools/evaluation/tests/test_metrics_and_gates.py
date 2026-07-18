from __future__ import annotations

import pytest

from ghost_audience_eval.gates import evaluate_gates
from ghost_audience_eval.metrics import EvaluationMetrics, calculate_metrics
from ghost_audience_eval.models import (
    EvaluationRun,
    ExpectedQuestion,
    ForbiddenQuestion,
    GoldenFixture,
    ObservedQuestion,
    QuestionKind,
)


def make_fixture(
    *,
    expected_questions: tuple[ExpectedQuestion, ...],
    forbidden_questions: tuple[ForbiddenQuestion, ...],
) -> GoldenFixture:
    return GoldenFixture(
        fixture_id="fixture-demo",
        license="CC0",
        source_path="fixtures/demo.md",
        expected_questions=expected_questions,
        forbidden_questions=forbidden_questions,
    )


def make_run(
    *,
    observed_questions: tuple[ObservedQuestion, ...],
    future_leak_count: int = 0,
    invalid_evidence_count: int = 0,
    invalid_transition_count: int = 0,
) -> EvaluationRun:
    return EvaluationRun(
        fixture_id="fixture-demo",
        model_id="fixture-v1",
        prompt_version="fixture-v1",
        future_leak_count=future_leak_count,
        invalid_evidence_count=invalid_evidence_count,
        invalid_transition_count=invalid_transition_count,
        observed_questions=observed_questions,
        median_step_latency_ms=12.5,
    )


def test_calculate_metrics_tracks_windows_resolutions_and_forbidden_keys() -> None:
    fixture = make_fixture(
        expected_questions=(
            ExpectedQuestion(
                semantic_key="mira-identity",
                kind=QuestionKind.IDENTITY,
                earliest_segment=0,
                latest_segment=1,
                resolve_at=2,
            ),
            ExpectedQuestion(
                semantic_key="archive-location",
                kind=QuestionKind.REFERENCE,
                earliest_segment=1,
                latest_segment=2,
            ),
        ),
        forbidden_questions=(ForbiddenQuestion(semantic_key="future-spoiler"),),
    )
    run = make_run(
        observed_questions=(
            ObservedQuestion(
                semantic_key="mira-identity",
                kind=QuestionKind.IDENTITY,
                opened_at=0,
                resolved_at=2,
            ),
            ObservedQuestion(
                semantic_key="archive-location",
                kind=QuestionKind.REFERENCE,
                opened_at=3,
                resolved_at=None,
            ),
            ObservedQuestion(
                semantic_key="future-spoiler",
                kind=QuestionKind.OTHER,
                opened_at=1,
                resolved_at=None,
            ),
        ),
        future_leak_count=1,
        invalid_evidence_count=2,
        invalid_transition_count=3,
    )

    metrics = calculate_metrics(fixture, run)

    assert metrics.must_open_recall == pytest.approx(0.5)
    assert metrics.forbidden_precision == pytest.approx(0.0)
    assert metrics.resolution_timing_accuracy == pytest.approx(1.0)
    assert metrics.future_leak_count == 1
    assert metrics.invalid_evidence_count == 2
    assert metrics.invalid_transition_count == 3


def test_calculate_metrics_defaults_empty_expectations_to_perfect_scores() -> None:
    metrics = calculate_metrics(
        make_fixture(expected_questions=(), forbidden_questions=()),
        make_run(observed_questions=()),
    )

    assert metrics.must_open_recall == 1.0
    assert metrics.forbidden_precision == 1.0
    assert metrics.resolution_timing_accuracy == 1.0


def test_evaluation_gates_return_each_failure_and_a_passing_result() -> None:
    failed = evaluate_gates(
        EvaluationMetrics(
            must_open_recall=0.79,
            forbidden_precision=0.84,
            resolution_timing_accuracy=0.0,
            future_leak_count=1,
            invalid_evidence_count=1,
            invalid_transition_count=1,
        )
    )
    passing = evaluate_gates(
        EvaluationMetrics(
            must_open_recall=0.80,
            forbidden_precision=0.85,
            resolution_timing_accuracy=0.0,
            future_leak_count=0,
            invalid_evidence_count=0,
            invalid_transition_count=0,
        )
    )

    assert failed.passed is False
    assert len(failed.failures) == 5
    assert passing.passed is True
    assert passing.failures == ()
