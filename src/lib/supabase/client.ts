import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Lazy singleton — only instantiated on first access (at runtime in the browser,
// never during `next build` static pre-rendering where env vars are absent).
let _supabase: SupabaseClient | null = null
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_supabase) {
      _supabase = createClient()
    }
    const value = Reflect.get(_supabase, prop, receiver)
    return typeof value === 'function' ? value.bind(_supabase) : value
  },
})