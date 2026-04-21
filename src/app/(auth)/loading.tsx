import { CardSkeleton, TextSkeleton } from '@/components/ui/Skeleton'

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
          <TextSkeleton lines={2} className="mt-6" />
        </div>
        <CardSkeleton className="mt-8" />
      </div>
    </div>
  )
}
