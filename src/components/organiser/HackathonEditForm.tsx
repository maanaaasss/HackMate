'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HackathonSchema } from '@/lib/validations'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

type HackathonFormData = z.input<typeof HackathonSchema>

interface HackathonEditFormProps {
  hackathon: {
    id: string
    name: string
    description: string
    venue: string
    status: string
    registration_deadline: string | null
    start_time: string | null
    end_time: string | null
    submission_deadline: string | null
    min_team_size: number
    max_team_size: number
    max_teams: number | null
    created_at: string
    updated_at: string
  }
}

export default function HackathonEditForm({ hackathon }: HackathonEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatDateTimeLocal = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16)
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HackathonFormData>({
    resolver: zodResolver(HackathonSchema),
    defaultValues: {
      name: hackathon.name,
      description: hackathon.description,
      venue: hackathon.venue,
      registration_deadline: formatDateTimeLocal(hackathon.registration_deadline),
      start_time: formatDateTimeLocal(hackathon.start_time),
      end_time: formatDateTimeLocal(hackathon.end_time),
      submission_deadline: formatDateTimeLocal(hackathon.submission_deadline),
      min_team_size: hackathon.min_team_size,
      max_team_size: hackathon.max_team_size,
      max_teams: hackathon.max_teams || undefined,
    },
  })

  const description = watch('description')
  const minTeamSize = watch('min_team_size')
  const maxTeamSize = watch('max_team_size')
  const maxTeams = watch('max_teams')

  // Ensure max_team_size >= min_team_size
  if (maxTeamSize < minTeamSize) {
    setValue('max_team_size', minTeamSize)
  }

  const onSubmit = async (data: HackathonFormData, status?: string) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        status: status || hackathon.status,
      }

      const response = await fetch(`/api/hackathons/${hackathon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update hackathon')
      }

      toast.success('Hackathon updated successfully!')
      router.push(`/organiser/${hackathon.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update hackathon')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = handleSubmit((data) => {
    if (confirm('This will make the hackathon visible to all participants. Continue?')) {
      onSubmit(data, 'registration_open')
    }
  })

  const handleSaveDraft = handleSubmit((data) => {
    if (confirm('Save these changes to your hackathon draft?')) {
      onSubmit(data, 'draft')
    }
  })

  const handleUpdate = handleSubmit((data) => {
    if (confirm('Update the hackathon with these changes? Participants will see the updated information.')) {
      onSubmit(data)
    }
  })

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-8">
        <form className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Hackathon Name *
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                id="description"
                rows={6}
                {...register('description')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="flex justify-between mt-1">
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {description?.length || 0}/2000
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
                Venue *
              </label>
              <input
                id="venue"
                type="text"
                {...register('venue')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.venue && (
                <p className="mt-1 text-sm text-red-600">{errors.venue.message}</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Timeline</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="registration_deadline" className="block text-sm font-medium text-gray-700">
                  Registration Deadline *
                </label>
                <input
                  id="registration_deadline"
                  type="datetime-local"
                  {...register('registration_deadline')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.registration_deadline && (
                  <p className="mt-1 text-sm text-red-600">{errors.registration_deadline.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                  Start Time *
                </label>
                <input
                  id="start_time"
                  type="datetime-local"
                  {...register('start_time')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                  End Time *
                </label>
                <input
                  id="end_time"
                  type="datetime-local"
                  {...register('end_time')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="submission_deadline" className="block text-sm font-medium text-gray-700">
                  Submission Deadline *
                </label>
                <input
                  id="submission_deadline"
                  type="datetime-local"
                  {...register('submission_deadline')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.submission_deadline && (
                  <p className="mt-1 text-sm text-red-600">{errors.submission_deadline.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Team Settings */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Team Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="min_team_size" className="block text-sm font-medium text-gray-700">
                  Minimum Team Size *
                </label>
                <select
                  id="min_team_size"
                  {...register('min_team_size', { valueAsNumber: true })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {[1, 2, 3, 4].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors.min_team_size && (
                  <p className="mt-1 text-sm text-red-600">{errors.min_team_size.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="max_team_size" className="block text-sm font-medium text-gray-700">
                  Maximum Team Size *
                </label>
                <select
                  id="max_team_size"
                  {...register('max_team_size', { valueAsNumber: true })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors.max_team_size && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_team_size.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="max_teams" className="block text-sm font-medium text-gray-700">
                  Maximum Teams (optional)
                </label>
                <input
                  id="max_teams"
                  type="number"
                  min={1}
                  {...register('max_teams', { valueAsNumber: true })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Unlimited"
                />
                {errors.max_teams && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_teams.message}</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800">Team Settings Preview</h4>
              <p className="mt-2 text-sm text-blue-700">
                Teams of {minTeamSize} to {maxTeamSize} members,{' '}
                {maxTeams ? `${maxTeams} teams allowed` : 'unlimited teams allowed'}
              </p>
            </div>
          </div>

          {/* Current Status */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Current Status</h2>
            <div className="bg-gray-50 rounded-md p-4">
              <p className="text-sm text-gray-700">
                <strong>Status:</strong>{' '}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {hackathon.status.replace('_', ' ').toUpperCase()}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date(hackathon.updated_at || hackathon.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {hackathon.status === 'draft' ? (
                <span>Draft - Not visible to participants yet</span>
              ) : hackathon.status === 'registration_open' ? (
                <span className="text-green-600">Published - Visible to participants</span>
              ) : (
                <span className="text-blue-600">Status: {hackathon.status.replace('_', ' ').toUpperCase()}</span>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              {hackathon.status === 'draft' && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Draft'
                  )}
                </button>
              )}
              
              {hackathon.status === 'draft' && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Publish Hackathon'
                  )}
                </button>
              )}
              
              {hackathon.status !== 'draft' && (
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm & Save Changes'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}