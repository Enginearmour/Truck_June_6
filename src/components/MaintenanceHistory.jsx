import { useState } from 'react'
import { format } from 'date-fns'
import { FaOilCan, FaFilter, FaGasPump, FaClipboardCheck, FaSmog } from 'react-icons/fa'

const MaintenanceHistory = ({ truck }) => {
  const [showAll, setShowAll] = useState(false)
  
  if (!truck || !truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-bold mb-4 text-secondary-800">Maintenance History</h2>
        <p className="text-center text-secondary-500 py-8">No maintenance records found</p>
      </div>
    )
  }
  
  // Set default distance unit if not specified
  const distanceUnit = truck.distanceUnit || 'miles'
  
  // Sort maintenance records by date (newest first)
  const sortedRecords = [...truck.maintenanceHistory].sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date) - new Date(a.date)
  })
  
  // Limit records if not showing all
  const displayRecords = showAll ? sortedRecords : sortedRecords.slice(0, 5)
  
  const getTypeLabel = (type) => {
    const labels = {
      oil: 'Oil Change',
      airFilter: 'Air Filter Change',
      fuelFilter: 'Fuel Filter Change',
      dpfCleaning: 'DPF Cleaning'
    }
    
    return labels[type] || type
  }
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'oil':
        return <FaOilCan className="text-primary-500" />
      case 'airFilter':
        return <FaFilter className="text-blue-500" />
      case 'fuelFilter':
        return <FaGasPump className="text-green-500" />
      case 'dpfCleaning':
        return <FaSmog className="text-purple-500" />
      default:
        return <FaClipboardCheck className="text-secondary-500" />
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-xl font-bold mb-4 text-secondary-800">Maintenance History</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-secondary-50">
              <th className="py-2 px-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Type</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Date</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">{distanceUnit === 'miles' ? 'Mileage' : 'Distance'}</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Next Due</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200">
            {displayRecords.map((record, index) => (
              <tr key={index} className="hover:bg-secondary-50">
                <td className="py-3 px-3">
                  <div className="flex items-center">
                    <span className="mr-2">{getTypeIcon(record.type)}</span>
                    <span className="font-medium text-secondary-800">{getTypeLabel(record.type)}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-secondary-800">
                  {record.date ? format(new Date(record.date), 'MMM d, yyyy') : 'N/A'}
                </td>
                <td className="py-3 px-3 text-secondary-800">
                  {record.mileage ? `${record.mileage.toLocaleString()} ${distanceUnit}` : 'N/A'}
                </td>
                <td className="py-3 px-3">
                  <div>
                    <p className="text-secondary-800">
                      {record.nextDate ? format(new Date(record.nextDate), 'MMM d, yyyy') : 'N/A'}
                    </p>
                    {record.nextMileage && (
                      <p className="text-sm text-secondary-600">
                        {record.nextMileage.toLocaleString()} {distanceUnit}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-secondary-800">
                  {record.notes || 'No notes'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {sortedRecords.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            {showAll ? 'Show Less' : `Show All (${sortedRecords.length})`}
          </button>
        </div>
      )}
    </div>
  )
}

export default MaintenanceHistory
