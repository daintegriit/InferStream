⚡ InferStream
Real-time Feature Flow for Intelligent ML Inference

InferStream is a Netflix-style fullstack platform that simulates a real-time ML feature infrastructure. It includes a FastAPI backend for feature computation and serving, and a React + Tailwind CSS frontend for feature discovery and visualization.

Designed to showcase engineering capability for roles like Netflix's ML Infrastructure team: https://explore.jobs.netflix.net/careers/job/790300763299?microsite=netflix.com

🚀 Features
⚡ Real-time API to serve ML-ready features for training or inference

🧠 In-memory feature store (extendable to Redis, MongoDB, PostgreSQL)

📦 Modular FastAPI backend for scalable feature pipelines

🎛️ React + Tailwind frontend dashboard for exploring and inspecting features

🧪 Easy local development with Vite + Hot Reload

🐳 Docker-ready for full containerized deployment

🗂️ Project Structure
inferstream/
├── backend/ # FastAPI backend
│ ├── main.py
│ ├── routers/
│ │ ├── features.py
│ │ └── predict.py
│ └── models/
│ └── feature_store.py
├── frontend/ # React + Tailwind UI
│ ├── src/
│ │ ├── App.jsx
│ │ ├── main.jsx
│ │ ├── tailwind.css
│ │ ├── pages/
│ │ │ └── Dashboard.jsx
│ │ └── components/
│ │ └── FeatureTable.jsx
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md # ← You are here

💻 Local Development
🔧 Backend
cd backend
uvicorn main:app --reload

API is live at: http://localhost:8000

Available endpoints:

/features/ → Get all features

/predict/ → Simulated inference result

🎨 Frontend
cd frontend
npm install
npm run dev

Dashboard: http://localhost:5173

🌍 Future Work & Netflix Alignment
Roadmap Goal Netflix Role Match
✅ Real-time feature computation "build a near-real-time feature computation engine"
✅ Feature serving API "serve features for training & inference"
🛠️ Add Kafka, Spark, Feast plugins "operate pipelines across domains"
🔍 Feature search & UI tagging "enable feature discovery and sharing"
📈 Notebook/Polynote endpoints "improve ML productivity through feature access"
🧠 Model versioning, labels, embeddings "centralize feature and embedding stores"

📦 Deployment (Optional)
You can run the whole stack via Docker:

docker-compose up --build

🧑‍💼 Use in Your Resume / Interview
"InferStream is a real-time ML feature platform I built to simulate the infrastructure behind companies like Netflix. It includes a containerized FastAPI backend, a frontend dashboard, and modular feature store logic — all aligned with high-throughput training and low-latency inference workloads."

🏁 Credits
Created by [Your Name] — aspiring ML Infra Engineer.

📬 Questions or Want Help Extending It?
Just open an issue or connect with me during interviews!
