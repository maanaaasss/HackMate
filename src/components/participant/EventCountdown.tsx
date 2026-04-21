'use client'

import { useState, useEffect } from 'react'

type Hackathon = {
  id: string
  name: string
  status: string
  start_time?: string
  end_time?: string
  submission_deadline?: string
  registration_deadline?: string
}

export default function EventCountdown({ hackathon }: { hackathon: Hackathon }) {
  const getTargetTime = () => {
    switch (hackathon.status) {
      case 'registration_open':
        return hackathon.start_time ? new Date(hackathon.start_time) : null
      case 'ongoing':
        return hackathon.submission_deadline 
          ? new Date(hackathon.submission_deadline) 
          : hackathon.end_time 
            ? new Date(hackathon.end_time) 
            : null
      case 'judging':
        return hackathon.end_time ? new Date(hackathon.end_time) : null
      default:
        return null
    }
  }

  const targetTime = getTargetTime()

  const calculateTimeLeft = () => {
    if (!targetTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
    }

    const now = new Date()
    const difference = targetTime.getTime() - now.getTime()

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isExpired: false,
    }
  }

  const [timeLeftData, setTimeLeftData] = useState(calculateTimeLeft)

  useEffect(() => {
    if (!targetTime) {
      return
    }

    // Update every second
    const timer = setInterval(() => {
      setTimeLeftData(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetTime])

  const timeLeft = { days: timeLeftData.days, hours: timeLeftData.hours, minutes: timeLeftData.minutes, seconds: timeLeftData.seconds }
  const isExpired = timeLeftData.isExpired

  const getTargetLabel = () => {
    switch (hackathon.status) {
      case 'registration_open':
        return 'Hackathon starts in'
      case 'ongoing':
        return hackathon.submission_deadline 
          ? 'Submissions close in' 
          : 'Hackathon ends in'
      case 'judging':
        return 'Judging ends in'
      default:
        return 'Event starts in'
    }
  }

  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {hackathon.status === 'ongoing' ? 'Submissions closed!' : 'Event has started!'}
          </h2>
          <p className="text-blue-100">
            {hackathon.name}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">{getTargetLabel()}</h2>
        <div className="flex justify-center space-x-4 md:space-x-8">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold mb-1">
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-blue-200 text-sm uppercase tracking-wider">
              Days
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold mb-1">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-blue-200 text-sm uppercase tracking-wider">
              Hours
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold mb-1">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-blue-200 text-sm uppercase tracking-wider">
              Minutes
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold mb-1">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-blue-200 text-sm uppercase tracking-wider">
              Seconds
            </div>
          </div>
        </div>
        <p className="mt-4 text-blue-100">
          {hackathon.name}
        </p>
      </div>
    </div>
  )
}