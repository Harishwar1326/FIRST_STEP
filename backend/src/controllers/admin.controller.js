import { adminService } from '../services/admin.service.js'

export const adminController = {
  summary: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.getDashboardSummary())
    } catch (error) {
      next(error)
    }
  },

  students: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.listStudents(req.query))
    } catch (error) {
      next(error)
    }
  },

  studentAnalytics: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.getStudentAnalytics(req.params.id))
    } catch (error) {
      next(error)
    }
  },

}
