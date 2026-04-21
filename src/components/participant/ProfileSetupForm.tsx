'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProfileSchema } from '@/lib/validations'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@/stores/authStore'
import { toast } from 'sonner'
import { Loader2, X, Users, Trophy } from 'lucide-react'

type ProfileFormData = {
  full_name: string
  college: string
  year_of_study: number
  bio?: string
  skills: string[]
  github_username?: string
  sponsor_visible: boolean
}

type Role = 'participant' | 'organiser'

const skillSuggestions = [
  'React', 'Next.js', 'Node.js', 'Python', 'ML/AI', 'UI/UX Design',
  'Flutter', 'Firebase', 'AWS', 'Figma', 'Vue', 'Django', 'Blockchain', 'DevOps'
]

function TagInput({
  value,
  onChange,
  maxTags = 15,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
}) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/,$/, '')
    if (trimmed && !value.includes(trimmed) && value.length < maxTags) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }

  const removeTag = (index: number) => {
    const newTags = [...value]
    newTags.splice(index, 1)
    onChange(newTags)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[42px]">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Type a skill and press Enter' : ''}
          className="flex-1 min-w-[120px] outline-none text-sm"
          disabled={value.length >= maxTags}
        />
      </div>
      {value.length >= maxTags && (
        <p className="text-xs text-gray-500">Maximum {maxTags} skills reached</p>
      )}
      <div className="flex flex-wrap gap-1">
        {skillSuggestions
          .filter((s) => !value.includes(s))
          .slice(0, 8)
          .map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            >
              + {suggestion}
            </button>
          ))}
      </div>
    </div>
  )
}

export default function ProfileSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useUser()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const [step, setStep] = useState(isOnboarding ? 0 : 1) // Step 0 is role selection for onboarding
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      full_name: '',
      college: '',
      year_of_study: 1,
      bio: '',
      skills: [],
      github_username: '',
      sponsor_visible: false,
    },
  })

  const skills = watch('skills')
  const bio = watch('bio')

  useEffect(() => {
    if (user) {
      // If user already has profile data, pre-fill form
      setValue('full_name', user.full_name || '')
      setValue('college', user.college || '')
      setValue('year_of_study', user.year_of_study || 1)
      setValue('bio', user.bio || '')
      setValue('skills', user.skills || [])
      setValue('github_username', user.github_username || '')
      setValue('sponsor_visible', user.sponsor_visible || false)
      // Check if user already has a role
      if (user.role) {
        setSelectedRole(user.role as Role)
      }
    }
  }, [user, setValue])

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    setStep(1)
  }

  const nextStep = async () => {
    let fieldsToValidate: (keyof ProfileFormData)[] = []
    if (step === 1) {
      fieldsToValidate = ['full_name', 'college', 'year_of_study', 'bio']
    } else if (step === 2) {
      fieldsToValidate = ['skills']
    } else if (step === 3) {
      fieldsToValidate = ['github_username', 'sponsor_visible']
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const prevStep = () => {
    // If onboarding and at step 1, go back to role selection
    if (isOnboarding && step === 1) {
      setStep(0)
    } else {
      setStep((prev) => Math.max(prev - 1, 1))
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const profileData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      }

      // Include role if selected during onboarding
      if (isOnboarding && selectedRole) {
        profileData.role = selectedRole
      }

      // Update profile (profile already exists, created by auth trigger)
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)

      if (error) throw error

      // Set role cookie if onboarding
      if (isOnboarding && selectedRole) {
        document.cookie = `hackmate-role=${selectedRole}; path=/; max-age=3600; samesite=lax${process.env.NODE_ENV === 'production' ? '; secure' : ''}`
      }

      if (isOnboarding) {
        toast.success('Welcome to Hackmate!')
        setTimeout(() => {
          if (selectedRole === 'organiser') {
            router.push('/organiser')
          } else {
            router.push('/dashboard')
          }
        }, 1500)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('Failed to save profile')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalSteps = isOnboarding ? 4 : 3 // Include role selection for onboarding
  const currentStep = isOnboarding ? step + 1 : step

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isOnboarding ? 'Complete your profile' : 'Edit profile'}
            </h1>
            <p className="text-gray-600 mb-8">
              {isOnboarding
                ? 'Set up your profile to get started with Hackmate.'
                : 'Update your profile information.'}
            </p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>
                  {step === 0 ? 'Choose Role' : step === 1 ? 'Basic Info' : step === 2 ? 'Skills' : 'GitHub'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 0: Role Selection (onboarding only) */}
              {step === 0 && isOnboarding && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">How do you want to use Hackmate?</h2>
                    <p className="text-sm text-gray-600">Choose your primary role</p>
                  </div>

                  {/* Participant Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectRole('participant')}
                    className={`w-full p-6 border-2 rounded-lg text-left transition-all hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      selectedRole === 'participant' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Join as Participant
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Join hackathons, form teams, build projects, and compete for prizes.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Organiser Option */}
                  <button
                    type="button"
                    onClick={() => handleSelectRole('organiser')}
                    className={`w-full p-6 border-2 rounded-lg text-left transition-all hover:border-purple-500 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                      selectedRole === 'organiser' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Organise Hackathons
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Create and manage hackathons, judge submissions, and sponsor events.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      {...register('full_name')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="college" className="block text-sm font-medium text-gray-700">
                      College / University *
                    </label>
                    <input
                      id="college"
                      type="text"
                      {...register('college')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.college && (
                      <p className="mt-1 text-sm text-red-600">{errors.college.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="year_of_study" className="block text-sm font-medium text-gray-700">
                      Year of Study *
                    </label>
                    <select
                      id="year_of_study"
                      {...register('year_of_study', { valueAsNumber: true })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6].map((year) => (
                        <option key={year} value={year}>
                          {year}
                          {year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                        </option>
                      ))}
                    </select>
                    {errors.year_of_study && (
                      <p className="mt-1 text-sm text-red-600">{errors.year_of_study.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                      Bio (optional)
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      {...register('bio')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Tell us about yourself..."
                    />
                    <div className="flex justify-between mt-1">
                      {errors.bio && (
                        <p className="text-sm text-red-600">{errors.bio.message}</p>
                      )}
                      <p className="text-sm text-gray-500 ml-auto">
                        {bio?.length || 0}/300
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Skills */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Skills
                    </label>
                    <p className="text-sm text-gray-500 mb-4">
                      Add skills that describe your expertise. This helps teams find you.
                    </p>
                    <TagInput
                      value={skills || []}
                      onChange={(newSkills) => setValue('skills', newSkills)}
                      maxTags={15}
                    />
                    {errors.skills && (
                      <p className="mt-1 text-sm text-red-600">{errors.skills.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: GitHub */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="github_username" className="block text-sm font-medium text-gray-700">
                      GitHub Username (optional)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        id="github_username"
                        type="text"
                        {...register('github_username')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="octocat"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const username = watch('github_username')
                          if (username) {
                            window.open(`https://github.com/${username}`, '_blank')
                          }
                        }}
                        className="mt-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Verify on GitHub
                      </button>
                    </div>
                    {errors.github_username && (
                      <p className="mt-1 text-sm text-red-600">{errors.github_username.message}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sponsor_visible"
                          type="checkbox"
                          {...register('sponsor_visible')}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sponsor_visible" className="font-medium text-gray-700">
                          Allow sponsors to view my profile for recruiting opportunities
                        </label>
                        <p className="text-gray-500">You can change this at any time in your profile.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons - hide for role selection step */}
              {step !== 0 && (
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={step === 1 && !isOnboarding}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save Profile'
                      )}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}