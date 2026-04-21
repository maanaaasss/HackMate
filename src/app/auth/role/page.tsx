'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Users, Trophy } from 'lucide-react'

type Role = 'participant' | 'organiser'

export default function RoleSelectionPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get user directly from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Auth error:', error)
          toast.error('Authentication error. Please log in again.')
          router.push('/login')
          return
        }
        if (user) {
          setUserId(user.id)
        } else {
          toast.error('Please log in first.')
          router.push('/login')
        }
      } catch (err) {
        console.error('Error getting user:', err)
        toast.error('Error. Please log in again.')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    getUser()
  }, [router])

  const handleSelectRole = async (role: Role) => {
    if (!userId) {
      toast.error('User not found. Please log in again.')
      router.push('/login')
      return
    }

    setSelectedRole(role)
    setIsSubmitting(true)

    try {
      // Update profile with role (profile already exists, created by auth trigger)
      const { error } = await supabase
        .from('profiles')
        .update({
          role: role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      // Set role cookie
      document.cookie = `hackmate-role=${role}; path=/; max-age=3600; samesite=lax${process.env.NODE_ENV === 'production' ? '; secure' : ''}`

      toast.success(role === 'organiser' ? 'Welcome, organiser!' : 'Welcome to Hackmate!')

      // Redirect based on role
      if (role === 'organiser') {
        router.push('/organiser')
      } else {
        // Participants go to profile setup with onboarding flag
        router.push('/profile?onboarding=true')
      }
    } catch (error) {
      toast.error('Failed to set role. Please try again.')
      console.error(error)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold" style={{ color: '#1E3A5F' }}>
            Hackmate
          </h1>
          <p className="mt-2 text-lg font-medium text-gray-900">
            How do you want to use Hackmate?
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Choose your role to get started
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {/* Participant Option */}
          <button
            onClick={() => handleSelectRole('participant')}
            disabled={isSubmitting}
            className={`w-full p-6 border-2 rounded-lg text-left transition-all hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
              selectedRole === 'participant' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Join as Participant
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Join hackathons, form teams, build projects, and compete for prizes.
                </p>
                <ul className="mt-3 text-sm text-gray-500 space-y-1">
                  <li>• Browse and join hackathons</li>
                  <li>• Create or join teams</li>
                  <li>• Submit projects</li>
                  <li>• Get mentorship</li>
                </ul>
              </div>
            </div>
          </button>

          {/* Organiser Option */}
          <button
            onClick={() => handleSelectRole('organiser')}
            disabled={isSubmitting}
            className={`w-full p-6 border-2 rounded-lg text-left transition-all hover:border-purple-500 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 ${
              selectedRole === 'organiser' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Organise Hackathons
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Create and manage hackathons, judge submissions, and sponsor events.
                </p>
                <ul className="mt-3 text-sm text-gray-500 space-y-1">
                  <li>• Create hackathons</li>
                  <li>• Manage teams and submissions</li>
                  <li>• Set up judging rubrics</li>
                  <li>• Send announcements</li>
                </ul>
              </div>
            </div>
          </button>
        </div>

        {isSubmitting && (
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Setting up your account...
          </div>
        )}

        <p className="text-center text-xs text-gray-500">
          You can request a role change later in settings.
        </p>
      </div>
    </div>
  )
}
