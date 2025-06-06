import { Link, useNavigate } from 'react-router-dom'
import { FaOilCan, FaFilter, FaGasPump, FaClipboardCheck, FaSmog } from 'react-icons/fa'
import { format, isAfter, isBefore, addDays } from 'date-fns'

const TruckCard = ({ truck }) => {
  const navigate = useNavigate();
  
  // Set default distance unit if not specified
  const distanceUnit = truck.distanceUnit || 'miles'
  
  const isMaintenanceDue = (date, mileage) => {
    if (!date && !mileage) return false
    
    // Check if date is in the past
    let dateDue = false
    if (date) {
      const maintenanceDate = new Date(date)
      const today = new Date()
      dateDue = isAfter(today, maintenanceDate)
    }
    
    // Check if mileage is due
    let mileageDue = false
    if (mileage && truck.currentMileage) {
      mileageDue = truck.currentMileage >= mileage
    }
    
    return dateDue || mileageDue
  }

  const isMileageApproachingDue = (lastMileage, interval) => {
    if (!lastMileage || !interval || !truck.currentMileage) return false
    
    // Calculate the mileage at which the next service is due
    const nextDueMileage = lastMileage + interval
    
    // Check if current mileage is within 500 miles/km of the next due mileage
    const approachingThreshold = distanceUnit === 'miles' ? 500 : 800 // ~500 miles or ~800 km
    return truck.currentMileage + approachingThreshold >= nextDueMileage && truck.currentMileage < nextDueMileage
  }

  const getMaintenanceStatus = (type) => {
    const maintenance = truck.maintenanceHistory?.find(m => m.type === type)
    
    // Get the appropriate interval based on maintenance type
    let interval = 0
    if (type === 'oil') {
      interval = truck.oilChangeMileageInterval || 5000
    } else if (type === 'airFilter') {
      interval = truck.airFilterMileageInterval || 15000
    } else if (type === 'fuelFilter') {
      interval = truck.fuelFilterMileageInterval || 25000
    } else if (type === 'dpfCleaning') {
      interval = truck.dpfCleaningMileageInterval || 100000
    }
    
    if (!maintenance) {
      // For any maintenance type with an interval, check if we're approaching due
      if (interval > 0) {
        return {
          status: 'due',
          color: 'red',
          date: 'Never',
          mileage: 'N/A',
          nextMileage: truck.currentMileage, // Due immediately for first service
          overdueMileage: truck.currentMileage // Overdue by current mileage for first service
        }
      }
      
      return { status: 'unknown', color: 'gray', date: 'Never', mileage: 'N/A' }
    }
    
    // Calculate next due mileage based on maintenance type and interval
    let nextMileage = null
    if (interval > 0 && maintenance.mileage) {
      nextMileage = maintenance.mileage + interval
    }
    
    // Calculate how much mileage is overdue
    let overdueMileage = 0
    if (nextMileage && truck.currentMileage > nextMileage) {
      overdueMileage = truck.currentMileage - nextMileage
    }
    
    // Check if maintenance is due by date or mileage
    const isDue = isMaintenanceDue(maintenance.nextDate, nextMileage)
    
    // Check if maintenance is approaching due (within threshold)
    const isApproachingDue = interval > 0 && 
      !isDue && 
      isMileageApproachingDue(maintenance.mileage, interval)
    
    // Determine color based on status
    let color = 'green'
    if (isDue) {
      color = 'red'
    } else if (isApproachingDue) {
      color = 'yellow'
    }
    
    return {
      status: isDue ? 'due' : isApproachingDue ? 'approaching' : 'ok',
      color,
      date: maintenance.date ? format(new Date(maintenance.date), 'MMM d, yyyy') : 'Never',
      mileage: maintenance.mileage ? maintenance.mileage.toLocaleString() : 'N/A',
      nextMileage: nextMileage ? nextMileage.toLocaleString() : 'N/A',
      overdueMileage: overdueMileage
    }
  }

  const getSafetyInspectionStatus = () => {
    if (!truck.safetyInspectionDate && !truck.safetyInspectionExpiryDate) {
      return { status: 'unknown', color: 'gray', date: 'Never', expiryDate: 'N/A' }
    }
    
    const today = new Date()
    let status = 'ok'
    let color = 'green'
    
    // Check if safety inspection is expired
    if (truck.safetyInspectionExpiryDate) {
      const expiryDate = new Date(truck.safetyInspectionExpiryDate)
      
      // If expiry date is in the past, it's overdue
      if (isAfter(today, expiryDate)) {
        status = 'due'
        color = 'red'
      } else {
        // Check if expiry date is approaching (within 30 days)
        const approachingDate = addDays(today, 30)
        if (isBefore(expiryDate, approachingDate)) {
          status = 'approaching'
          color = 'yellow'
        }
      }
    }
    
    return {
      status,
      color,
      date: truck.safetyInspectionDate ? format(new Date(truck.safetyInspectionDate), 'MMM d, yyyy') : 'Never',
      expiryDate: truck.safetyInspectionExpiryDate ? format(new Date(truck.safetyInspectionExpiryDate), 'MMM d, yyyy') : 'N/A'
    }
  }

  const handleMaintenanceClick = (type) => {
    console.log(`Navigating to truck ${truck.id} with maintenance form: ${type}`);
    navigate(`/trucks/${truck.id}`, { state: { showMaintenanceForm: type } });
  }

  const oilStatus = getMaintenanceStatus('oil')
  const airFilterStatus = getMaintenanceStatus('airFilter')
  const fuelFilterStatus = getMaintenanceStatus('fuelFilter')
  const dpfCleaningStatus = getMaintenanceStatus('dpfCleaning')
  const safetyInspectionStatus = getSafetyInspectionStatus()

  // Ensure currentMileage exists and has a default value if undefined
  const currentMileage = truck.currentMileage || 0

  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-secondary-800">
            {truck.year} {truck.make} {truck.model}
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p className="text-sm text-black">VIN: {truck.vin}</p>
            {truck.unitNumber && (
              <>
                <span className="hidden sm:inline text-secondary-400">•</span>
                <p className="text-sm font-bold text-red-600">Unit: {truck.unitNumber}</p>
              </>
            )}
          </div>
          <p className="text-sm font-medium mt-1 text-secondary-700">
            Current {distanceUnit === 'miles' ? 'Mileage' : 'Distance'}: {currentMileage.toLocaleString()} {distanceUnit}
          </p>
        </div>
        <Link 
          to={`/trucks/${truck.id}`}
          className="btn btn-primary text-sm"
        >
          View Details
        </Link>
      </div>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div 
          className={`p-2 rounded-md bg-${oilStatus.color}-100 border border-${oilStatus.color}-200 cursor-pointer hover:shadow-md transition-shadow duration-200`}
          onClick={() => handleMaintenanceClick('oil')}
        >
          <div className="flex items-center">
            <FaOilCan className={`text-${oilStatus.color}-500 mr-2`} />
            <span className="text-sm font-medium text-secondary-800">Oil Change</span>
          </div>
          <div className="mt-1 text-xs text-secondary-700">
            <p>Last: {oilStatus.date}</p>
            <p>At: {oilStatus.mileage} {distanceUnit}</p>
            {oilStatus.nextMileage !== 'N/A' && (
              <p className="font-medium">
                Next: {oilStatus.nextMileage} {distanceUnit}
                {oilStatus.status === 'due' && (
                  <span className="text-red-500 ml-1">
                    {oilStatus.overdueMileage > 0 ? 
                      `(${oilStatus.overdueMileage.toLocaleString()} ${distanceUnit} OVERDUE)` : 
                      '(OVERDUE)'}
                  </span>
                )}
                {oilStatus.status === 'approaching' && (
                  <span className="text-yellow-600 ml-1">SOON</span>
                )}
              </p>
            )}
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-md bg-${airFilterStatus.color}-100 border border-${airFilterStatus.color}-200 cursor-pointer hover:shadow-md transition-shadow duration-200`}
          onClick={() => handleMaintenanceClick('airFilter')}
        >
          <div className="flex items-center">
            <FaFilter className={`text-${airFilterStatus.color}-500 mr-2`} />
            <span className="text-sm font-medium text-secondary-800">Air Filter</span>
          </div>
          <div className="mt-1 text-xs text-secondary-700">
            <p>Last: {airFilterStatus.date}</p>
            <p>At: {airFilterStatus.mileage} {distanceUnit}</p>
            {airFilterStatus.nextMileage !== 'N/A' && (
              <p className="font-medium">
                Next: {airFilterStatus.nextMileage} {distanceUnit}
                {airFilterStatus.status === 'due' && (
                  <span className="text-red-500 ml-1">
                    {airFilterStatus.overdueMileage > 0 ? 
                      `(${airFilterStatus.overdueMileage.toLocaleString()} ${distanceUnit} OVERDUE)` : 
                      '(OVERDUE)'}
                  </span>
                )}
                {airFilterStatus.status === 'approaching' && (
                  <span className="text-yellow-600 ml-1">SOON</span>
                )}
              </p>
            )}
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-md bg-${fuelFilterStatus.color}-100 border border-${fuelFilterStatus.color}-200 cursor-pointer hover:shadow-md transition-shadow duration-200`}
          onClick={() => handleMaintenanceClick('fuelFilter')}
        >
          <div className="flex items-center">
            <FaGasPump className={`text-${fuelFilterStatus.color}-500 mr-2`} />
            <span className="text-sm font-medium text-secondary-800">Fuel Filter</span>
          </div>
          <div className="mt-1 text-xs text-secondary-700">
            <p>Last: {fuelFilterStatus.date}</p>
            <p>At: {fuelFilterStatus.mileage} {distanceUnit}</p>
            {fuelFilterStatus.nextMileage !== 'N/A' && (
              <p className="font-medium">
                Next: {fuelFilterStatus.nextMileage} {distanceUnit}
                {fuelFilterStatus.status === 'due' && (
                  <span className="text-red-500 ml-1">
                    {fuelFilterStatus.overdueMileage > 0 ? 
                      `(${fuelFilterStatus.overdueMileage.toLocaleString()} ${distanceUnit} OVERDUE)` : 
                      '(OVERDUE)'}
                  </span>
                )}
                {fuelFilterStatus.status === 'approaching' && (
                  <span className="text-yellow-600 ml-1">SOON</span>
                )}
              </p>
            )}
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-md bg-${dpfCleaningStatus.color}-100 border border-${dpfCleaningStatus.color}-200 cursor-pointer hover:shadow-md transition-shadow duration-200`}
          onClick={() => handleMaintenanceClick('dpfCleaning')}
        >
          <div className="flex items-center">
            <FaSmog className={`text-${dpfCleaningStatus.color}-500 mr-2`} />
            <span className="text-sm font-medium text-secondary-800">DPF Cleaning</span>
          </div>
          <div className="mt-1 text-xs text-secondary-700">
            <p>Last: {dpfCleaningStatus.date}</p>
            <p>At: {dpfCleaningStatus.mileage} {distanceUnit}</p>
            {dpfCleaningStatus.nextMileage !== 'N/A' && (
              <p className="font-medium">
                Next: {dpfCleaningStatus.nextMileage} {distanceUnit}
                {dpfCleaningStatus.status === 'due' && (
                  <span className="text-red-500 ml-1">
                    {dpfCleaningStatus.overdueMileage > 0 ? 
                      `(${dpfCleaningStatus.overdueMileage.toLocaleString()} ${distanceUnit} OVERDUE)` : 
                      '(OVERDUE)'}
                  </span>
                )}
                {dpfCleaningStatus.status === 'approaching' && (
                  <span className="text-yellow-600 ml-1">SOON</span>
                )}
              </p>
            )}
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-md bg-${safetyInspectionStatus.color}-100 border border-${safetyInspectionStatus.color}-200 cursor-pointer hover:shadow-md transition-shadow duration-200`}
          onClick={() => handleMaintenanceClick('safetyInspection')}
        >
          <div className="flex items-center">
            <FaClipboardCheck className={`text-${safetyInspectionStatus.color}-500 mr-2`} />
            <span className="text-sm font-medium text-secondary-800">Safety Inspection</span>
          </div>
          <div className="mt-1 text-xs text-secondary-700">
            <p>Issued: {safetyInspectionStatus.date}</p>
            <p className="font-medium">
              Expires: {safetyInspectionStatus.expiryDate}
              {safetyInspectionStatus.status === 'due' && (
                <span className="text-red-500 ml-1">EXPIRED</span>
              )}
              {safetyInspectionStatus.status === 'approaching' && (
                <span className="text-yellow-600 ml-1">SOON</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TruckCard
