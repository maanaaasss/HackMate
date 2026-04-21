'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  loading: boolean
  setUser: (user: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        set({ user: profile as UserProfile, loading: false })
      } else {
        set({ loading: false })
      }
    })

    // Listen for auth changes
    const { data: { subscription: _subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ user: null })
        } else if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          set({ user: profile as UserProfile })
        }
      }
    )

    // Cleanup subscription on unmount (though this store persists)
    // We'll return a cleanup function but Zustand doesn't call it automatically
    // Instead, we'll store the unsubscribe and call it when needed
    // For simplicity, we'll keep the subscription alive
  },
}))

// Selector hooks
export const useUser = () => useAuthStore((state) => state.user)
export const useIsLoading = () => useAuthStore((state) => state.loading)