# 🧠 InferStream ML Pipeline Map
> Globally Dominant | Industry-Standard | Netflix-Scale | Modern ML Platform

---

## 🔢 Model 1: Churn Predictor (Subscription Risk)

- **Datasets**:
  - `netflix_customer_churn.csv`
  - `WA_Fn-UseC_-Telco-Customer-Churn.csv`

- **Notebooks**:
  - `notebooks/train_xgboost_model.ipynb`
  - `notebooks/train_sklearn_model.ipynb`

- **Models**:
  - `backend/models/xgb_model.json`
  - `backend/models/sklearn_model.pkl`

- **Purpose**:
  - Predict likelihood of user churn
  - Power retention strategies
  - Analyze fairness and SHAP explanations

- **Endpoints**:
  - `POST /predict/xgboost`
  - `POST /predict/sklearn`
  - `GET /predict/fairness` (SHAP/fairness audit)

---

## 🎬 Model 2: Recommendation Engine

- **Datasets**:
  - `ratings.csv`
  - `movies.csv`
  - `tags.csv`

- **Notebook**:
  - `notebooks/train_recommendation_model.ipynb`

- **Model**:
  - `backend/models/svd_model.pkl`

- **Purpose**:
  - Personalized movie recommendations
  - User and item embeddings
  - Content enrichment via genre and tag vectors

- **Endpoints**:
  - `POST /predict/rec`
  - `GET /embeddings/user/{user_id}`

---

## 📈 Model 3: Engagement Forecaster

- **Dataset**:
  - `ratings.csv` (converted to engagement features)

- **Notebook**:
  - `notebooks/train_engagement_model.ipynb`

- **Model**:
  - `backend/models/engagement_model.pkl`

- **Purpose**:
  - Predict if a user will become a heavy viewer
  - Power binge-watch detection, session forecasting

- **Endpoints**:
  - `POST /predict/engagement`
  - `GET /metrics/engagement`

---

## 📊 Model 4: Ad Click-Through Rate (CTR) Predictor

- **Dataset**:
  - `avazu-ctr.csv` (full 40M+ rows)

- **Notebook**:
  - `notebooks/train_ctr_model.ipynb`

- **Model**:
  - `backend/models/ctr_model.pkl`

- **Purpose**:
  - Predict likelihood of ad clicks
  - Power Netflix’s ad-tier optimization
  - SHAP and fairness audit support

- **Endpoints**:
  - `POST /predict/ctr`
  - `GET /predict/fairness`

---

## 🔗 Shared Infrastructure

- **Feature Store**:
  - `backend/models/feature_store.py`
  - Enables fast lookups and reusability of shared features like:
    - `plan_type`, `tenure`, `avg_rating`, `device_type`

- **Labeling Logic**:
  - `backend/routers/labels.py`
  - Unified label generation: `churn`, `engagement`, `click`, etc.

- **Explainability & Fairness**:
  - `backend/routers/predict.py` (SHAP logic)
  - `backend/routers/metrics.py` (performance audit)

- **Embeddings & Inference**:
  - `backend/routers/embeddings.py`
  - `backend/routers/inference.py`

- **Live Inference Logs**:
  - `backend/logs/inference_logs.jsonl`

---

## 🖥️ Frontend Dashboard (React + Tailwind)

- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/components/PredictionResult.jsx`
- `frontend/src/components/ShapChart.jsx`
- `frontend/src/components/MetricsPanel.jsx`
- `frontend/src/components/InferenceLog.jsx`

---

## 🐳 Deployment

- **Backend**: FastAPI + Uvicorn → Port `8007`
- **Frontend**: Vite + React → Port `3007`
- **Compose File**: `docker-compose.yml`

---

## 🏁 Next Steps

- [ ] Wire all `/predict` endpoints to dashboard toggles
- [ ] Add SHAP explainability and radar charts
- [ ] Export predictions + logs to PDF/CSV
- [ ] Integrate CI/CD hooks + test coverage
- [ ] Add LLM-powered Copilot for AI diagnostics

---

> Built to scale like Netflix. Designed to crush the competition. Powered by real-world data.

