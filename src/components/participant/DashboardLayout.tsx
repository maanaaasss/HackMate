'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  Upload,
  Calendar,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { TeamMember } from '@/types'
import EventCountdown from './EventCountdown'
import HackathonTimeline from './HackathonTimeline'
import TeamStatusCard from './TeamStatusCard'
import RecommendationFeed from './RecommendationFeed'
import AnnouncementsFeed from './AnnouncementsFeed'
import RaiseHandButton from './RaiseHandButton'

type User = {
  id: string
  email: string
  full_name: string
  avatar_url?: string
}

type Hackathon = {
  id: string
  name: string
  status: string
  start_time?: string
  end_time?: string
  submission_deadline?: string
  registration_deadline?: string
}

type Team = {
  id: string
  name: string
  description?: string
  status: string
  team_lead_id: string
  hackathon_id: string
  created_at: string
  member_count: number
  members: TeamMember[]
  user_role: 'lead' | 'member'
}

type Announcement = {
  id: string
  title: string
  message: string
  sent_at: string
}

type TimelineEvent = {
  id: string
  title: string
  description?: string
  scheduled_at: string
  type: string
}

export default function DashboardLayout({
  user,
  hackathon,
  currentTeam,
  announcements,
  teamsForRecommendations,
  userSkills,
  timeline,
  endedHackathon,
  feedbackSubmitted,
}: {
  user: User
  hackathon?: Hackathon
  currentTeam?: Team | null
  announcements: Announcement[]
  teamsForRecommendations: {
    id: string
    name: string
    description?: string
    ghost_slots: {
      id: string
      skill_needed: string
      description?: string
      filled: boolean
    }[]
    member_count: number
    members: {
      user_id: string
      role: 'lead' | 'member'
      profile: {
        id: string
        full_name: string
        avatar_url?: string
        skills: string[]
      }
    }[]
  }[]
  userSkills: string[]
  timeline: TimelineEvent[]
  endedHackathon?: { id: string; name: string; status: string } | null
  feedbackSubmitted?: boolean
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Team', href: '/team', icon: Users },
    { name: 'Submit', href: '/submit', icon: Upload },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            {!sidebarCollapsed && (
              <span className="ml-3 text-lg font-semibold text-gray-900">Hackmate</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon
                className={`flex-shrink-0 h-5 w-5 ${
                  isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              {!sidebarCollapsed && (
                <span className="ml-3">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span className="text-gray-600 font-medium">
                  {user.full_name.charAt(0)}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse button (desktop only) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Main content */}
      <div className={`lg:pl-${sidebarCollapsed ? '20' : '64'} transition-all duration-300`}>
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">Hackmate</span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Dashboard content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Feedback Banner */}
            {endedHackathon && !feedbackSubmitted && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      🎉 Hackathon ended! Tell us how it went — takes 2 minutes.
                    </h3>
                    <p className="text-blue-100 text-sm">
                      Your feedback helps us improve future events.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/feedback"
                    className="inline-flex items-center px-4 py-2 bg-white text-blue-600 font-medium rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Give Feedback
                  </Link>
                </div>
              </div>
            )}

            {/* Event Countdown */}
            {hackathon && (
              <EventCountdown hackathon={hackathon} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Timeline */}
                {timeline.length > 0 && (
                  <HackathonTimeline events={timeline} />
                )}

                {/* Recommendations */}
                <RecommendationFeed
                  teams={teamsForRecommendations}
                  userSkills={userSkills}
                />
              </div>

              {/* Right column */}
              <div className="space-y-8">
                {/* Team Status */}
                <TeamStatusCard
                  currentTeam={currentTeam}
                  hackathon={hackathon}
                />

                {/* Announcements */}
                <AnnouncementsFeed
                  initialAnnouncements={announcements}
                  hackathonId={hackathon?.id}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Raise Hand Button (only during ongoing status) */}
        {currentTeam && hackathon?.status === 'ongoing' && (
          <RaiseHandButton
            teamId={currentTeam.id}
            hackathonId={hackathon.id}
            userId={user.id}
          />
        )}
      </div>
    </div>
  )
}