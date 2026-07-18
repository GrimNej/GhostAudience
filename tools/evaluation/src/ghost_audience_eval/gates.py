from __future__ import annotations

from dataclasses import dataclass

from .metrics import EvaluationMetrics


@dataclass(frozen=True)
class GateResult:
    passed: bool
    failures: tuple[str, ...]


def evaluate_gates(
    metrics: EvaluationMetrics,
) -> GateResult:
    failures: list[str] = []

    if metrics.future_leak_count != 0:
        failures.append("Future leak count must be zero.")

    if metrics.invalid_evidence_count != 0:
        failures.append("Invalid evidence count must be zero.")

    if metrics.invalid_transition_count != 0:
        failures.append("Invalid transition count must be zero.")

    if metrics.must_open_recall < 0.80:
        failures.append("Must-open recall must be at least 0.80.")

    if metrics.forbidden_precision < 0.85:
        failures.append("Forbidden-question precision must be at least 0.85.")

    return GateResult(
        passed=not failures,
        failures=tuple(failures),
    )
