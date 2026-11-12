import axios from 'axios'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export const aiServiceClient = axios.create({
  baseURL: AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 120000,
})

// Request interceptor
aiServiceClient.interceptors.request.use(
  (config) => {
    const serviceKey = process.env.AI_SERVICE_KEY
    if (!serviceKey) {
      return Promise.reject(new Error('AI_SERVICE_KEY is required for backend-to-AI requests'))
    }
    config.headers = config.headers || {}
    config.headers['x-ai-service-key'] = serviceKey
    config.metadata = { startTime: new Date() }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
aiServiceClient.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime
    console.log(`AI Service request completed in ${duration}ms`)
    return response
  },
  (error) => {
    console.error('AI Service error:', error.message)
    return Promise.reject(error)
  }
)

export default aiServiceClient
