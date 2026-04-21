'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/stores/authStore'

export default function UnauthorizedPage() {
  const router = useRouter()
  const user = useUser()

  const roleRedirects: Record<string, string> = {
    participant: '/dashboard',
    organiser: '/organiser',
    judge: '/judge',
    mentor: '/mentor',
    sponsor: '/sponsor',
  }

  const dashboardPath = user ? roleRedirects[user.role] || '/dashboard' : '/login'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You don&apos;t have access to this page.
        </p>
        {user && (
          <p className="text-sm text-gray-500 mb-6">
            Your role: <span className="font-medium">{user.role}</span>
          </p>
        )}
        <button
          onClick={() => router.push(dashboardPath)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to your dashboard
        </button>
      </div>
    </div>
  )
}