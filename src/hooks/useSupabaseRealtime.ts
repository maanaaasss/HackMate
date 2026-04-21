import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useSupabaseRealtime(channelName: string, callback: (payload: unknown) => void) {
  useEffect(() => {
    const channel = supabase.channel(channelName)
    channel.on('broadcast', { event: '*' }, callback).subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, callback])
}