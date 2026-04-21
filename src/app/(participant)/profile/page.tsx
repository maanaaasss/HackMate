import { Suspense } from 'react'
import ProfileSetupForm from '@/components/participant/ProfileSetupForm'

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileSetupForm />
    </Suspense>
  )
}