import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { AppError } from '../utils/errorHandler.js'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const extensionToMime = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.md': 'text/markdown',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const resolveMimeType = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (
    file.mimetype &&
    file.mimetype !== 'application/octet-stream' &&
    ALLOWED_MIME_TYPES.has(file.mimetype)
  ) {
    return file.mimetype
  }
  return extensionToMime[ext] || null
}

export const uploadFile = async (file, userId) => {
  try {
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // 1. Size Validation
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(`File size exceeds the 10MB limit`, 400);
    }

    const allowedMime = resolveMimeType(file)

    if (!allowedMime || !ALLOWED_MIME_TYPES.has(allowedMime)) {
      throw new AppError(
        `Unsupported file type: ${file.mimetype || 'unknown'}. Please upload PDF, TXT, DOCX, PPT, or images.`,
        400,
      )
    }

    // Create uploads directory if it doesn't exist
    // Resolve storage relative to this module so uploads work regardless of
    // which directory was current when the API process was started.
    const uploadDir = path.join(backendRoot, 'uploads', String(userId))
    await fs.mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const originalName = path.basename(String(file.originalname || 'upload'))
    const fileName = `${Date.now()}-${randomUUID()}-${originalName}`
    const filePath = path.join(uploadDir, fileName)

    // Write file to disk
    await fs.writeFile(filePath, file.buffer)

    return {
      filePath,
      fileName,
      originalName,
      mimeType: allowedMime,
      size: file.size
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('File upload error:', error.code || error.name, error.message)
    throw new AppError('File upload failed due to a server error', 500)
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
