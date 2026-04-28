'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Hackathon {
  id: string
  name: string
  status: string
  min_team_size: number
  max_team_size: number
}

interface CreateTeamFormProps {
  hackathon: Hackathon | null
  availableHackathons: Hackathon[]
  userId: string
}

export default function CreateTeamForm({ hackathon, availableHackathons, userId }: CreateTeamFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedHackathonId, setSelectedHackathonId] = useState(hackathon?.id || '')
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')

  const selectedHackathon = availableHackathons.find(h => h.id === selectedHackathonId) || hackathon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedHackathonId) {
      toast.error('Please select a hackathon')
      return
    }

    if (!teamName.trim()) {
      toast.error('Please enter a team name')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          description: description.trim(),
          hackathon_id: selectedHackathonId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create team')
      }

      toast.success('Team created successfully!')
      router.push('/team')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
      <div className="space-y-6">
        {/* Hackathon Selection (if multiple available) */}
        {availableHackathons.length > 1 && (
          <div>
            <label htmlFor="hackathon" className="block text-sm font-medium text-gray-700">
              Select Hackathon *
            </label>
            <select
              id="hackathon"
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select a hackathon</option>
              {availableHackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedHackathon && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>{selectedHackathon.name}</strong>
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Team size: {selectedHackathon.min_team_size} to {selectedHackathon.max_team_size} members
            </p>
          </div>
        )}

        {/* Team Name */}
        <div>
          <label htmlFor="teamName" className="block text-sm font-medium text-gray-700">
            Team Name *
          </label>
          <input
            id="teamName"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your team name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Team Description (optional)
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Describe your team, project idea, or what you're looking for in teammates..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedHackathonId}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </span>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}