import axios from 'axios'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export const aiServiceClient = axios.create({
  baseURL: AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for AI processing
})

// Request interceptor
aiServiceClient.interceptors.request.use(
  (config) => {
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
