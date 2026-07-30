"""
backend/features/audit_notebooks.py

Scans training notebooks for targets derived from a column that stays in the
feature set:

    df["engaged"] = (df["avg_watch_time_per_day"] >= median).astype(int)
    X = df.drop(columns=["engaged"])        # source column still in X

The model then reproduces a threshold on its own input and reports a
near-perfect score having learned nothing.

An earlier version of this script found 1 of 3 cases. It only matched
dataframes literally named `df` or `data`, and only recognised a target
declared as `TARGET_COL`. It missed `engagement[...]` (different variable)
and `LABEL_COL` (different constant name). A linter that catches a third of
the cases is worse than none, because silence reads as clean.

Run from repo root:  python backend/features/audit_notebooks.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

NOTEBOOKS = Path("notebooks")

# Any identifier assigned a string literal:  LABEL_COL = "clicked"
CONSTANT = re.compile(r"""^\s*(\w+)\s*=\s*["']([^"']+)["']\s*$""", re.MULTILINE)

# Any dataframe:  anything["new"] = (anything["source"] ...
DERIVED = re.compile(
    r"""(?P<frame>\w+)\s*\[\s*["'](?P<target>\w+)["']\s*\]\s*=\s*\(?\s*"""
    r"""(?P<srcframe>\w+)\s*\[\s*["'](?P<source>\w+)["']\s*\]""",
)

# y = anything[ "col" ]  or  y = anything[ LABEL_COL ]
Y_ASSIGN = re.compile(r"""\by\s*=\s*\w+\s*\[\s*(?:["'](\w+)["']|(\w+))\s*\]""")

# .drop(columns=[ ... ])
DROP = re.compile(r"""drop\s*\(\s*columns\s*=\s*\[(?P<items>[^\]]*)\]""")


def notebook_source(path: Path) -> str:
    try:
        nb = json.loads(path.read_text())
    except Exception:
        return ""
    return "\n".join(
        "".join(cell.get("source", []))
        for cell in nb.get("cells", [])
        if cell.get("cell_type") == "code"
    )


def analyse(code: str) -> list[tuple[str, str]]:
    """Return (target, source) pairs where source survives into the features."""
    constants = dict(CONSTANT.findall(code))

    # Which column ends up as y? Either a literal or a constant reference.
    targets: set[str] = set()
    for literal, reference in Y_ASSIGN.findall(code):
        if literal:
            targets.add(literal)
        elif reference in constants:
            targets.add(constants[reference])

    # Columns removed from the feature frame, resolving constant references.
    dropped: set[str] = set()
    for match in DROP.finditer(code):
        for item in match.group("items").split(","):
            item = item.strip()
            if not item:
                continue
            quoted = re.fullmatch(r"""["'](\w+)["']""", item)
            if quoted:
                dropped.add(quoted.group(1))
            elif item in constants:
                dropped.add(constants[item])

    findings = []
    for match in DERIVED.finditer(code):
        target = match.group("target")
        source = match.group("source")
        if target == source:
            continue  # in-place transform, not a derived label
        if target in targets and source not in dropped:
            findings.append((target, source))

    return findings


def main() -> int:
    if not NOTEBOOKS.is_dir():
        print(f"No {NOTEBOOKS} directory")
        return 1

    flagged, clean, unreadable = [], [], []

    for path in sorted(NOTEBOOKS.glob("*.ipynb")):
        code = notebook_source(path)
        if not code:
            unreadable.append(path.name)
            continue

        findings = analyse(code)
        (flagged if findings else clean).append(
            (path.name, findings) if findings else path.name
        )

    print("=" * 72)
    print(f"TARGET DERIVED FROM A SURVIVING FEATURE  ({len(flagged)})")
    print("=" * 72)
    for name, findings in flagged:
        print(f"\n  {name}")
        for target, source in findings:
            print(f"    '{target}' = threshold on '{source}', which stays in X")

    print("\n" + "=" * 72)
    print(f"NOT FLAGGED  ({len(clean)})")
    print("=" * 72)
    for name in clean:
        print(f"  {name}")

    if unreadable:
        print(f"\nUnreadable: {', '.join(unreadable)}")

    print(
        "\nScope: catches single-column thresholded targets only. Will not catch\n"
        "multi-column derivations, joins that bring the outcome in, temporal\n"
        "leakage, or degenerate tasks. 'Not flagged' is not 'verified clean'."
    )
    return 2 if flagged else 0


if __name__ == "__main__":
    raise SystemExit(main())