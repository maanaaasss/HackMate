'use client'

import { useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import CreateTeamModal from './CreateTeamModal'

type Hackathon = {
  id: string
  name: string
  status: string
}

export default function CreateOrJoinView({
  hackathon,
  userId,
}: {
  hackathon: Hackathon
  userId: string
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Join the {hackathon.name}
          </h1>
          <p className="text-lg text-gray-600">
            Create a team or join an existing one to participate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Team Card */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="bg-white rounded-lg shadow p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create a Team
              </h3>
              <p className="text-gray-600">
                Start your own team and invite others to join. You&apos;ll be the team lead.
              </p>
            </div>
          </div>

          {/* Browse Teams Card */}
          <div className="bg-white rounded-lg shadow p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-500">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Browse Open Teams
              </h3>
              <p className="text-gray-600">
                Find teams looking for members with your skills and join them.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Coming soon...
              </p>
            </div>
          </div>
        </div>

        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          hackathonId={hackathon.id}
        />
      </div>
    </div>
  )
}