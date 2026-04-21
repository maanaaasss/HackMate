import { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — Hackmate',
}

export default function LoginPage() {
  return <LoginForm />
}