import { Navigate, Route, Routes } from 'react-router-dom'
import { ReactNode } from 'react'
import { isLoggedIn } from './auth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import AccountPage from './pages/AccountPage'
import ProfilePage from './pages/ProfilePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TaskDetailPage from './pages/TaskDetailPage'
import AppShell from './components/AppShell'

function RequireAuth({ children }: { children: ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          isLoggedIn() ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isLoggedIn() ? '/dashboard' : '/'} replace />}
      />
    </Routes>
  )
}
