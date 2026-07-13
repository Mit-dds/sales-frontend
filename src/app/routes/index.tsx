import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from './guards/ProtectedRoute'
import { AdminRoute } from './guards/AdminRoute'
import { PublicRoute } from './guards/PublicRoute'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { ProtectedLayout } from '@/app/layouts/ProtectedLayout'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import VerifyOtp from '@/pages/VerifyOtp'
import ResetPassword from '@/pages/ResetPassword'
import PendingApproval from '@/pages/PendingApproval'
import NewOffer from '@/pages/NewOffer'
import OfferHistory from '@/pages/OfferHistory'
import Profile from '@/pages/Profile'
import AdminProjects from '@/pages/AdminProjects'
import Availability from '@/pages/Availability'
import UserManagement from '@/pages/UserManagement'
import AdminSettings from '@/pages/AdminSettings'
import NotFound from '@/pages/NotFound'

export const routes: RouteObject[] = [
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
          { path: '/verify-otp', element: <VerifyOtp /> },
          { path: '/reset-password', element: <ResetPassword /> },
          { path: '/pending-approval', element: <PendingApproval /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <ProtectedLayout />,
        children: [
          { path: '/offers', element: <NewOffer /> },
          { path: '/history', element: <OfferHistory /> },
          { path: '/profile', element: <Profile /> },
        ],
      },
    ],
  },
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/projects', element: <AdminProjects /> },
          { path: '/availability', element: <Availability /> },
          { path: '/users', element: <UserManagement /> },
          { path: '/settings', element: <AdminSettings /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/projects" replace /> },
  { path: '*', element: <NotFound /> },
]
