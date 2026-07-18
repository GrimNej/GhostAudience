from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from ghost_audience_eval.cli import app

runner = CliRunner()


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def fixture_payload() -> dict[str, object]:
    return {
        "fixture_id": "fixture-demo",
        "license": "CC0",
        "source_path": "fixtures/demo.md",
        "expected_questions": [
            {
                "semantic_key": "mira-identity",
                "kind": "identity",
                "earliest_segment": 0,
                "latest_segment": 1,
                "resolve_at": 2,
            }
        ],
        "forbidden_questions": [{"semantic_key": "future-spoiler"}],
    }


def run_payload(fixture_id: str = "fixture-demo") -> dict[str, object]:
    return {
        "fixture_id": fixture_id,
        "model_id": "fixture-v1",
        "prompt_version": "fixture-v1",
        "future_leak_count": 0,
        "invalid_evidence_count": 0,
        "invalid_transition_count": 0,
        "observed_questions": [
            {
                "semantic_key": "mira-identity",
                "kind": "identity",
                "opened_at": 0,
                "resolved_at": 2,
            }
        ],
        "median_step_latency_ms": 12.5,
    }


def test_score_reports_a_passing_run(tmp_path: Path) -> None:
    fixture_path = tmp_path / "fixture.json"
    run_path = tmp_path / "run.json"
    write_json(fixture_path, fixture_payload())
    write_json(run_path, run_payload())

    result = runner.invoke(
        app,
        [
            "--fixture-path",
            str(fixture_path),
            "--run-path",
            str(run_path),
        ],
    )

    assert result.exit_code == 0
    assert "Must-open recall" in result.output
    assert "PASS" in result.output


def test_score_rejects_mismatched_fixture_ids(tmp_path: Path) -> None:
    fixture_path = tmp_path / "fixture.json"
    run_path = tmp_path / "run.json"
    write_json(fixture_path, fixture_payload())
    write_json(run_path, run_payload("another-fixture"))

    result = runner.invoke(
        app,
        [
            "--fixture-path",
            str(fixture_path),
            "--run-path",
            str(run_path),
        ],
    )

    assert result.exit_code == 2
    assert "Fixture IDs do not match" in result.output
