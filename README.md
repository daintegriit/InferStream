# InferStream

**A feature platform with verified point-in-time correctness.**

InferStream computes windowed ML features from an event log, serves them by entity key at sub-millisecond latency, and — the part that matters — proves that the batch path used for training and the streaming path used for serving produce identical values.

![Python](https://img.shields.io/badge/python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688)
![React](https://img.shields.io/badge/React-frontend-61DAFB)
![parity](https://img.shields.io/badge/point--in--time%20parity-1000%2F1000-brightgreen)

---

## The problem this solves

Two things go wrong when features are computed ad hoc:

**Point-in-time leakage.** A training row for an event at time *t* must use only what was knowable before *t*. Include the event itself and offline metrics look excellent while the production model underperforms.

**Offline/online skew.** When the batch job that builds training data and the service that computes features at inference are separate codebases, they drift. Silently.

InferStream addresses both by defining a feature once and executing it through two independent implementations that are asserted equal.

---

## Verified results

### Point-in-time parity

`user_rating_count_7d` computed two ways over 1.7M MovieLens ratings, evaluated at 1,000 sampled historical `(user, timestamp)` points:

| Path | Implementation | Time |
|---|---|---|
| Batch backfill | Binary search over per-user history | 0.21s |
| Streaming replay | Per-entity sliding windows, no lookahead | 0.73s |

```
PARITY: 1,000/1,000 agree
```

### What the leak costs

The same backfill with one character changed — `side="right"` instead of `"left"`, making the upper bound inclusive — differs on **1,000 of 1,000 rows**, introducing **6,794 phantom events**.

Not 1,000. Nearly seven times that, because MovieLens users rate in bursts: a session submits many ratings at an identical timestamp, so an inclusive bound pulls in the whole simultaneous batch. Tie handling is the dominant term, not an edge case.

### Three semantics decisions

```
value(user u, time t) = |{ events by u where  t - 7d <= ts < t }|
```

1. **Upper bound strict.** The event at *t* is excluded. Including it leaks the future.
2. **Lower bound inclusive.** An event exactly 7 days old is inside the window. Flip this and the two paths disagree only on the exact boundary — the worst kind of bug, since casual testing passes.
3. **Queries sort before events on ties.** When several events share a timestamp and we query at that instant, none count.

Verified by `backend/features/point_in_time.py`.

### Online serving

```
14,301 entities | 1,054 nonzero (7.4% active in final 7 days)
median staleness: 203 days | lookup: 0.07ms
```

```json
GET /features/user_rating_count_7d/entity/141567
{ "value": 1565, "staleness_seconds": 352117, "lookup_ms": 0.0708 }
```

Freshness is **measured** (`as_of - last_event_ts`), not declared. Cold-start entities return 404 rather than 0, keeping "no data" distinct from "no activity."

---

## Architecture

```
Event log (MovieLens 32M, 2022-2023 slice: 1.7M ratings, 14.3k users)
        |
        +-- backfill()   binary search, as-of joins      -> training sets
        +-- stream()     sliding windows, replay order   -> online store
                    |
                    +-- asserted equal at 1,000 sampled points
                              |
                    online store (parquet, 14.3k keys)
                              |
                    GET /features/{name}/entity/{id}
```

Inference is served from self-contained sklearn `Pipeline` artifacts. The API reads its entire feature contract — required columns, their order, numeric/categorical split, and legal category values — off the fitted `ColumnTransformer` at load time. Nothing about features is hardcoded in the serving layer, so a retrain that adds a column updates the API contract, the validation rules, and the dashboard form automatically.

Bare estimators are **rejected at startup**. A model plus loose `scaler.pkl` / `encoder.pkl` files is the arrangement that lets training and serving drift apart.

---

## Endpoints

**Features**

| Endpoint | Description |
|---|---|
| `GET /features/` | Registry: definitions, materialisation status, live stats |
| `GET /features/{name}/entity/{id}` | Single lookup by entity key |
| `POST /features/batch` | Multi-entity lookup for training-set assembly |

**Inference**

| Endpoint | Description |
|---|---|
| `GET /predict/schema` | Feature contract read off the artifact |
| `POST /predict/` | Inference with schema-derived validation |
| `POST /predict/fairness?attribute=X` | Counterfactual sweep across one attribute |

**Ops**

| Endpoint | Description |
|---|---|
| `GET /health` | Liveness plus what actually loaded |
| `GET /status/meta` | Build id, git sha, environment, config |
| `GET /docs` | OpenAPI |

### Counterfactual sweeps report two measures

Holding all other features fixed and varying `payment_method`:

```
Credit Card  0.808    Debit Card  0.909    Gift Card  0.994
PayPal       0.891    Crypto      0.991
absolute 0.1860   relative 1.23x
```

Absolute spread is the right measure near 0.5, where a shift moves a decision. Near the probability tails it hides real effects: a 0.0045 gap on a base of 0.015 is a **1.3× swing** in predicted risk while looking negligible in absolute terms. Both are reported, and either being material is flagged.

Chart bars are scaled absolutely (0..1), not normalised to the largest value. Normalising makes a 0.0001 difference between near-zero probabilities render as a dramatic visual gap — a misleading chart on a page about disparity.

---

## Dashboard

React + Vite + Tailwind, at `localhost:5173`.

Every surface renders from the API's derived contracts rather than a hardcoded copy:

- **Inference form** builds its fields from `/predict/schema`. Field list, order, types and dropdown options all come from the fitted encoder, so an invalid category cannot be submitted.
- **Feature registry** shows measured coverage, staleness and lookup latency, with a live entity-key lookup.
- **Counterfactual sweep** works across any categorical column the model declares.
- **Model comparison** builds the union of all model contracts and flags features that only some models use.

Colour is semantic: red marks elevated probability, material disparity, or failure; green marks verified; everything else is neutral chrome. Light and dark themes swap a CSS variable set — components reference token names, never hex.

---

## Project structure

```
inferstream/
├── backend/
│   ├── main.py                          # lifespan loads models + feature store
│   ├── features/
│   │   ├── point_in_time.py             # batch vs stream parity harness
│   │   └── build_online_store.py        # materialise the online store
│   ├── routers/
│   │   ├── features.py                  # registry + entity-key serving
│   │   ├── predict.py                   # contract derived from the artifact
│   │   └── drift.py, labels.py, ...
│   ├── artifacts/
│   │   ├── feature_store/*.parquet      # materialised features
│   │   └── _archive/                    # withdrawn artifacts
│   ├── models/netflix/*.pkl             # sklearn Pipelines (gitignored)
│   └── tests/
├── frontend/src/
│   ├── components/                      # form, registry, sweep, comparison
│   └── pages/                           # dashboard, predict, features, logs
├── notebooks/
├── data/                                # datasets (gitignored)
└── docker-compose.yml
```

---

## Setup

### Data

Download [MovieLens 32M](https://grouplens.org/datasets/movielens/) to `data/ml-32m/`, then cut the working slice:

```bash
pip install pyarrow
python - <<'PY'
import pandas as pd
CUT = pd.Timestamp("2022-01-01").timestamp()
parts = [c[c.timestamp >= CUT] for c in
         pd.read_csv("data/ml-32m/ratings.csv", chunksize=2_000_000)]
df = pd.concat(parts).sort_values("timestamp").reset_index(drop=True)
df.to_parquet("data/ml-32m/ratings_recent.parquet", index=False)
PY
```

### Verify parity, then materialise

```bash
python backend/features/point_in_time.py       # expect 1000/1000
python backend/features/build_online_store.py
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8007
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment

`backend/.env`:

```bash
API_HOST=0.0.0.0
API_PORT=8007
MODEL_DIR=                                 # defaults to backend/models/netflix
FEATURE_STORE_DIR=                         # defaults to backend/artifacts/feature_store
CORS_ORIGINS=http://localhost:5173
```

`frontend/.env`:

```bash
VITE_API_URL=http://localhost:8007
```

`VITE_`-prefixed variables are compiled into the client bundle and visible to every visitor — never put secrets there.

---

## What the tooling caught

Both defects below were surfaced by the platform's own derived contracts, not by reading code. That is the argument for building this as infrastructure rather than notebooks.

**A fossilised feature list.** The serving path reconstructed a 23-column one-hot encoding by hand for a model that had been retrained on 12 raw features, and fed pre-transformed columns to a `Pipeline` expecting raw input. Every request returned 500. The 23 columns were correct for a 10-feature version of the model; two features had been added and the serving code never heard. The fix was structural — derive the contract from the artifact — not a corrected list.

**An engagement model removed rather than retrained.** The comparison panel's union view flagged that it took `churned` — the churn outcome, unknowable at serving time — as an input feature. Investigating that turned up a larger problem: its target was `avg_watch_time_per_day >= median`, computed from a column left in the feature set, so the model reproduced a threshold on its own input. The notebook's leakage guard dropped `customer_id` while the actual leak sat two lines above it. No engagement signal exists in this dataset; the target was invented to have one. The artifact is archived under `backend/artifacts/_archive/`.

---

## Limitations

Stated plainly, because a portfolio project that overclaims is worse than a small one that doesn't.

**The churn model is a fixture, not a result.** Trained on a synthetic 5,000-row Kaggle dataset whose label is a near-deterministic function of a few behavioural columns. Held-out AUC is 0.9997 — that measures the data generator, not the model. Five of its twelve features (`age`, `gender`, `region`, `device`, `favorite_genre`) sit within ±0.02 of the base rate and carry no signal. It exists so the serving path has something real to exercise.

**"Streaming" means replay semantics, not a broker.** The consumer processes events in timestamp order with no lookahead and per-entity state — the same shape a Kafka consumer has — but reads from a file. Swapping in a broker changes the transport, not the correctness argument.

**One feature.** `user_rating_count_7d`. The harness generalises; the catalog doesn't exist yet.

**The online store is a snapshot.** Materialised at a single as-of instant and served from memory. No Redis, no incremental updates.

**Top entity is probably a bot.** User 141567 logged 1,565 ratings in seven days — over 9/hour sustained. Left in deliberately and flagged rather than silently clipped.

**Several routers are stubs.** `/drift`, `/embeddings`, `/labels`, `/compare` are mounted but not wired to anything meaningful.

---

## Roadmap

| Status | Goal |
|---|---|
| Done | Point-in-time correct batch backfill |
| Done | Streaming consumer with verified parity |
| Done | Online store, entity-key serving, measured freshness |
| Done | Serving contract derived from model artifacts |
| Done | Counterfactual sweeps with absolute and relative measures |
| Done | Dashboard rendered from the API's contracts |
| In progress | Parity harness as a pytest CI gate |
| In progress | Second feature (`user_avg_rating_7d`) to prove the abstraction |
| Planned | Kafka transport replacing file replay |
| Planned | Redis online store with incremental updates |
| Planned | Training-set builder: entity/timestamp pairs to point-in-time correct matrix |
| Planned | Feature lineage and drift monitoring |

---

## License

MIT — see [LICENSE](LICENSE).

## Author

Built by **Darryl Carpenter**. Issues and PRs welcome.