'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { Camera, CameraOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

type ScanResult = {
  id: string
  name: string
  type: string
  time: string
  success: boolean
  message: string
}

type RedemptionType = 'checkin' | 'lunch_day1' | 'lunch_day2' | 'swag' | 'dinner'

export default function QRScannerPage({
  hackathonName,
}: {
  hackathonName: string
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [redemptionType, setRedemptionType] = useState<RedemptionType>('checkin')
  const [lastScans, setLastScans] = useState<ScanResult[]>([])
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // Audio context for beep sounds
  const audioContextRef = useRef<AudioContext | null>(null)

  const playSuccessSound = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
    }
    
    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + 0.3)
  }

  const playErrorSound = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
    }
    
    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.value = 300
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + 0.5)
  }

  const startScanning = async () => {
    try {
      const html5Qrcode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Pause scanning while processing
          await html5Qrcode.pause()
          await handleScan(decodedText)
          // Resume scanning after 2 seconds
          setTimeout(async () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
              await scannerRef.current.resume()
            }
          }, 2000)
        },
        (_errorMessage) => {
          // Ignore errors (no QR code in view)
        }
      )

      setIsScanning(true)
    } catch (error) {
      console.error('Failed to start camera:', error)
      toast.error('Failed to access camera. Please grant camera permissions.')
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleScan = async (qrData: string) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setCurrentResult(null)

    try {
      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_data: qrData,
          redemption_type: redemptionType === 'checkin' ? undefined : redemptionType,
        }),
      })

      const data = await response.json()

      const result: ScanResult = {
        id: Date.now().toString(),
        name: data.profile?.full_name || 'Unknown',
        type: redemptionType,
        time: new Date().toLocaleTimeString(),
        success: response.ok,
        message: response.ok ? data.message : data.error,
      }

      setCurrentResult(result)
      setLastScans(prev => [result, ...prev.slice(0, 9)])

      if (response.ok) {
        playSuccessSound()
        toast.success(data.message)
      } else {
        playErrorSound()
        toast.error(data.error)
      }
    } catch (_error) {
      const result: ScanResult = {
        id: Date.now().toString(),
        name: 'Error',
        type: redemptionType,
        time: new Date().toLocaleTimeString(),
        success: false,
        message: 'Network error',
      }
      setCurrentResult(result)
      setLastScans(prev => [result, ...prev.slice(0, 9)])
      playErrorSound()
      toast.error('Network error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
      }
    }
  }, [])

  const redemptionTypes: { value: RedemptionType; label: string }[] = [
    { value: 'checkin', label: 'Check In' },
    { value: 'lunch_day1', label: 'Lunch Day 1' },
    { value: 'lunch_day2', label: 'Lunch Day 2' },
    { value: 'swag', label: 'Swag' },
    { value: 'dinner', label: 'Dinner' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Scanner</h1>
          <p className="text-gray-600">{hackathonName}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Scanner</h2>
                <div className="flex space-x-2">
                  {isScanning ? (
                    <button
                      onClick={stopScanning}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <CameraOff className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={startScanning}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanner
                    </button>
                  )}
                </div>
              </div>

              {/* Redemption Type Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scan Type
                </label>
                <select
                  value={redemptionType}
                  onChange={(e) => setRedemptionType(e.target.value as RedemptionType)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {redemptionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Scanner */}
              <div className="relative">
                <div
                  id="qr-reader"
                  className="w-full rounded-lg overflow-hidden bg-gray-100"
                  style={{ minHeight: '300px' }}
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Camera not active</p>
                    </div>
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <RefreshCw className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Current Result */}
            {currentResult && (
              <div className={`shadow rounded-lg p-6 ${
                currentResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {currentResult.success ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      currentResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {currentResult.success ? 'Success' : 'Error'}
                    </h3>
                    <div className="mt-2 text-sm">
                      <p className={currentResult.success ? 'text-green-700' : 'text-red-700'}>
                        {currentResult.message}
                      </p>
                      <p className="mt-1 text-gray-500">
                        {currentResult.name} • {currentResult.type} • {currentResult.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Scans</h2>
            {lastScans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No scans yet</p>
                <p className="text-sm mt-1">Scan a QR code to see results here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lastScans.map((scan) => (
                      <tr key={scan.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {scan.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {scan.type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {scan.time}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {scan.success ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}