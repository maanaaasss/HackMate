import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function formatTimeAgo(date: Date | string): string {
  const d = new Date(date)
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatCountdown(targetDate: Date | string): {
  days: number
  hours: number
  minutes: number
  seconds: number
} {
  const target = new Date(targetDate)
  const now = new Date()
  let totalSeconds = differenceInSeconds(target, now)
  
  if (totalSeconds < 0) {
    totalSeconds = 0
  }
  
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60
  
  return { days, hours, minutes, seconds }
}