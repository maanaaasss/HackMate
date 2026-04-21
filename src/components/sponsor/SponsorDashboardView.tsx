'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Building2, 
  Globe, 
  Gift, 
  Edit, 
  Save, 
  X, 
  Download,
  Send,
  Users,
  ExternalLink,
  Code
} from 'lucide-react'

type Sponsor = {
  id: string
  hackathon_id: string
  user_id?: string
  name: string
  logo_url?: string
  website_url?: string
  tier: 'title' | 'gold' | 'silver'
  prize_description?: string
  can_ping_participants: boolean
}

type Hackathon = {
  id: string
  name: string
  status: string
}

type VisibleProfile = {
  id: string
  full_name: string
  avatar_url?: string
  college?: string
  year_of_study?: number
  skills: string[]
  github_username?: string
  github_data?: {
    public_repos: number
    followers: number
    top_repos: {
      name: string
      description?: string
      language?: string
      stars: number
    }[]
  }
}

type SponsorDashboardViewProps = {
  sponsor: Sponsor
  hackathon: Hackathon
  visibleProfiles: VisibleProfile[]
  pingCount: number
}

export default function SponsorDashboardView({
  sponsor,
  hackathon,
  visibleProfiles,
  pingCount,
}: SponsorDashboardViewProps) {
  const queryClient = useQueryClient()
  const [isEditingPrize, setIsEditingPrize] = useState(false)
  const [prizeDescription, setPrizeDescription] = useState(sponsor.prize_description || '')
  const [pingMessage, setPingMessage] = useState('')

  const maxPings = 3
  const pingsRemaining = maxPings - pingCount

  // Update prize mutation
  const updatePrizeMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_description: description }),
      })
      if (!response.ok) throw new Error('Failed to update prize')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Prize description updated')
      setIsEditingPrize(false)
      queryClient.invalidateQueries({ queryKey: ['sponsor', sponsor.id] })
    },
    onError: () => {
      toast.error('Failed to update prize description')
    },
  })

  // Send ping mutation
  const sendPingMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/sponsors/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsor_id: sponsor.id, message }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send ping')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Ping sent to all participants')
      setPingMessage('')
      queryClient.invalidateQueries({ queryKey: ['sponsor-pings', sponsor.id] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSavePrize = () => {
    updatePrizeMutation.mutate(prizeDescription)
  }

  const handleSendPing = () => {
    if (pingMessage.trim().length === 0) {
      toast.error('Please enter a message')
      return
    }
    sendPingMutation.mutate(pingMessage)
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'College', 'Year', 'Skills', 'GitHub']
    const rows = visibleProfiles.map(profile => [
      profile.full_name,
      profile.college || '',
      profile.year_of_study?.toString() || '',
      profile.skills.join('; '),
      profile.github_username ? `https://github.com/${profile.github_username}` : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hackmate-talent-${hackathon.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getTierBadge = (tier: string) => {
    const tierConfig = {
      title: { label: 'Title Sponsor', className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' },
      gold: { label: 'Gold Sponsor', className: 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900' },
      silver: { label: 'Silver Sponsor', className: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900' },
    }
    return tierConfig[tier as keyof typeof tierConfig] || tierConfig.silver
  }

  const tierBadge = getTierBadge(sponsor.tier)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sponsor Dashboard</h1>
          <p className="mt-2 text-gray-600">{hackathon.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Sponsor Booth */}
          <div className="lg:col-span-1 space-y-6">
            {/* Section 1: Sponsor Booth */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Booth</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierBadge.className}`}>
                  {tierBadge.label}
                </span>
              </div>

              {/* Sponsor Info */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {sponsor.logo_url ? (
                    <Image 
                      src={sponsor.logo_url} 
                      alt={sponsor.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{sponsor.name}</h3>
                    {sponsor.website_url && (
                      <a 
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Visit Website
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Prize Description */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-gray-700">
                      <Gift className="w-5 h-5 mr-2" />
                      <span className="font-medium">Prize</span>
                    </div>
                    {!isEditingPrize && (
                      <button
                        onClick={() => setIsEditingPrize(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Prize
                      </button>
                    )}
                  </div>

                  {isEditingPrize ? (
                    <div className="space-y-2">
                      <textarea
                        value={prizeDescription}
                        onChange={(e) => setPrizeDescription(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Describe your prize..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSavePrize}
                          disabled={updatePrizeMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingPrize(false)
                            setPrizeDescription(sponsor.prize_description || '')
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">
                      {sponsor.prize_description || 'No prize description set'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Direct Ping */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Direct Ping</h2>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pings Used</span>
                  <span className="font-medium text-gray-900">{pingCount} of {maxPings}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(pingCount / maxPings) * 100}%` }}
                  />
                </div>
              </div>

              {pingsRemaining > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message to Participants
                    </label>
                    <textarea
                      value={pingMessage}
                      onChange={(e) => setPingMessage(e.target.value.slice(0, 200))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Send a message to all participants..."
                    />
                    <p className="mt-1 text-xs text-gray-500 text-right">
                      {pingMessage.length}/200 characters
                    </p>
                  </div>

                  <button
                    onClick={handleSendPing}
                    disabled={sendPingMutation.isPending || pingMessage.trim().length === 0}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Ping to All Participants
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">
                    You have used all {maxPings} pings for this hackathon.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Talent Export */}
          <div className="lg:col-span-2">
            {/* Section 2: Talent Export */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Participant Profiles</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    <Users className="w-4 h-4 inline mr-1" />
                    {visibleProfiles.length} participants visible to sponsors
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={visibleProfiles.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>

              {visibleProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No participants have opted in for sponsor visibility yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleProfiles.map((profile) => (
                    <TalentCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TalentCard({ profile }: { profile: VisibleProfile }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start space-x-4">
        {profile.avatar_url ? (
          <Image 
            src={profile.avatar_url} 
            alt={profile.full_name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg font-medium text-gray-600">
              {profile.full_name.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {profile.full_name}
          </h3>
          <p className="text-sm text-gray-500">
            {profile.college}
            {profile.year_of_study && ` • Year ${profile.year_of_study}`}
          </p>
        </div>
      </div>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {profile.skills.slice(0, 5).map((skill, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 5 && (
              <span className="text-xs text-gray-500">
                +{profile.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* GitHub */}
      {profile.github_username && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href={`https://github.com/${profile.github_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <Code className="w-4 h-4 mr-1" />
            {profile.github_username}
          </a>

          {/* Top GitHub Repo */}
          {profile.github_data?.top_repos?.[0] && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium text-gray-900 truncate">
                {profile.github_data.top_repos[0].name}
              </div>
              {profile.github_data.top_repos[0].description && (
                <div className="text-gray-500 truncate">
                  {profile.github_data.top_repos[0].description}
                </div>
              )}
              <div className="flex items-center space-x-2 mt-1 text-gray-400">
                {profile.github_data.top_repos[0].language && (
                  <span>{profile.github_data.top_repos[0].language}</span>
                )}
                <span>★ {profile.github_data.top_repos[0].stars}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
