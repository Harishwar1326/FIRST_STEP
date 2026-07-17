import mongoose from 'mongoose'
import { User } from '../models/user.model.js'

export const userRepository = {
  async create(userData) {
    const user = new User(userData)
    await user.save()
    return user
  },

  async findById(userId) {
    return User.findById(userId).select('-password')
  },

  async findByEmail(email) {
    return User.findOne({ email })
  },

  async update(userId, updateData) {
    return User.findByIdAndUpdate(userId, updateData, { new: true })
  },

  async delete(userId) {
    return User.findByIdAndDelete(userId)
  },
}
