import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MainLayout from '../layouts/MainLayout'
import AuthLayout from '../layouts/AuthLayout'

// Pages
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import SmartNotesPage from '../pages/features/SmartNotesPage'
import LearningTwinPage from '../pages/features/LearningTwinPage'
import LearningAcademyPage from '../pages/features/LearningAcademyPage'
import KnowledgeForestPage from '../pages/features/KnowledgeForestPage'
import ThinkingLabPage from '../pages/features/ThinkingLabPage'
import ProgrammingLearningPage from '../pages/features/ProgrammingLearningPage'
import NotFoundPage from '../pages/NotFoundPage'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

const AppRouter = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      }/>
      <Route path="/register" element={
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      }/>

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        </ProtectedRoute>
      }/>
      
      <Route path="/smart-notes" element={
        <ProtectedRoute>
          <MainLayout>
            <SmartNotesPage />
          </MainLayout>
        </ProtectedRoute>
      }/>
      
      <Route path="/learning-twin" element={
        <ProtectedRoute>
          <MainLayout>
            <LearningTwinPage />
          </MainLayout>
        </ProtectedRoute>
      }/>
      
      <Route path="/learning-academy" element={
        <ProtectedRoute>
          <MainLayout>
            <LearningAcademyPage />
          </MainLayout>
        </ProtectedRoute>
      }/>

      <Route path="/programming-learning" element={
        <ProtectedRoute>
          <MainLayout>
            <ProgrammingLearningPage />
          </MainLayout>
        </ProtectedRoute>
      }/>
      
      <Route path="/knowledge-forest" element={
        <ProtectedRoute>
          <MainLayout>
            <KnowledgeForestPage />
          </MainLayout>
        </ProtectedRoute>
      }/>
      
      <Route path="/thinking-lab" element={
        <ProtectedRoute>
          <MainLayout>
            <ThinkingLabPage />
          </MainLayout>
        </ProtectedRoute>
      }/>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRouter
