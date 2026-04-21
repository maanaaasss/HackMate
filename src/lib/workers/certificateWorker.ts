/**
 * Certificate Worker - Standalone script that runs separately from Next.js
 * 
 * This worker processes certificate generation jobs from BullMQ queue.
 * Run with: npx ts-node --esm src/lib/workers/certificateWorker.ts
 * Or compile and run with: node dist/workers/certificateWorker.js
 */

import { Worker, Job } from 'bullmq'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { createClient } from '@supabase/supabase-js'
import { uploadToR2 } from '../r2'
import { format } from 'date-fns'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const REDIS_URL = process.env.UPSTASH_REDIS_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN!

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Redis connection config
const redisConfig = {
  host: REDIS_URL.replace('https://', '').replace('http://', '').split(':')[0],
  port: parseInt(REDIS_URL.split(':')[2] || '6379'),
  password: REDIS_TOKEN,
  tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
}

// Certificate job data type
type CertificateJobData = {
  certificate_id: string
  user_id: string
  hackathon_id: string
  team_id: string
  rank: number
  type: 'winner' | 'runner_up' | 'participant'
}

// Generate certificate HTML
function generateCertificateHTML(data: {
  participantName: string
  college: string
  teamName: string
  hackathonName: string
  certificateType: 'winner' | 'runner_up' | 'participant'
  rank?: number
  certificateId: string
  issuedDate: string
}): string {
  const { participantName, college, teamName, hackathonName, certificateType, certificateId, issuedDate } = data

  let achievementText = 'Certificate of Participation'
  let badgeHTML = ''
  
  if (certificateType === 'winner') {
    achievementText = 'Certificate of Achievement'
    badgeHTML = `
      <div style="
        margin-top: 20px;
        padding: 10px 30px;
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        border-radius: 8px;
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #1E3A5F;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      ">
        🏆 1st Place Winner
      </div>
    `
  } else if (certificateType === 'runner_up') {
    achievementText = 'Certificate of Achievement'
    badgeHTML = `
      <div style="
        margin-top: 20px;
        padding: 10px 30px;
        background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
        border-radius: 8px;
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #1E3A5F;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      ">
        🥈 2nd Place
      </div>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif;">
      <div style="
        width: 1123px;
        height: 794px;
        background: white;
        position: relative;
        box-sizing: border-box;
        padding: 40px;
      ">
        <!-- Outer Border -->
        <div style="
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 4px solid #1E3A5F;
          pointer-events: none;
        "></div>
        
        <!-- Inner Border -->
        <div style="
          position: absolute;
          top: 32px;
          left: 32px;
          right: 32px;
          bottom: 32px;
          border: 2px solid #2E86C1;
          pointer-events: none;
        "></div>
        
        <!-- Content Container -->
        <div style="
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          box-sizing: border-box;
        ">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="
              font-family: 'Playfair Display', serif;
              font-size: 28px;
              font-weight: bold;
              color: #1E3A5F;
              letter-spacing: 2px;
              margin-bottom: 10px;
            ">
              HACKMATE
            </div>
            <div style="
              font-size: 18px;
              color: #1E3A5F;
              font-weight: 500;
            ">
              ${achievementText}
            </div>
          </div>
          
          <!-- Main Content -->
          <div style="text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div style="
              font-size: 14px;
              color: #666;
              margin-bottom: 20px;
            ">
              This certifies that
            </div>
            
            <div style="
              font-family: 'Playfair Display', serif;
              font-size: 42px;
              font-weight: bold;
              font-style: italic;
              color: #1E3A5F;
              margin-bottom: 15px;
            ">
              ${participantName}
            </div>
            
            <div style="
              font-size: 16px;
              color: #333;
              margin-bottom: 8px;
            ">
              from <strong>${college}</strong>
            </div>
            
            <div style="
              font-size: 16px;
              color: #333;
              margin-bottom: 8px;
            ">
              represented team <strong>${teamName}</strong>
            </div>
            
            <div style="
              font-size: 16px;
              color: #333;
              margin-bottom: 20px;
            ">
              at <strong>${hackathonName}</strong>
            </div>
            
            ${badgeHTML}
          </div>
          
          <!-- Footer -->
          <div style="
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto;
          ">
            <div style="
              font-size: 12px;
              color: #888;
            ">
              Issued: ${issuedDate}
            </div>
            
            <div style="
              text-align: center;
            ">
              <div style="
                width: 200px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
              "></div>
              <div style="
                font-size: 14px;
                color: #333;
              ">
                Organiser
              </div>
            </div>
            
            <div style="
              font-size: 10px;
              color: #999;
              max-width: 150px;
              text-align: right;
            ">
              Certificate ID: ${certificateId.substring(0, 8)}...
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// Process certificate job
async function processCertificateJob(job: Job<CertificateJobData>) {
  const { certificate_id, user_id, hackathon_id, team_id, type, rank } = job.data

  console.log(`Processing certificate ${certificate_id} for user ${user_id}`)

  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, college')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      throw new Error(`User profile not found: ${user_id}`)
    }

    // Fetch hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('name, end_time')
      .eq('id', hackathon_id)
      .single()

    if (hackathonError || !hackathon) {
      throw new Error(`Hackathon not found: ${hackathon_id}`)
    }

    // Fetch team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', team_id)
      .single()

    if (teamError || !team) {
      throw new Error(`Team not found: ${team_id}`)
    }

    // Generate HTML
    const html = generateCertificateHTML({
      participantName: profile.full_name,
      college: profile.college || 'Unknown College',
      teamName: team.name,
      hackathonName: hackathon.name,
      certificateType: type,
      rank,
      certificateId: certificate_id,
      issuedDate: format(new Date(), 'MMMM d, yyyy'),
    })

    // Launch Chromium
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: true,
    })

    // Create page and set content
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    })

    // Close browser
    await browser.close()

    // Upload to R2
    const r2Key = `certs/${hackathon_id}/${user_id}.pdf`
    const pdfUrl = await uploadToR2(r2Key, Buffer.from(pdfBuffer), 'application/pdf')

    // Update certificate record
    const { error: updateError } = await supabase
      .from('certificates')
      .update({ pdf_url: pdfUrl })
      .eq('id', certificate_id)

    if (updateError) {
      throw new Error(`Failed to update certificate: ${updateError.message}`)
    }

    console.log(`Certificate ${certificate_id} generated successfully: ${pdfUrl}`)
    return { success: true, pdfUrl }
  } catch (error) {
    console.error(`Error processing certificate ${certificate_id}:`, error)
    throw error
  }
}

// Create and start worker
const worker = new Worker<CertificateJobData>(
  'certificates',
  async (job) => {
    return await processCertificateJob(job)
  },
  {
    connection: redisConfig,
    concurrency: 2, // Process 2 certificates at a time
  }
)

// Event handlers
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message)
})

worker.on('error', (error) => {
  console.error('Worker error:', error)
})

console.log('Certificate worker started. Waiting for jobs...')

// Keep the process running
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing worker...')
  await worker.close()
  process.exit(0)
})
