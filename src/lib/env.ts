import { z } from 'zod'

/**
 * Environment variable validation schema.
 * All server-side env vars are validated on startup.
 * Missing variables will crash the app with a clear error message.
 */

const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Upstash Redis (required)
  UPSTASH_REDIS_URL: z.string().min(1, 'UPSTASH_REDIS_URL is required'),
  UPSTASH_REDIS_TOKEN: z.string().min(1, 'UPSTASH_REDIS_TOKEN is required'),

  // Cloudflare R2 (required)
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_R2_ACCOUNT_ID is required'),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1, 'CLOUDFLARE_R2_ACCESS_KEY_ID is required'),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1, 'CLOUDFLARE_R2_SECRET_ACCESS_KEY is required'),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1, 'CLOUDFLARE_R2_BUCKET_NAME is required'),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url('NEXT_PUBLIC_R2_PUBLIC_URL must be a valid URL'),

  // GitHub API (required for GitHub integration)
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),

  // Email (optional - only needed for certificate emails)
  RE_API_KEY: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // JWT (required for QR codes)
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Type export for use in other files
export type Env = z.infer<typeof envSchema>

// Validate and export env object
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
      const missingVars = issues.map((i) => i.path.join('.')).join(', ')
      const errorMessages = issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
      
      console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n')
      console.error('Missing or invalid environment variables:\n')
      console.error(errorMessages)
      console.error('\nPlease check your .env.local file and ensure all required variables are set.')
      console.error('See .env.example for reference.\n')
      
      throw new Error(`Missing environment variables: ${missingVars}`)
    }
    throw error
  }
}

// Export validated env object
// This will crash on import if validation fails
export const env = validateEnv()

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production'

// Helper to check if we're in development
export const isDevelopment = env.NODE_ENV === 'development'
