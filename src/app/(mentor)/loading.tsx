import { CardSkeleton, TableSkeleton, TextSkeleton } from '@/components/ui/Skeleton'

export default function MentorLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <TextSkeleton lines={1} className="w-1/3 mb-2" />
          <TextSkeleton lines={1} className="w-1/2" />
        </div>

        {/* Teams grid skeleton */}
        <div className="mb-8">
          <TextSkeleton lines={1} className="w-1/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>

        {/* Help queue skeleton */}
        <div>
          <TextSkeleton lines={1} className="w-1/4 mb-4" />
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    </div>
  )
}
