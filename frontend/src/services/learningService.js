import { api } from './api';

export const learningService = {
  getLessons: async (classVal, subject) => {
    const response = await api.get('/lessons', { params: { class: classVal, subject } });
    return response.data;
  },

  getLessonById: async (id) => {
    const response = await api.get(`/lesson/${id}`);
    return response.data;
  },

  submitQuiz: async (lessonId, answers) => {
    const response = await api.post('/quiz/submit', { lessonId, answers });
    return response.data;
  },

  submitTask: async (lessonId, taskData) => {
    const response = await api.post('/task/submit', { lessonId, taskData });
    return response.data;
  },

  getLearningProfile: async () => {
    const response = await api.get('/learning/profile');
    return response.data;
  },

  getLearningPath: async (classVal, subject) => {
    const response = await api.get('/learning/path', { params: { class: classVal, subject } });
    return response.data;
  },

  getRecommendations: async () => {
    const response = await api.get('/recommendations');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/analytics');
    return response.data;
  },

  importLessons: async () => {
    const response = await api.post('/lessons/import');
    return response.data;
  },
};

export default learningService;
