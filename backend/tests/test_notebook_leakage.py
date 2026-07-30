"""
backend/tests/test_notebook_leakage.py

Fails if a training notebook derives its target from a column it keeps as a
feature. Three notebooks did this before the audit; archiving them is only
durable if new ones can't reintroduce the pattern.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from features.audit_notebooks import analyse, notebook_source  # noqa: E402

NOTEBOOKS = REPO_ROOT / "notebooks"

# Archived notebooks are kept deliberately as documented findings.
ARCHIVE = "_archive"


def active_notebooks() -> list[Path]:
    return [p for p in sorted(NOTEBOOKS.glob("*.ipynb")) if ARCHIVE not in p.parts]


@pytest.mark.skipif(not NOTEBOOKS.is_dir(), reason="no notebooks directory")
@pytest.mark.parametrize(
    "path", active_notebooks(), ids=lambda p: p.name
)
def test_target_not_derived_from_surviving_feature(path: Path):
    code = notebook_source(path)
    if not code:
        pytest.skip(f"{path.name} has no readable code cells")

    findings = analyse(code)
    if findings:
        detail = "; ".join(
            f"'{target}' is a threshold on '{source}', which stays in X"
            for target, source in findings
        )
        pytest.fail(f"{path.name}: {detail}")


@pytest.mark.skipif(not NOTEBOOKS.is_dir(), reason="no notebooks directory")
def test_archived_notebooks_still_demonstrate_the_pattern():
    """The archive exists as evidence. If these stop tripping the auditor,
    either the files changed or the auditor regressed -- both worth knowing."""
    archive = NOTEBOOKS / ARCHIVE
    if not archive.is_dir():
        pytest.skip("no archive directory")

    known_leaky = {
        "train_ctr_model_netflix.ipynb",
        "train_engagement_model.ipynb",
        "train_engagement_model_netflix.ipynb",
    }

    still_flagged = {
        path.name
        for path in archive.glob("*.ipynb")
        if path.name in known_leaky and analyse(notebook_source(path))
    }

    missing = known_leaky - still_flagged
    assert not missing, (
        f"Auditor no longer flags {sorted(missing)}. Either the notebooks were "
        f"edited or the detection regressed."
    )