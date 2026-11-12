import mongoose from 'mongoose'
import { VideoActivityEvent } from '../models/programmingLearning.model.js'

export const isDbReady = () => mongoose.connection.readyState === 1

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set in backend/.env — Smart Notes uploads will fail.')
    return
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    await VideoActivityEvent.createIndexes()
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`)
    // Don't exit, just warn
  }
}

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect()
    console.log('✅ MongoDB Disconnected')
  } catch (error) {
    console.error(`❌ MongoDB Disconnection Error: ${error.message}`)
  }
}
