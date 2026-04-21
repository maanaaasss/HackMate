/**
 * Environment variable validation.
 * Validates at runtime, not at build time.
 */

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  UPSTASH_REDIS_URL: string
  UPSTASH_REDIS_TOKEN: string
  CLOUDFLARE_R2_ACCOUNT_ID: string
  CLOUDFLARE_R2_ACCESS_KEY_ID: string
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string
  CLOUDFLARE_R2_BUCKET_NAME: string
  NEXT_PUBLIC_R2_PUBLIC_URL: string
  GITHUB_TOKEN: string
  RE_API_KEY?: string
  NEXT_PUBLIC_APP_URL: string
  JWT_SECRET: string
  NODE_ENV: string
}

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME',
  'NEXT_PUBLIC_R2_PUBLIC_URL',
  'GITHUB_TOKEN',
  'NEXT_PUBLIC_APP_URL',
  'JWT_SECRET',
]

let validated = false

function validateEnv(): void {
  if (validated) return
  
  const missing = REQUIRED_VARS.filter((key) => !process.env[key])
  
  if (missing.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n')
    console.error('Missing environment variables:\n')
    missing.forEach((key) => console.error(`  - ${key}`))
    console.error('\nPlease check your .env.local file.\n')
    
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
  
  validated = true
}

// Lazy proxy that validates on first access
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    // Skip validation during build
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      validateEnv()
    }
    return process.env[prop]
  },
})

export const isProduction = process.env.NODE_ENV === 'production'
export const isDevelopment = process.env.NODE_ENV === 'development'
