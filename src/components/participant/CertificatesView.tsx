'use client'

import { Award, Download, Loader2, Trophy, Medal } from 'lucide-react'
import { format } from 'date-fns'

type Certificate = {
  id: string
  certificate_type: 'winner' | 'runner_up' | 'participant'
  rank?: number
  pdf_url?: string
  issued_at: string
  hackathon?: {
    id: string
    name: string
    status: string
  }
  team?: {
    id: string
    name: string
  }
}

type CertificatesViewProps = {
  certificates: Certificate[]
}

export default function CertificatesView({ certificates }: CertificatesViewProps) {
  if (certificates.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Yet</h3>
        <p className="text-gray-500">
          Certificates will appear here after you complete a hackathon and the organiser generates them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {certificates.map((certificate) => (
        <CertificateCard key={certificate.id} certificate={certificate} />
      ))}
    </div>
  )
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'winner':
        return {
          label: 'Winner',
          className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
          icon: <Trophy className="w-4 h-4" />,
        }
      case 'runner_up':
        return {
          label: 'Runner Up',
          className: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900',
          icon: <Medal className="w-4 h-4" />,
        }
      default:
        return {
          label: 'Participant',
          className: 'bg-blue-100 text-blue-800',
          icon: <Award className="w-4 h-4" />,
        }
    }
  }

  const badge = getTypeBadge(certificate.certificate_type)

  return (
    <div className="bg-white shadow rounded-lg p-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
          <Award className="w-8 h-8 text-gray-400" />
        </div>
        
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-medium text-gray-900">
              {certificate.hackathon?.name || 'Unknown Hackathon'}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
              {badge.icon}
              <span className="ml-1">{badge.label}</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {certificate.team && (
              <span>Team: {certificate.team.name}</span>
            )}
            {certificate.rank && (
              <span>Rank: #{certificate.rank}</span>
            )}
            <span>Issued: {format(new Date(certificate.issued_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      <div>
        {certificate.pdf_url ? (
          <a
            href={certificate.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </a>
        ) : (
          <div className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-50">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </div>
        )}
      </div>
    </div>
  )
}
