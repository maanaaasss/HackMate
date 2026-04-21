'use client'

import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type RedemptionStatus = {
  lunch_day1: boolean
  lunch_day2: boolean
  swag: boolean
  dinner: boolean
}

export default function QRCodeDisplay({
  userId,
  hackathonId,
  hackathonName,
  profile,
  isCheckedIn,
  redemptionStatus: initialRedemptionStatus,
}: {
  userId: string
  hackathonId: string
  hackathonName: string
  profile: { full_name: string; college?: string }
  isCheckedIn: boolean
  redemptionStatus: RedemptionStatus
}) {
  const queryClient = useQueryClient()

  // Generate QR code
  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['qr-code', userId, hackathonId],
    queryFn: async () => {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to generate QR code')
      return response.json() as Promise<{ url: string }>
    },
  })

  // Regenerate QR mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to regenerate QR code')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-code', userId, hackathonId] })
      toast.success('QR code regenerated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate QR code')
    },
  })

  const handleRegenerate = () => {
    regenerateMutation.mutate()
  }

  const redemptionLabels: Record<string, string> = {
    lunch_day1: 'Lunch Day 1',
    lunch_day2: 'Lunch Day 2',
    swag: 'Swag',
    dinner: 'Dinner',
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your QR Code</h1>
          <p className="text-gray-600">{hackathonName}</p>
        </div>

        {/* QR Code */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex flex-col items-center">
            {qrLoading || regenerateMutation.isPending ? (
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : qrData?.url ? (
              <Image
                src={qrData.url}
                alt="QR Code"
                width={256}
                height={256}
                className="w-64 h-64 rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Failed to load QR code</p>
              </div>
            )}

            <div className="mt-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900">{profile.full_name}</h2>
              {profile.college && (
                <p className="text-gray-600">{profile.college}</p>
              )}
            </div>

            <button
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
              className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {regenerateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate QR Code
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Checked In</span>
              {isCheckedIn ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-300" />
              )}
            </div>

            {Object.entries(redemptionLabels).map(([type, label]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                {initialRedemptionStatus[type as keyof RedemptionStatus] ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How to use</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Show this QR code to an organiser for check-in</li>
            <li>• Each redemption (lunch, swag, dinner) requires a separate scan</li>
            <li>• QR code expires in 24 hours</li>
            <li>• Regenerate if lost or expired</li>
          </ul>
        </div>
      </div>
    </div>
  )
}