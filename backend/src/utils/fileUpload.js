import fs from 'fs/promises'
import path from 'path'

export const uploadFile = async (file, userId) => {
  try {
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
    console.error('File upload error:', error)
    throw new Error('File upload failed')
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
