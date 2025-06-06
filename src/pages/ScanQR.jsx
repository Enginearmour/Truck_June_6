import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { toast } from 'react-hot-toast'
import { FaQrcode } from 'react-icons/fa'

const ScanQR = () => {
  const navigate = useNavigate()
  const [scanResult, setScanResult] = useState(null)
  
  useEffect(() => {
    // Create QR code scanner
    const scanner = new Html5QrcodeScanner('qr-reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 10,
    })
    
    const success = (decodedText) => {
      scanner.clear()
      setScanResult(decodedText)
      
      // Extract truck ID from URL
      try {
        const url = new URL(decodedText)
        const pathParts = url.pathname.split('/')
        const truckId = pathParts[pathParts.length - 1]
        
        if (truckId) {
          navigate(`/trucks/${truckId}`)
        } else {
          toast.error('Invalid QR code. Could not find truck ID.')
        }
      } catch (error) {
        console.error('Error parsing QR code URL:', error)
        toast.error('Invalid QR code format')
      }
    }
    
    const error = (err) => {
      console.warn(err)
    }
    
    scanner.render(success, error)
    
    // Cleanup
    return () => {
      try {
        scanner.clear()
      } catch (error) {
        console.error('Error cleaning up scanner:', error)
      }
    }
  }, [navigate])
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary-800 mb-6">Scan QR Code</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <FaQrcode className="text-primary-600 text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-secondary-800">Scan Truck QR Code</h2>
          <p className="text-secondary-600 mt-2">
            Position the QR code within the scanner frame to access truck maintenance records.
          </p>
        </div>
        
        <div className="flex justify-center">
          <div id="qr-reader" style={{ width: '100%', maxWidth: '500px' }}></div>
        </div>
        
        {scanResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-center text-green-800">
              QR code detected! Redirecting to truck details...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScanQR
