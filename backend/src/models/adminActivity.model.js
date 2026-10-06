import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['register', 'login', 'lesson_complete', 'quiz_submit', 'assessment_submit'],
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['student_register', 'student_login', 'activity'],
      default: 'activity',
    },
    studentId: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)
export const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema)

export default {
  ActivityLog,
  AdminNotification,
}
