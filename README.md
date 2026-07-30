# ⚡ InferStream

**A feature platform with verified point-in-time correctness.**

InferStream computes windowed ML features from an event log, serves them by entity key at sub-millisecond latency, and — the part that matters — proves that the batch path used for training and the streaming path used for serving produce identical values.

![Python](https://img.shields.io/badge/python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688)
![React](https://img.shields.io/badge/React-frontend-61DAFB)
![parity](https://img.shields.io/badge/point--in--time%20parity-1000%2F1000-brightgreen)

---

## The problem this solves

Feature platforms exist because two things go wrong when features are computed ad hoc:

**Point-in-time leakage.** A training row for an event at time *t* must use only what was knowable before *t*. Include the event itself and your offline metrics look excellent while the production model underperforms.

**Offline/online skew.** When the batch job that builds training data and the service that computes features at inference are two separate codebases, they drift. Silently. The model sees different arithmetic in production than it learned from.

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

Not 1,000. Nearly seven times that, because MovieLens users rate in bursts: a session submits many ratings at an identical timestamp, so an inclusive bound pulls in the whole simultaneous batch rather than a single event. Tie handling is the dominant term, not an edge case.

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

```bash
GET /features/user_rating_count_7d/entity/141567
{
  "value": 1565,
  "as_of": 1697164147,
  "staleness_seconds": 352117,
  "lookup_ms": 0.0708
}
```

Freshness is **measured** (`as_of - last_event_ts`), not declared as a constant. Cold-start entities return 404 rather than 0, keeping "no data" distinct from "no activity."

---

## Architecture

```
Event log (MovieLens 32M, 2022-2023 slice: 1.7M ratings, 14.3k users)
        │
        ├── backfill()   binary search, as-of joins      → training sets
        └── stream()     sliding windows, replay order   → online store
                    │
                    └── asserted equal at 1,000 sampled points
                              │
                    online store (parquet, 14.3k keys)
                              │
                    GET /features/{name}/entity/{id}
```

Inference is served separately from self-contained sklearn `Pipeline` artifacts. The API reads its entire feature contract — required columns, their order, numeric/categorical split, and legal category values — off the fitted `ColumnTransformer` at load time. Nothing about features is hardcoded in the serving layer, so a retrain that adds a column updates the API contract, the validation rules, and the dashboard form automatically.

Bare estimators are **rejected at startup**. A model plus loose `scaler.pkl` / `encoder.pkl` files is the arrangement that lets training and serving drift apart; only pipelines carrying their own preprocessing are accepted.

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
| `GET /status/meta` | Build id, git sha, environment |
| `GET /docs` | OpenAPI |

Additional routers: `/drift`, `/embeddings`, `/labels`, `/metrics`, `/logs`, `/validate`, `/compare`.

### Counterfactual example

Holding all other features fixed and sweeping `payment_method`:

```
Credit Card  0.808    Debit Card  0.909    Gift Card  0.994
PayPal       0.891    Crypto      0.991    spread:    0.186
```

An 18.6-point swing from payment method alone. On real data this is the kind of proxy variable — payment method correlating with income and creditworthiness — that a retention model should not be leaning on unreviewed. Here it reflects the synthetic generator (see Limitations), but surfacing it in one API call is the point.

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
│   ├── services/
│   ├── state/
│   ├── artifacts/
│   │   ├── feature_store/*.parquet      # materialised features
│   │   └── _archive/                    # superseded artifacts
│   ├── models/netflix/*.pkl             # sklearn Pipelines (gitignored)
│   └── tests/
├── frontend/                            # React + Vite + Tailwind
├── notebooks/                           # training notebooks
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
print(f"{len(df):,} rows, {df.userId.nunique():,} users")
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

`http://localhost:8007` · docs at `/docs`

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
MODEL_DIR=                                        # defaults to backend/models/netflix
FEATURE_STORE_DIR=                                # defaults to backend/artifacts/feature_store
CORS_ORIGINS=http://localhost:5177,http://localhost:3007
```

`frontend/.env`:

```bash
VITE_API_URL=http://localhost:8007
```

Note that `VITE_`-prefixed variables are compiled into the client bundle and visible to every visitor — never put secrets there.

---

## Limitations

Stated plainly, because a portfolio project that overclaims is worse than a small one that doesn't.

**The churn model is a fixture, not a result.** It's trained on a synthetic 5,000-row Kaggle dataset whose label is a near-deterministic function of a few behavioural columns. Held-out AUC is 0.9997 — that measures the data generator, not the model. Five of its twelve features (`age`, `gender`, `region`, `device`, `favorite_genre`) sit within ±0.02 of the base rate and carry no signal. The model exists so the serving path has something real to exercise.

**"Streaming" means replay semantics, not a broker.** The consumer processes events in timestamp order with no lookahead and per-entity state — the same shape a Kafka consumer has — but reads from a file. Swapping in a broker changes the transport, not the correctness argument.

**One feature.** `user_rating_count_7d`. The harness generalises; the catalog doesn't exist yet.

**The online store is a snapshot, not a live store.** Materialised at a single as-of instant and served from memory. No Redis, no incremental updates.

**Top entity is probably a bot.** User 141567 logged 1,565 ratings in seven days — over 9/hour sustained. Left in deliberately and flagged rather than silently clipped.

---

## Roadmap

| Status | Goal |
|---|---|
| ✅ | Point-in-time correct batch backfill |
| ✅ | Streaming consumer with verified parity |
| ✅ | Online store, entity-key serving, measured freshness |
| ✅ | Serving contract derived from model artifacts |
| ✅ | Counterfactual fairness sweeps |
| 🛠️ | Parity harness as a pytest CI gate |
| 🛠️ | Second feature (`user_avg_rating_7d`) to prove the abstraction |
| 🛠️ | Dashboard rendered from `/predict/schema` |
| 📋 | Kafka transport replacing file replay |
| 📋 | Redis online store with incremental updates |
| 📋 | Training-set builder: entity/timestamp pairs → point-in-time correct matrix |
| 📋 | Feature lineage and drift monitoring |

---

## Docker

```bash
docker-compose up --build
```

---

## License

MIT — see [LICENSE](LICENSE).

## Author

Built by **Darryl Carpenter**. Issues and PRs welcome.