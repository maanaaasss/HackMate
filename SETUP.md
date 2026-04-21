# Hackmate Setup Guide

Complete setup guide for running Hackmate locally.

## 1. Prerequisites

Install these first:

- [Node.js 20+](https://nodejs.org) (check: `node --version`)
- [npm 10+](https://npmjs.com) (check: `npm --version`)
- [Git](https://git-scm.com) (check: `git --version`)

Free accounts needed:

| Service | Purpose | Sign up |
|---------|---------|---------|
| [Supabase](https://supabase.com) | Database + Auth | supabase.com/dashboard |
| [Upstash](https://upstash.com) | Redis cache | console.upstash.com |
| [Cloudflare](https://cloudflare.com) | R2 file storage | dash.cloudflare.com |
| [GitHub](https://github.com) | OAuth login | github.com |

## 2. Clone & Install

```bash
# Clone the repo
git clone https://github.com/yourusername/hackmate.git
cd hackmate

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local
```

## 3. Supabase Setup

### 3.1 Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - Organization: (create one if needed)
   - Name: `hackmate`
   - Database password: (generate a strong password, save it)
   - Region: Choose closest to you
4. Click **Create new project**
5. Wait 2-3 minutes for setup

### 3.2 Get API Keys

1. Go to **Settings** → **API**
2. Copy these values to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.3 Run Database Migrations

Go to **SQL Editor** → **New Query** and run each migration in order:

**Migration 1: Initial Schema**
```sql
-- Paste contents of: 001_initial_schema.sql
```

**Migration 2: RLS Policies**
```sql
-- Paste contents of: 002_rls_policies.sql
```

**Migration 3: Functions & Triggers**
```sql
-- Paste contents of: 003_functions_triggers.sql
```

**Auth Trigger: Auto-create profiles**
```sql
-- Paste contents of: scripts/create-auth-trigger.sql
```

### 3.4 Enable Auth Providers

Go to **Authentication** → **Providers**

#### Email (Magic Links)

1. Find **Email** provider
2. Enable it (should be on by default)
3. Settings:
   - Confirm email: OFF (for easier testing)
   - Secure email change: ON
   - Double confirm email changes: OFF

#### GitHub OAuth

1. Find **GitHub** provider
2. Toggle to enable
3. You'll add Client ID and Secret later (after creating GitHub OAuth app)

### 3.5 Configure Site URL

Go to **Authentication** → **URL Configuration**

- Site URL: `http://localhost:3000`
- Additional redirect URLs: `http://localhost:3000/*`

## 4. Upstash Redis Setup

### 4.1 Create Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click **Create Database**
3. Fill in:
   - Name: `hackmate-cache`
   - Region: `us-east-1` (recommended for Vercel later)
   - Type: Regional
4. Click **Create**

### 4.2 Get Credentials

1. On the database page, copy:

```
UPSTASH_REDIS_URL=rediss://default:PASSWORD@ENDPOINT.upstash.io:6380
UPSTASH_REDIS_TOKEN=your-token-here
```

Add both to `.env.local`.

## 5. Cloudflare R2 Setup

### 5.1 Create Account & Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Fill in:
   - Bucket name: `hackmate-assets`
   - Location: Automatic
5. Click **Create**

### 5.2 Enable Public Access

1. Click on your bucket
2. Go to **Settings** tab
3. Under **Public access**, click **Allow Access**
4. Note your public URL: `https://pub-xxxxx.r2.dev`

Add to `.env.local`:
```
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### 5.3 Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Fill in:
   - Token name: `hackmate-local`
   - Permissions: **Object Read & Write**
   - Specify bucket: `hackmate-assets`
4. Click **Create API Token**
5. Copy all three values:

```
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=hackmate-assets
```

Add all to `.env.local`.

## 6. GitHub OAuth Setup

### 6.1 Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: `Hackmate (Local)`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/callback`
4. Click **Register application**

### 6.2 Get Client Secret

1. On your OAuth App page, click **Generate a new client secret**
2. Copy the Client ID and Client Secret:

```
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 6.3 Configure Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers** → **GitHub**
2. Enter:
   - Client ID: (from GitHub)
   - Client Secret: (from GitHub)
3. Click **Save**

### 6.4 Create GitHub Personal Access Token

For commit activity monitoring:

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Fill in:
   - Note: `hackmate-dev`
   - Expiration: No expiration
   - Scopes: `public_repo`
4. Click **Generate token**
5. Copy the token:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Add to `.env.local`.

## 7. JWT Secret

Generate a random secret for QR code signing:

```bash
# Generate random secret
openssl rand -base64 32
```

Add to `.env.local`:
```
JWT_SECRET=your-generated-secret-here
```

## 8. Complete .env.local

Your `.env.local` should look like this:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Upstash Redis
UPSTASH_REDIS_URL=rediss://default:PASSWORD@ENDPOINT.upstash.io:6380
UPSTASH_REDIS_TOKEN=your-token-here

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=hackmate-assets
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# GitHub
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT
JWT_SECRET=your-generated-secret-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (optional, for Resend)
# RE_API_KEY=re_xxxxxxxxxxxx
```

## 9. Run the Project

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 10. Create First User

### 10.1 Sign Up

1. Go to `http://localhost:3000/login`
2. Choose sign-in method:
   - **Magic Link**: Enter email, check inbox for link
   - **GitHub**: Authorize the app
3. Complete profile setup (name, college, skills)

### 10.2 Make User an Organiser

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Table Editor** → **profiles**
3. Find your user row
4. Change `role` from `participant` to `organiser`
5. Click **Save**

Refresh the app - you should now see the organiser dashboard.

## 11. Create First Hackathon

1. Login as organiser
2. Go to `/organiser/setup`
3. Fill in hackathon details:
   - Name, description
   - Start/end dates
   - Team size limits
   - Max teams
4. Add rubric items for judging
5. Click **Create Hackathon**

## 12. Test Features

### As Participant
- Browse hackathons at `/dashboard`
- Create or join a team
- Submit project
- Raise hand for mentor help

### As Organiser
- Send announcements
- Manage teams
- Control judging rounds
- Scan QR codes for check-in

### As Judge
- Login and go to `/judge`
- Score teams using rubric
- Seal scores when done

### As Mentor
- Login and go to `/mentor`
- View help queue
- Claim and resolve tickets

## 13. Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Quality
npm run type-check       # TypeScript check
npm run lint             # ESLint check

# Database (via Supabase Dashboard SQL Editor)
# Reset: Run the reset script in 001_initial_schema.sql
```

## 14. Troubleshooting

### "Invalid API key" error
Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct in `.env.local`.

### GitHub OAuth fails
- Verify callback URL matches exactly: `http://localhost:3000/auth/callback`
- Check Client ID and Secret in Supabase match GitHub OAuth App

### Images not loading
Check `NEXT_PUBLIC_R2_PUBLIC_URL` and ensure bucket has public access.

### Redis connection error
Ensure `UPSTASH_REDIS_URL` starts with `rediss://` (double 's' for TLS).

### Type errors after pulling changes
```bash
npm install  # Reinstall dependencies
```

### Database errors
Re-run migrations in Supabase SQL Editor in order.

## 15. Next Steps

1. **Customize**: Edit theme in `tailwind.config.ts`
2. **Add features**: Check `src/components/` for existing patterns
3. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel
4. **Monitor**: Set up [Sentry](https://sentry.io) for error tracking
