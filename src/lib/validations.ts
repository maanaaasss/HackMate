import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
})

export type User = z.infer<typeof userSchema>

export const CreateTeamSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Team name can only contain alphanumeric characters and spaces'),
  description: z.string()
    .max(300, 'Description must be at most 300 characters')
    .optional(),
})

export const SubmissionSchema = z.object({
  github_url: z.string()
    .regex(/^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/, 'Must be a valid GitHub repository URL'),
  live_url: z.string()
    .url('Must be a valid URL')
    .or(z.literal('')),
  description: z.string()
    .min(100, 'Description must be at least 100 characters')
    .max(1000, 'Description must be at most 1000 characters'),
})

export const ScoreSchema = z.object({
  value: z.number()
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100'),
  notes: z.string()
    .max(1000, 'Notes must be at most 1000 characters')
    .optional(),
})

export const AnnouncementSchema = z.object({
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must be at most 100 characters'),
  message: z.string()
    .min(2, 'Message must be at least 2 characters')
    .max(2000, 'Message must be at most 2000 characters'),
  channel: z.enum(['website', 'discord', 'all']),
})

export const JoinRequestSchema = z.object({
  message: z.string()
    .min(20, 'Message must be at least 20 characters')
    .max(500, 'Message must be at most 500 characters'),
})

export const ProfileSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name must be at most 80 characters'),
  college: z.string()
    .min(2, 'College must be at least 2 characters')
    .max(100, 'College must be at most 100 characters'),
  year_of_study: z.number()
    .int()
    .min(1, 'Year of study must be at least 1')
    .max(6, 'Year of study must be at most 6'),
  bio: z.string()
    .max(300, 'Bio must be at most 300 characters')
    .optional(),
  skills: z.array(z.string()).max(15, 'Maximum 15 skills allowed'),
  github_username: z.string()
    .regex(/^[a-zA-Z0-9-]*$/, 'GitHub username can only contain alphanumeric characters and hyphens')
    .optional(),
  sponsor_visible: z.boolean(),
})

export const HackathonSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  venue: z.string()
    .min(2, 'Venue must be at least 2 characters')
    .max(200, 'Venue must be at most 200 characters'),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  registration_deadline: z.coerce.date(),
  submission_deadline: z.coerce.date(),
  min_team_size: z.number()
    .int()
    .min(1, 'Minimum team size must be at least 1')
    .max(4, 'Minimum team size must be at most 4'),
  max_team_size: z.number()
    .int()
    .min(1, 'Maximum team size must be at least 1')
    .max(8, 'Maximum team size must be at most 8'),
  max_teams: z.number()
    .int()
    .min(1, 'Maximum teams must be at least 1')
    .optional(),
}).refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
).refine(
  (data) => data.registration_deadline < data.start_time,
  {
    message: 'Registration deadline must be before start time',
    path: ['registration_deadline'],
  }
).refine(
  (data) => data.submission_deadline <= data.end_time,
  {
    message: 'Submission deadline must be before or at end time',
    path: ['submission_deadline'],
  }
).refine(
  (data) => data.max_team_size >= data.min_team_size,
  {
    message: 'Maximum team size must be greater than or equal to minimum team size',
    path: ['max_team_size'],
  }
)