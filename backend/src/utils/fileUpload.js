import fs from 'fs/promises'
import path from 'path'
import { AppError } from '../utils/errorHandler.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export const uploadFile = async (file, userId) => {
  try {
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // 1. Size Validation
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(`File size exceeds the 10MB limit`, 400);
    }

    // 2. MIME Type Validation
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new AppError(`Unsupported file type: ${file.mimetype}. Please upload PDF, TXT, DOCX, or images.`, 400);
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', userId)
    await fs.mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.originalname}`
    const filePath = path.join(uploadDir, fileName)

    // Write file to disk
    await fs.writeFile(filePath, file.buffer)

    return {
      filePath,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('File upload error:', error)
    throw new AppError('File upload failed due to a server error', 500);
  }
}

export const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    console.error('File deletion error:', error)
    return false
  }
}
