import { useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import QRCode from 'react-qr-code'
import { format } from 'date-fns'
import { FaPrint, FaOilCan, FaFilter, FaGasPump, FaClipboardCheck, FaSmog } from 'react-icons/fa'

const QRCodePrint = ({ truck, onClose }) => {
  const printRef = useRef()
  const modalRef = useRef()
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: onClose
  })
  
  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])
  
  // Set default distance unit if not specified
  const distanceUnit = truck.distanceUnit || 'miles'
  
  // Get the latest maintenance records for each type
  const getLatestMaintenance = (type) => {
    if (!truck.maintenanceHistory) return null
    
    const records = truck.maintenanceHistory.filter(record => record.type === type)
    if (records.length === 0) return null
    
    // Sort by date (newest first) and return the first one
    return records.sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })[0]
  }
  
  const oilChange = getLatestMaintenance('oil')
  const airFilter = getLatestMaintenance('airFilter')
  const fuelFilter = getLatestMaintenance('fuelFilter')
  const dpfCleaning = getLatestMaintenance('dpfCleaning')
  
  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return format(new Date(dateString), 'MMM d, yyyy')
  }
  
  // Calculate next due mileage
  const getNextDueMileage = (record, intervalType) => {
    if (!record || !record.mileage) return 'N/A'
    
    let interval = 0
    if (intervalType === 'oil') {
      interval = truck.oilChangeMileageInterval || 5000
    } else if (intervalType === 'airFilter') {
      interval = truck.airFilterMileageInterval || 15000
    } else if (intervalType === 'fuelFilter') {
      interval = truck.fuelFilterMileageInterval || 25000
    } else if (intervalType === 'dpfCleaning') {
      interval = truck.dpfCleaningMileageInterval || 100000
    }
    
    return (record.mileage + interval).toLocaleString()
  }
  
  const baseUrl = window.location.origin
  const qrValue = `${baseUrl}/trucks/${truck.id}`
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary-800">Print QR Code</h2>
          <button
            onClick={onClose}
            className="text-secondary-500 hover:text-secondary-700"
          >
            &times;
          </button>
        </div>
        
        <div className="mb-4">
          <button
            onClick={handlePrint}
            className="btn btn-primary flex items-center justify-center w-full"
          >
            <FaPrint className="mr-2" />
            Print QR Code
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          <div className="border p-6 rounded-lg" ref={printRef}>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-black">Truck Maintenance QR Code</h1>
              <p className="text-lg text-black">
                {truck.year} {truck.make} {truck.model}
              </p>
              {truck.unitNumber && (
                <p className="text-lg font-bold text-black">
                  Unit: {truck.unitNumber}
                </p>
              )}
              <p className="text-black">VIN: {truck.vin}</p>
            </div>
            
            <div className="flex justify-center mb-6">
              <QRCode value={qrValue} size={200} />
            </div>
            
            <p className="text-center mb-6 text-black">
              Scan this QR code to access maintenance records for this truck.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-md p-3">
                <h3 className="font-bold text-black flex items-center">
                  <FaOilCan className="text-primary-600 mr-2" />
                  Oil Change
                </h3>
                <p className="text-sm text-black">
                  Last Service: {oilChange ? formatDate(oilChange.date) : 'Never'}
                </p>
                <p className="text-sm text-black">
                  At: {oilChange ? `${oilChange.mileage.toLocaleString()} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due: {oilChange ? formatDate(oilChange.nextDate) : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due Mileage: {oilChange ? `${getNextDueMileage(oilChange, 'oil')} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Interval: {(truck.oilChangeMileageInterval || 5000).toLocaleString()} {distanceUnit}
                </p>
              </div>
              
              <div className="border rounded-md p-3">
                <h3 className="font-bold text-black flex items-center">
                  <FaFilter className="text-blue-600 mr-2" />
                  Air Filter
                </h3>
                <p className="text-sm text-black">
                  Last Service: {airFilter ? formatDate(airFilter.date) : 'Never'}
                </p>
                <p className="text-sm text-black">
                  At: {airFilter ? `${airFilter.mileage.toLocaleString()} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due: {airFilter ? formatDate(airFilter.nextDate) : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due Mileage: {airFilter ? `${getNextDueMileage(airFilter, 'airFilter')} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Interval: {(truck.airFilterMileageInterval || 15000).toLocaleString()} {distanceUnit}
                </p>
              </div>
              
              <div className="border rounded-md p-3">
                <h3 className="font-bold text-black flex items-center">
                  <FaGasPump className="text-green-600 mr-2" />
                  Fuel Filter
                </h3>
                <p className="text-sm text-black">
                  Last Service: {fuelFilter ? formatDate(fuelFilter.date) : 'Never'}
                </p>
                <p className="text-sm text-black">
                  At: {fuelFilter ? `${fuelFilter.mileage.toLocaleString()} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due: {fuelFilter ? formatDate(fuelFilter.nextDate) : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due Mileage: {fuelFilter ? `${getNextDueMileage(fuelFilter, 'fuelFilter')} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Interval: {(truck.fuelFilterMileageInterval || 25000).toLocaleString()} {distanceUnit}
                </p>
              </div>
              
              <div className="border rounded-md p-3">
                <h3 className="font-bold text-black flex items-center">
                  <FaSmog className="text-purple-600 mr-2" />
                  DPF Cleaning
                </h3>
                <p className="text-sm text-black">
                  Last Service: {dpfCleaning ? formatDate(dpfCleaning.date) : 'Never'}
                </p>
                <p className="text-sm text-black">
                  At: {dpfCleaning ? `${dpfCleaning.mileage.toLocaleString()} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due: {dpfCleaning ? formatDate(dpfCleaning.nextDate) : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Next Due Mileage: {dpfCleaning ? `${getNextDueMileage(dpfCleaning, 'dpfCleaning')} ${distanceUnit}` : 'N/A'}
                </p>
                <p className="text-sm text-black">
                  Interval: {(truck.dpfCleaningMileageInterval || 100000).toLocaleString()} {distanceUnit}
                </p>
              </div>
            </div>
            
            <div className="border rounded-md p-3 mb-6">
              <h3 className="font-bold text-black flex items-center">
                <FaClipboardCheck className="text-red-600 mr-2" />
                Safety Inspection
              </h3>
              <p className="text-sm text-black">
                Inspection Date: {truck.safetyInspectionDate ? formatDate(truck.safetyInspectionDate) : 'Not recorded'}
              </p>
              <p className="text-sm text-black">
                Expiry Date: {truck.safetyInspectionExpiryDate ? formatDate(truck.safetyInspectionExpiryDate) : 'Not recorded'}
              </p>
            </div>
            
            <div className="text-center text-xs text-black">
              <p>Current {distanceUnit === 'miles' ? 'Mileage' : 'Distance'}: {(truck.currentMileage || 0).toLocaleString()} {distanceUnit}</p>
              <p className="mt-1">{qrValue}</p>
              <p className="mt-1">Printed on {format(new Date(), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRCodePrint
