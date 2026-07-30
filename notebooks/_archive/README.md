## Model honesty

Fourteen training notebooks were audited. Three shared a defect, and the
pattern is worth naming because it produces flawless-looking results:

```python
df["clicked"] = (df["avg_watch_time_per_day"] >= threshold).astype(int)
y = df["clicked"]
X = df.drop(columns=["customer_id", "churned", "clicked"])   # source stays
```

The label is a threshold on a column that remains in the feature set, so the
model reproduces a lookup table. `train_ctr_model_netflix.ipynb` reported
1.0000 precision and recall with a confusion matrix of `[[747 0] [0 253]]` —
not one error in a thousand test rows. Both engagement notebooks did the same
thing with a median split. In one, the comment `# Drop identifiers / leakage`
sits directly above a loop that removes `customer_id` while the actual leak is
two lines higher.

All three are archived under `notebooks/_archive/` with the finding recorded,
rather than deleted.

`backend/features/audit_notebooks.py` scans for the pattern. Its first version
caught one case of three — it only matched dataframes named `df` and targets
declared as `TARGET_COL`, so it missed a differently-named frame and a
differently-named constant. It's noted here because a linter that catches a
third of the cases is more dangerous than none: silence reads as clean.

### Which scores to believe

| Notebook | Dataset | Test accuracy |
|---|---|---|
| `train_xgboost_model.ipynb` | Telco (7,043 real rows) | 0.7825 |
| `train_pytorch_model.ipynb` | Telco | 0.7918 |
| `train_keras_model.ipynb` | Telco | 0.8003 |
| `train_sklearn_model_netflix.ipynb` | Netflix (5,000 synthetic) | 0.8870 |
| `train_xgboost_model_netflix.ipynb` | Netflix (synthetic) | 0.9950 |

The Telco numbers are the trustworthy ones: real churn labels, three
frameworks converging on 0.78–0.80, which is where published benchmarks for
that dataset sit. The Netflix numbers come from a generator whose label is a
near-deterministic function of a few behavioural columns — the method is
identical, only the data differs.

The served churn model is the 0.9950 one, kept as a serving fixture. Its
score measures the data generator, not the model.