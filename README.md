# FirstStep Digital Edu Platform

> "Learn Smarter, Think Better."

FirstStep is an intelligent digital learning companion and educational platform designed specifically for rural students in India. Using modern Artificial Intelligence, Machine Learning, Natural Language Processing, and Learning Science, FirstStep aims to bridge educational gaps by providing modular, cognitive-first tools that assist students throughout their academic journey.

## 🌟 Features

- **Knowledge Forest**: Visual knowledge graphs that connect concepts and topics
- **Learning Academy**: Structured courses with AI-powered content recommendations
- **Learning Assessment**: Adaptive testing and performance analytics
- **Learning Twin**: Personalized AI learning companion
- **Programming Learning**: Interactive coding lessons with real-time feedback
- **Smart Notes**: AI-enhanced note-taking with summarization and organization
- **Thinking Lab**: Critical thinking exercises and problem-solving tools

## 🏗️ Architecture

The platform follows a microservices architecture with three main components:

### Backend (Node.js/Express)
- API Gateway handling authentication, routing, and business logic
- RESTful endpoints for all features
- JWT-based authentication with PostgreSQL user management
- MongoDB for document storage
- Redis for caching and session management

### Frontend (React)
- Modern React 18 with hooks and context API
- TailwindCSS for responsive styling
- React Router for navigation
- TanStack Query for data fetching and caching
- Interactive visualizations with Chart.js and React Flow

### AI Service (Python/FastAPI)
- NLP processing with spaCy and sentence-transformers
- Vector embeddings with ChromaDB
- Google Gemini API integration for advanced AI features
- Machine learning models for personalized learning
- Document processing (PDF, DOCX)

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Databases**: MongoDB, PostgreSQL, Redis
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Other**: Axios, Multer, WebSocket

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Context, TanStack Query
- **Routing**: React Router DOM
- **UI Components**: Lucide React, Framer Motion
- **Visualization**: Chart.js, React Flow, Mermaid, tldraw

### AI Service
- **Framework**: FastAPI
- **NLP**: spaCy, sentence-transformers, KeyBERT
- **ML**: scikit-learn, PyTorch, Transformers
- **Vector DB**: ChromaDB
- **AI API**: Google Generative AI
- **Document Processing**: pdfplumber, PyPDF2, python-docx

## 📦 Prerequisites

- Node.js (v18 or higher)
- Python (v3.9 or higher)
- Docker and Docker Compose (for containerized setup)
- MongoDB (local or cloud)
- PostgreSQL (local or cloud, e.g., Neon)
- Redis (local or cloud)
- Google Gemini API Key

## 🚀 Getting Started

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd FIRST_STEP
```

2. Configure environment variables:
```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai_service/.env.example ai_service/.env
```

3. Update the `.env` files with your actual configuration:
- Add your Google Gemini API key to `ai_service/.env`
- Update database URLs if using cloud services
- Set secure JWT secrets
- Generate one random `AI_SERVICE_KEY` (for example, `python -c "import secrets; print(secrets.token_urlsafe(32))"`) and set the same value in the project-root `.env` for Compose, `backend/.env`, and `ai_service/.env` for local development.

#### Local Ollama fallback for project reviews

Remote Gemini, Groq, and OpenAI calls fall back to the configured Ollama model when the provider is unavailable. The AI service also uses Ollama for document study packs, generated learning content, and document Q&A. Install Ollama and download the model once:

```bash
ollama serve
ollama pull qwen2.5-coder:3b
```

For backend and AI service processes running directly on your computer, set these in both `backend/.env` and `ai_service/.env`:

```env
OLLAMA_FALLBACK_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:3b
OLLAMA_TIMEOUT_MS=90000
```

For Docker Compose, enable the optional local model service and use its persistent model volume:

```powershell
$env:OLLAMA_FALLBACK_ENABLED = "true"
docker compose --profile local-ai up --build -d
docker compose exec ollama ollama pull qwen2.5-coder:3b
```

The Compose backend and AI service are configured to reach Ollama at `http://ollama:11434`. The first model download needs internet access; later inference runs locally on the machine hosting Ollama. To use a different Ollama model, change `OLLAMA_MODEL` consistently in the backend and AI service configuration.

4. Start all services:
```bash
docker-compose up --build
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Service: internal to the Compose network; access it through the backend API
- MongoDB: localhost:27017
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- ChromaDB: http://localhost:8001

### Option 2: Local Development

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Update .env with your configuration
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Update .env with backend URL
npm run dev
```

#### AI Service Setup

```bash
cd ai_service
pip install -r requirements.txt
cp .env.example .env
# Update .env with your configuration
python main.py
```

For local development, set the same `AI_SERVICE_KEY` in `backend/.env` and
`ai_service/.env`. The service rejects generation requests when the key is
missing or incorrect; only `/health` is public. Docker Compose requires
`AI_SERVICE_KEY` and `JWT_SECRET` from the project-root `.env` or shell.

#### Database Setup

Start MongoDB, PostgreSQL, and Redis locally or use cloud services:
- MongoDB: Install locally or use MongoDB Atlas
- PostgreSQL: Install locally or use Neon/Supabase
- Redis: Install locally or use Redis Cloud
- ChromaDB: Start with Docker or use cloud version

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/firststep
DATABASE_URL=postgresql://firststep:firststep@localhost:5432/firststep
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password
ADMIN_NAME=FirstStep Admin
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api/v1
```

### AI Service (.env)
```
PORT=8000
ENV=development
CHROMA_HOST=localhost
CHROMA_PORT=8001
GEMINI_API_KEY=your_gemini_api_key_here
```

## 📁 Project Structure

```
FIRST_STEP/
├── backend/                 # Node.js API Gateway
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Express middlewares
│   │   └── utils/          # Utility functions
│   ├── server.js           # Entry point
│   └── package.json
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── context/        # React contexts
│   │   ├── layouts/        # Layout components
│   │   └── theme/          # Theme configuration
│   ├── index.html
│   └── package.json
├── ai_service/             # Python AI/ML Service
│   ├── app/
│   │   ├── core/          # Configuration
│   │   ├── routers/       # FastAPI routers
│   │   └── services/      # ML/NLP services
│   ├── data/              # Training data
│   ├── training/          # Model training scripts
│   ├── main.py            # Entry point
│   └── requirements.txt
├── docker-compose.yml     # Docker orchestration
└── render.yaml            # Render deployment config
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### AI Service Tests
```bash
cd ai_service
pytest
```

## 🚢 Deployment

### Render (Backend)
The project includes a `render.yaml` configuration for deploying the backend to Render. The backend will automatically:
- Install dependencies with `npm ci`
- Start with `npm start`
- Health check at `/api/health`

### Vercel (Frontend)
The frontend can be deployed to Vercel:
1. Connect your repository to Vercel
2. Set `VITE_API_URL` environment variable to your production backend URL
3. Deploy automatically on push

### Docker Production
For production Docker deployment:
1. Update environment variables for production
2. Use production-ready database services
3. Enable SSL/TLS for all connections
4. Set up proper monitoring and logging

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built for rural education in India
- Powered by modern AI/ML technologies
- Inspired by the need for accessible, quality education

## 📞 Contact

For questions or support, please open an issue on GitHub or contact the development team.
