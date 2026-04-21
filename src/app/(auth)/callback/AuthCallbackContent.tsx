'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for error in URL params
      const errorParam = searchParams.get('error')
      if (errorParam) {
        setError(errorParam)
        router.push(`/login?error=${encodeURIComponent(errorParam)}`)
        return
      }

      // Get session from Supabase (handles hash fragments automatically)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError(sessionError.message)
        router.push(`/login?error=${encodeURIComponent(sessionError.message)}`)
        return
      }

      if (!session) {
        setError('No session found')
        router.push('/login?error=no_session')
        return
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        router.push(`/login?error=${encodeURIComponent(profileError.message)}`)
        return
      }

      // Check if new user (empty full_name or college)
      if (!profile.full_name || !profile.college) {
        router.push('/profile?onboarding=true')
        return
      }

      // Redirect based on role
      const roleRedirects: Record<string, string> = {
        participant: '/dashboard',
        organiser: '/organiser',
        judge: '/judge',
        mentor: '/mentor',
        sponsor: '/sponsor',
      }

      const redirectPath = roleRedirects[profile.role] || '/dashboard'
      router.push(redirectPath)
    }

    handleAuthCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Signing you in...</p>
      </div>
    </div>
  )
}