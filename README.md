# FirstStep Digital Edu Platform

> "Learn Smarter, Think Better."

FirstStep is an intelligent digital learning companion and educational platform designed specifically for rural students in India. Using modern Artificial Intelligence, Machine Learning, Natural Language Processing, and Learning Science, FirstStep aims to bridge educational gaps by providing modular, cognitive-first tools that assist students throughout their academic journey.

---

## 🏗️ System Architecture

The project is structured as a feature-based monorepo consisting of:

```mermaid
graph TD
    React[React Frontend: Vite + Tailwind] -->|API Calls & Auth| Express[Express API Gateway: Node.js]
    Express -->|Orchestration / Auth| Mongo[(MongoDB: Metadata & States)]
    Express -->|Cache/Sessions| Redis[(Redis Caching)]
    Express -->|AI Queries| FastAPI[FastAPI AI Service: Python]
    FastAPI -->|Extract, Embed & Index| Vector[(ChromaDB: Embeddings)]
    FastAPI -->|Local ML / NLP pipelines| PyML[spaCy, Transformers, KeyBERT, PyTorch]
```

- **Frontend (Vite / React / Tailwind)**: Sleek, fluid, and responsive dashboard following Notion-like minimalist and functional aesthetics.
- **Backend API Gateway (Express / Node.js)**: Security, authentication, state routing, DB interactions, and caching logic.
- **AI Service (FastAPI / Python)**: Independent execution engine containing specific NLP pipelines (Embeddings, Summarization, Mind Maps, Question Generation, Learning Twin Analytics).

---

## 📁 Repository Structure

```text
FIRST_STEP/
├── backend/            # Express API Gateway
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   └── routes/
│   ├── Dockerfile
│   └── package.json
├── ai_service/         # FastAPI ML Pipelines
│   ├── app/
│   │   ├── core/
│   │   ├── pipelines/
│   │   └── routers/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/           # Vite React Web App
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   └── pages/
│   └── package.json
└── docker-compose.yml  # Local multi-service orchestration
```

---

## 🚦 Local Startup Guide

To boot up the entire stack using Docker Compose:

```bash
docker-compose up --build
```

Alternatively, you can run the components locally in separate terminals:

### 1. Express Backend

```bash
cd backend
npm install
npm run dev
```

## Production Deployment

### Backend on Render

Create a Render Web Service from this repository. Render can use the included `render.yaml`, or configure the service manually with:

- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set these environment variables in Render:

```text
NODE_ENV=production
MONGO_URI=<MongoDB Atlas connection string>
DATABASE_URL=<Neon or other PostgreSQL connection string>
JWT_SECRET=<long random secret>
CORS_ORIGINS=https://<your-vercel-domain>
AI_SERVICE_URL=<public URL of the deployed AI service>
ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<strong admin password>
ADMIN_NAME=FirstStep Admin
```

`REDIS_URL` is optional. The AI service must be deployed separately and its public URL must be supplied as `AI_SERVICE_URL` if AI features are enabled.

### Frontend on Vercel

Create a Vercel project from this repository and set the Root Directory to `frontend`. Vercel detects Vite automatically:

- Build Command: `npm run build`
- Output Directory: `dist`

Add this Vercel environment variable for the Production environment before deploying:

```text
VITE_API_URL=https://<your-backend>.onrender.com/api/v1
```

The frontend includes `frontend/vercel.json` so browser refreshes on application routes are handled by the SPA entry point. After the Vercel domain is known, set that exact URL in Render's `CORS_ORIGINS` and redeploy the backend.

### 2. FastAPI AI Service

```bash
cd ai_service
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000
```

### 3. React Frontend

```bash
cd frontend
npm install
npm run dev
```
