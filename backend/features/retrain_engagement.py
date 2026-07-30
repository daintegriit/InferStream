"""
backend/features/retrain_engagement.py

Rebuilds engagement_pipeline_xgb.pkl without `churned`.

The existing artifact declares `churned` as an input, which is the churn
outcome -- not knowable at serving time for a live subscriber. This refits
the same pipeline shape on the remaining columns.

Run from repo root:  python backend/features/retrain_engagement.py
"""

from __future__ import annotations

import glob
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

MODEL_DIR = Path("backend/models/netflix")
EXISTING = MODEL_DIR / "engagement_pipeline_xgb.pkl"
OUT = MODEL_DIR / "engagement_pipeline_xgb.pkl"
BACKUP = Path("backend/artifacts/_archive/engagement_pipeline_xgb.with_churned.pkl")

LEAKY = {"churned"}


def main() -> int:
    if not EXISTING.exists():
        print(f"Missing {EXISTING}")
        return 1

    old = joblib.load(EXISTING)
    old_features = list(old.feature_names_in_)
    print(f"Current contract: {len(old_features)} features")
    print(f"Removing: {sorted(LEAKY & set(old_features))}\n")

    csv_paths = glob.glob("**/netflix_customer_churn.csv", recursive=True)
    if not csv_paths:
        print("Could not find netflix_customer_churn.csv")
        return 1
    df = pd.read_csv(csv_paths[0])
    print(f"Loaded {csv_paths[0]}: {len(df):,} rows, {len(df.columns)} columns")

    # The target is whatever the CSV has that the model never took as input.
    leftover = [c for c in df.columns if c not in old_features]
    print(f"Columns not in the old contract: {leftover}")

    candidates = [c for c in leftover if c not in LEAKY]
    if len(candidates) != 1:
        print(
            f"\nCannot identify the target automatically. Candidates: {candidates}\n"
            f"Set TARGET manually in this script and rerun."
        )
        return 2

    target = candidates[0]
    feature_names = [c for c in old_features if c not in LEAKY]
    print(f"Target: {target}")
    print(f"New contract: {len(feature_names)} features\n")

    X = df[feature_names]
    y = df[target]

    numeric = X.select_dtypes(include=["number"]).columns.tolist()
    categorical = X.select_dtypes(include=["object", "category"]).columns.tolist()

    pipeline = Pipeline(
        [
            (
                "preprocessor",
                ColumnTransformer(
                    [
                        ("num", StandardScaler(), numeric),
                        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
                    ]
                ),
            ),
            (
                "model",
                XGBClassifier(
                    n_estimators=400,
                    max_depth=6,
                    learning_rate=0.05,
                    colsample_bytree=0.8,
                    eval_metric="logloss",
                    n_jobs=-1,
                ),
            ),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y if y.nunique() < 20 else None
    )

    pipeline.fit(X_train, y_train)

    train_auc = roc_auc_score(y_train, pipeline.predict_proba(X_train)[:, 1])
    test_auc = roc_auc_score(y_test, pipeline.predict_proba(X_test)[:, 1])

    print(f"train AUC: {train_auc:.4f}")
    print(f"test  AUC: {test_auc:.4f}")

    if test_auc > 0.99:
        print("\nNote: test AUC above 0.99 usually means the label is a near-deterministic")
        print("function of the features. Check for remaining leakage before trusting it.")

    # Keep the old artifact rather than overwriting it away.
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if not BACKUP.exists():
        joblib.dump(old, BACKUP)
        print(f"\nArchived previous artifact to {BACKUP}")

    joblib.dump(pipeline, OUT)
    print(f"Wrote {OUT}")
    print(f"  contract: {list(pipeline.feature_names_in_)}")

    importances = pd.Series(
        pipeline.named_steps["model"].feature_importances_,
        index=pipeline.named_steps["preprocessor"].get_feature_names_out(),
    ).sort_values(ascending=False)
    print("\ntop importances:")
    print(importances.head(6).to_string())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())