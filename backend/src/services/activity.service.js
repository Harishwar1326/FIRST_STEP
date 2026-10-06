import mongoose from 'mongoose'
import { ActivityLog, AdminNotification } from '../models/adminActivity.model.js'

const isDbReady = () => mongoose.connection.readyState !== 0

export const activityService = {
  /**
   * Log student activity (register, login, etc.) and create admin notification.
   */
  async recordActivityAndNotifyAdmin({ type, user, action, metadata = {} }) {
    if (!user || !user.id) return null

    const studentId = String(user.id)
    const studentName = String(user.name || 'User')
    const studentEmail = String(user.email || 'user@example.com')
    const userRole = user.role || 'student'
    const roleLabel = userRole === 'admin' ? 'Admin' : 'Student'

    // Always attempt DB logging unless explicitly disconnected
    if (!isDbReady()) {
      console.log(`[ACTIVITY LOG] (${type}): ${studentName} (${studentEmail}) - ${action}`)
      return null
    }

    try {
      // 1. Create Activity Log
      const activity = await ActivityLog.create({
        userId: studentId,
        studentName,
        studentEmail,
        type,
        action: action || (type === 'register' ? `New ${roleLabel} Registration` : `${roleLabel} Login`),
        metadata,
      })

      // 2. Create Admin Notification
      let notifTitle = ''
      let notifMessage = ''
      let notifType = 'activity'

      if (type === 'register') {
        notifTitle = `New ${roleLabel} Registration: ${studentName}`
        notifMessage = `${studentName} (${studentEmail}) created a new account.`
        notifType = 'student_register'
      } else if (type === 'login') {
        notifTitle = `${roleLabel} Login: ${studentName}`
        notifMessage = `${studentName} (${studentEmail}) logged into the platform.`
        notifType = userRole === 'admin' ? 'activity' : 'student_login'
      } else {
        notifTitle = `${roleLabel} Activity: ${studentName}`
        notifMessage = `${studentName} performed ${action || type}.`
      }

      const notification = await AdminNotification.create({
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        studentId,
        studentName,
        studentEmail,
        read: false,
      })

      return { activity, notification }
    } catch (error) {
      console.error('Error logging student activity / admin notification:', error.message)
      return null
    }
  },

  /**
   * Get unread and recent admin notifications.
   */
  async getAdminNotifications(limit = 20) {
    if (!isDbReady()) {
      return { unreadCount: 0, notifications: [] }
    }

    try {
      const [unreadCount, notifications] = await Promise.all([
        AdminNotification.countDocuments({ read: false }),
        AdminNotification.find().sort({ createdAt: -1 }).limit(limit).lean(),
      ])

      return {
        unreadCount,
        notifications: notifications.map((n) => ({
          id: String(n._id),
          title: n.title,
          message: n.message,
          type: n.type,
          studentId: n.studentId,
          studentName: n.studentName,
          studentEmail: n.studentEmail,
          read: n.read,
          createdAt: n.createdAt,
        })),
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error.message)
      return { unreadCount: 0, notifications: [] }
    }
  },

  /**
   * Mark notifications as read.
   */
  async markNotificationsRead(ids = []) {
    if (!isDbReady()) return { success: true }

    try {
      if (Array.isArray(ids) && ids.length > 0) {
        await AdminNotification.updateMany({ _id: { $in: ids } }, { $set: { read: true } })
      } else {
        // Mark all as read
        await AdminNotification.updateMany({ read: false }, { $set: { read: true } })
      }
      return { success: true }
    } catch (error) {
      console.error('Error marking notifications read:', error.message)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get recent student activity logs for Faculty/Admin dashboard.
   */
  async getRecentActivities(limit = 25) {
    if (!isDbReady()) {
      return { activities: [] }
    }

    try {
      const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean()
      return {
        activities: logs.map((log) => ({
          id: String(log._id),
          userId: log.userId,
          studentName: log.studentName,
          studentEmail: log.studentEmail,
          type: log.type,
          action: log.action,
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error.message)
      return { activities: [] }
    }
  },
}

export default activityService
