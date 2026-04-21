# Hackmate Deployment Guide

Step-by-step guide for deploying Hackmate to Vercel.

## 1. Prerequisites

Before deploying, you need accounts for:

- [Supabase](https://supabase.com) - Database + Auth
- [Upstash](https://upstash.com) - Redis cache
- [Cloudflare](https://cloudflare.com) - R2 object storage
- [GitHub](https://github.com) - OAuth + source control
- [Vercel](https://vercel.com) - Hosting

## 2. Supabase Setup

### 2.1 Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Enter project name, database password, select region
4. Wait for project to be ready (~2 minutes)

### 2.2 Run Migrations

Run the migration scripts in order via Supabase SQL Editor:

1. Go to SQL Editor > New Query
2. Copy contents of `001_initial_schema.sql`
3. Click "Run"
4. Repeat for `002_rls_policies.sql`
5. Repeat for `003_functions_triggers.sql`

### 2.3 Create Auth Trigger

Run the auth trigger script to auto-create profiles on signup:

1. Go to SQL Editor > New Query
2. Copy contents of `scripts/create-auth-trigger.sql`
3. Click "Run"

### 2.4 Configure Auth

1. Go to Authentication > Providers
2. Enable "GitHub" provider
3. Note: You'll add Client ID and Secret after creating GitHub OAuth app

### 2.5 Get API Keys

1. Go to Settings > API
2. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 3. GitHub OAuth App

### 3.1 Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: `Hackmate`
   - Homepage URL: `https://your-app.vercel.app` (use Vercel URL after deploy, update later)
   - Authorization callback URL: `https://your-app.vercel.app/auth/callback`
4. Click "Register application"
5. Note the `Client ID`

### 3.2 Get Client Secret

1. On the OAuth App page, click "Generate a new client secret"
2. Copy the secret → `GITHUB_CLIENT_SECRET`

### 3.3 Configure Supabase

1. Go to Supabase Dashboard > Authentication > Providers > GitHub
2. Enter Client ID and Client Secret
3. Click Save

## 4. Cloudflare R2

### 4.1 Create Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Click "Create bucket"
4. Name: `hackmate-assets`
5. Location: Automatic
6. Click "Create"

### 4.2 Enable Public Access

1. Click on the bucket
2. Go to Settings tab
3. Under "Public access", click "Allow Access"
4. Note the public URL (e.g., `https://pub-xxx.r2.dev`)

### 4.3 Create API Token

1. Go to R2 > Manage R2 API Tokens
2. Click "Create API Token"
3. Name: `hackmate-deploy`
4. Permissions: Object Read & Write
5. Specify bucket: `hackmate-assets`
6. Click "Create API Token"
7. Copy:
   - Access Key ID → `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - Secret Access Key → `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
8. Note your Account ID from the R2 overview page → `CLOUDFLARE_R2_ACCOUNT_ID`

## 5. Upstash Redis

### 5.1 Create Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Name: `hackmate-cache`
4. Region: Select same region as Vercel (recommend `us-east-1`)
5. Type: Regional
6. Click "Create"

### 5.2 Get Credentials

1. On the database page, copy:
   - Endpoint → part of `UPSTASH_REDIS_URL`
   - Password → `UPSTASH_REDIS_TOKEN`
2. Construct full URL: `rediss://default:PASSWORD@ENDPOINT:6380`

## 6. Vercel Deploy

### 6.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/hackmate.git
git push -u origin main
```

### 6.2 Import in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Framework Preset: Next.js (auto-detected)
5. Do NOT deploy yet - add env vars first

### 6.3 Add Environment Variables

1. In the import screen, expand "Environment Variables"
2. Add all variables from `.env.production.example`
3. For each variable:
   - Name: variable name
   - Value: your actual value
   - Environments: Check all (Production, Preview, Development)

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
NEXT_PUBLIC_R2_PUBLIC_URL
GITHUB_CLIENT_SECRET
GITHUB_TOKEN
JWT_SECRET
NEXT_PUBLIC_APP_URL
```

Optional:
```
RE_API_KEY (only if sending certificate emails)
```

### 6.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Note your Vercel URL (e.g., `https://hackmate-xxx.vercel.app`)

### 6.5 Update URLs

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
3. Update GitHub OAuth App callback URL with actual Vercel URL
4. Redeploy: Deployments tab > click "..." on latest > Redeploy

## 7. Post-Deploy Verification

### 7.1 Test Auth Flow

1. Visit `https://your-app.vercel.app/login`
2. Click "Sign in with GitHub"
3. Authorize the app
4. Should redirect to role selection

### 7.2 Create First Organiser

1. Sign up with GitHub
2. Select "Organise Hackathons" role
3. Complete profile setup
4. You should see organiser dashboard

## 8. First Hackathon

1. Login as organiser
2. Go to `/organiser/setup`
3. Fill in hackathon details:
   - Name, description, dates
   - Team size limits
   - Add judges and mentors by email
4. Click "Create Hackathon"
5. Hackathon is now live for registration

## Troubleshooting

### Build fails with "Missing environment variables"

Check all required env vars are set in Vercel Dashboard > Settings > Environment Variables.

### Auth callback fails

Ensure GitHub OAuth App callback URL matches exactly: `https://your-app.vercel.app/auth/callback`

### Images not loading

Check `NEXT_PUBLIC_R2_PUBLIC_URL` is correct and bucket has public access enabled.

### Redis connection errors

Ensure `UPSTASH_REDIS_URL` uses `rediss://` (with double 's') for TLS.

### Certificate generation times out

On Vercel Hobby plan, max duration is 60s. Certificates generate in batches of 10.
Upgrade to Vercel Pro for 300s timeout.

## Vercel Hobby vs Pro

| Feature | Hobby (Free) | Pro ($20/mo) |
|---------|--------------|--------------|
| Max function duration | 60s | 300s |
| Cron jobs | 2 jobs | Unlimited |
| Team members | 1 | Unlimited |
| Analytics | Basic | Advanced |

**Certificate generation:** On Hobby, certificates generate in batches of 10 per invocation. On Pro, all certificates generate in one call.
