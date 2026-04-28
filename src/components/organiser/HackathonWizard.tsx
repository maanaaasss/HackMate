'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HackathonSchema } from '@/lib/validations'
import { toast } from 'sonner'
import { Loader2, X, Plus } from 'lucide-react'
import { z } from 'zod'

type HackathonFormData = z.input<typeof HackathonSchema>

type StaffMember = {
  id: string
  email: string
  full_name: string
  skills: string[]
  role: 'judge' | 'mentor'
}

export default function HackathonWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [judges, setJudges] = useState<StaffMember[]>([])
  const [mentors, setMentors] = useState<StaffMember[]>([])
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRole, setStaffRole] = useState<'judge' | 'mentor'>('judge')
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<HackathonFormData>({
    resolver: zodResolver(HackathonSchema),
    defaultValues: {
      name: '',
      description: '',
      venue: '',
      registration_deadline: '',
      start_time: '',
      end_time: '',
      submission_deadline: '',
      min_team_size: 1,
      max_team_size: 4,
      max_teams: undefined,
    },
  })

  const description = watch('description')
  const minTeamSize = watch('min_team_size')
  const maxTeamSize = watch('max_team_size')
  const maxTeams = watch('max_teams')

  useEffect(() => {
    // Ensure max_team_size >= min_team_size
    if (maxTeamSize < minTeamSize) {
      setValue('max_team_size', minTeamSize)
    }
  }, [minTeamSize, maxTeamSize, setValue])

  const nextStep = async () => {
    let fieldsToValidate: (keyof HackathonFormData)[] = []
    if (step === 1) {
      fieldsToValidate = ['name', 'description', 'venue']
    } else if (step === 2) {
      fieldsToValidate = ['registration_deadline', 'start_time', 'end_time', 'submission_deadline']
    } else if (step === 3) {
      fieldsToValidate = ['min_team_size', 'max_team_size', 'max_teams']
    }
    // Step 4 has no form fields to validate
    // Step 5 is review

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, 5))
    }
  }

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleAddStaff = async () => {
    if (!staffEmail.trim()) return

    setStaffLoading(true)
    setStaffError(null)

    try {
      const response = await fetch('/api/staff/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail, role: staffRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStaffError(data.error || 'Failed to lookup staff')
        return
      }

      if (!data.found) {
        setStaffError('No account found with this email. Ask them to sign up on Hackmate first.')
        return
      }

      if (data.profile.role !== staffRole) {
        setStaffError(`This user has role ${data.profile.role}, not ${staffRole}`)
        return
      }

      const staffMember: StaffMember = {
        id: data.profile.id,
        email: data.profile.email,
        full_name: data.profile.full_name,
        skills: data.profile.skills || [],
        role: staffRole,
      }

      if (staffRole === 'judge') {
        if (!judges.find((j) => j.id === staffMember.id)) {
          setJudges([...judges, staffMember])
        } else {
          setStaffError('This judge is already added.')
        }
      } else {
        if (!mentors.find((m) => m.id === staffMember.id)) {
          setMentors([...mentors, staffMember])
        } else {
          setStaffError('This mentor is already added.')
        }
      }

      setStaffEmail('')
    } catch (_error) {
      setStaffError('Network error. Please try again.')
    } finally {
      setStaffLoading(false)
    }
  }

  const removeStaff = (id: string, role: 'judge' | 'mentor') => {
    if (role === 'judge') {
      setJudges(judges.filter((j) => j.id !== id))
    } else {
      setMentors(mentors.filter((m) => m.id !== id))
    }
  }

  const onSubmit = async (data: HackathonFormData, status: 'draft' | 'registration_open') => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        status,
        judges: judges.map((j) => j.id),
        mentors: mentors.map((m) => m.id),
      }

      const response = await fetch('/api/hackathons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create hackathon')
      }

      const hackathon = await response.json()
      toast.success(`Hackathon ${status === 'draft' ? 'saved as draft' : 'published'}!`)
      router.push('/organiser')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create hackathon')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = handleSubmit((data) => {
    if (confirm('This will make the hackathon visible to all participants. Continue?')) {
      onSubmit(data, 'registration_open')
    }
  })

  const handleSaveDraft = handleSubmit((data) => onSubmit(data, 'draft'))

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Hackathon</h1>
            <p className="text-gray-600 mb-8">Set up your hackathon in 5 easy steps.</p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
                <span>Step {step} of 5</span>
                <span>
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Timeline'}
                  {step === 3 && 'Team Settings'}
                  {step === 4 && 'Assign Staff'}
                  {step === 5 && 'Review & Publish'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </div>

            <form className="space-y-6">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Hackathon Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      {...register('name')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., HackMate Launch Hackathon"
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
                      placeholder="Describe your hackathon, themes, goals, and what participants can expect..."
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
                      placeholder="e.g., Virtual (Zoom) or Building 10, MIT Campus"
                    />
                    {errors.venue && (
                      <p className="mt-1 text-sm text-red-600">{errors.venue.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Timeline */}
              {step === 2 && (
                <div className="space-y-6">
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

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-yellow-800">Timeline Rules</h4>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      <li>Registration deadline must be before start time</li>
                      <li>Start time must be before end time</li>
                      <li>Submission deadline must be before or at end time</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 3: Team Settings */}
              {step === 3 && (
                <div className="space-y-6">
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
              )}

              {/* Step 4: Assign Staff */}
              {step === 4 && (
                <div className="space-y-8">
                  {/* Add Judges Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add Judges</h3>
                    <div className="flex space-x-2 mb-4">
                      <input
                        type="email"
                        value={staffRole === 'judge' ? staffEmail : ''}
                        onChange={(e) => {
                          setStaffEmail(e.target.value)
                          setStaffRole('judge')
                        }}
                        placeholder="judge@example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddStaff}
                        disabled={staffLoading || staffRole !== 'judge'}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {staffLoading && staffRole === 'judge' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {judges.length > 0 ? (
                      <div className="space-y-2">
                        {judges.map((judge) => (
                          <div
                            key={judge.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{judge.full_name}</p>
                              <p className="text-sm text-gray-500">{judge.email}</p>
                              {judge.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {judge.skills.slice(0, 3).map((skill) => (
                                    <span
                                      key={skill}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {judge.skills.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{judge.skills.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStaff(judge.id, 'judge')}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No judges added yet.</p>
                    )}
                  </div>

                  {/* Add Mentors Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add Mentors</h3>
                    <div className="flex space-x-2 mb-4">
                      <input
                        type="email"
                        value={staffRole === 'mentor' ? staffEmail : ''}
                        onChange={(e) => {
                          setStaffEmail(e.target.value)
                          setStaffRole('mentor')
                        }}
                        placeholder="mentor@example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddStaff}
                        disabled={staffLoading || staffRole !== 'mentor'}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {staffLoading && staffRole === 'mentor' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {mentors.length > 0 ? (
                      <div className="space-y-2">
                        {mentors.map((mentor) => (
                          <div
                            key={mentor.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{mentor.full_name}</p>
                              <p className="text-sm text-gray-500">{mentor.email}</p>
                              {mentor.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {mentor.skills.slice(0, 3).map((skill) => (
                                    <span
                                      key={skill}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {mentor.skills.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{mentor.skills.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStaff(mentor.id, 'mentor')}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No mentors added yet.</p>
                    )}
                  </div>

                  {staffError && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{staffError}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Review & Publish */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Review Hackathon Details</h3>
                    
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{watch('name')}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Venue</dt>
                        <dd className="mt-1 text-sm text-gray-900">{watch('venue')}</dd>
                      </div>
                      
                      <div className="md:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {watch('description')}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Registration Deadline</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {watch('registration_deadline') ? new Date(watch('registration_deadline') as string).toLocaleString() : 'Not set'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Start Time</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {watch('start_time') ? new Date(watch('start_time') as string).toLocaleString() : 'Not set'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">End Time</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {watch('end_time') ? new Date(watch('end_time') as string).toLocaleString() : 'Not set'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Submission Deadline</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {watch('submission_deadline') ? new Date(watch('submission_deadline') as string).toLocaleString() : 'Not set'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Team Size</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {watch('min_team_size')} to {watch('max_team_size')} members
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Maximum Teams</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {watch('max_teams') || 'Unlimited'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Judges ({judges.length})</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {judges.map((j) => j.full_name).join(', ') || 'None'}
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Mentors ({mentors.length})</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {mentors.map((m) => m.full_name).join(', ') || 'None'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save as Draft'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Publish Now'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              {step < 5 && (
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={step === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Next
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}