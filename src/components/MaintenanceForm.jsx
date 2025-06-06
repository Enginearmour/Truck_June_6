import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'
import { format, addMonths } from 'date-fns'

const MaintenanceForm = ({ truck, type, onComplete }) => {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    mileage: truck.currentMileage || 0,
    notes: '',
    nextDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd')
  })
  
  const [loading, setLoading] = useState(false)
  
  // Set default distance unit if not specified
  const distanceUnit = truck.distanceUnit || 'km'
  
  useEffect(() => {
    // Update mileage when truck changes
    setFormData(prev => ({
      ...prev,
      mileage: truck.currentMileage || 0
    }))
  }, [truck.currentMileage])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Validate mileage
      const mileage = parseInt(formData.mileage)
      if (isNaN(mileage) || mileage < 0) {
        toast.error(`Please enter a valid ${distanceUnit === 'miles' ? 'mileage' : 'distance'}`)
        setLoading(false)
        return
      }
      
      // Get current maintenance history
      const maintenanceHistory = [...(truck.maintenanceHistory || [])]
      
      // Calculate next due mileage based on maintenance type
      let nextMileage = null
      if (type === 'oil' && truck.oilChangeMileageInterval) {
        nextMileage = mileage + truck.oilChangeMileageInterval
      } else if (type === 'airFilter' && truck.airFilterMileageInterval) {
        nextMileage = mileage + truck.airFilterMileageInterval
      } else if (type === 'fuelFilter' && truck.fuelFilterMileageInterval) {
        nextMileage = mileage + truck.fuelFilterMileageInterval
      } else if (type === 'dpfCleaning' && truck.dpfCleaningMileageInterval) {
        nextMileage = mileage + truck.dpfCleaningMileageInterval
      }
      
      // Create new maintenance record
      const newRecord = {
        type,
        date: formData.date,
        mileage,
        notes: formData.notes,
        nextDate: formData.nextDate,
        nextMileage
      }
      
      // Find existing record of this type
      const existingIndex = maintenanceHistory.findIndex(record => record.type === type)
      
      if (existingIndex >= 0) {
        // Update existing record
        maintenanceHistory[existingIndex] = newRecord
      } else {
        // Add new record
        maintenanceHistory.push(newRecord)
      }
      
      // Update truck record
      const { error } = await supabase
        .from('trucks')
        .update({
          maintenanceHistory,
          currentMileage: Math.max(mileage, truck.currentMileage || 0) // Update mileage if higher
        })
        .eq('id', truck.id)
      
      if (error) throw error
      
      toast.success(`${getTypeLabel(type)} maintenance recorded`)
      onComplete()
    } catch (error) {
      console.error('Error recording maintenance:', error)
      toast.error('Failed to record maintenance')
    } finally {
      setLoading(false)
    }
  }
  
  const getTypeLabel = (type) => {
    const labels = {
      oil: 'Oil Change',
      airFilter: 'Air Filter',
      fuelFilter: 'Fuel Filter',
      dpfCleaning: 'DPF Cleaning'
    }
    
    return labels[type] || type
  }
  
  // Get the appropriate interval based on maintenance type
  const getMileageInterval = () => {
    switch (type) {
      case 'oil':
        return truck.oilChangeMileageInterval || (truck.distanceUnit === 'miles' ? 5000 : 8000)
      case 'airFilter':
        return truck.airFilterMileageInterval || (truck.distanceUnit === 'miles' ? 15000 : 24000)
      case 'fuelFilter':
        return truck.fuelFilterMileageInterval || (truck.distanceUnit === 'miles' ? 25000 : 40000)
      case 'dpfCleaning':
        return truck.dpfCleaningMileageInterval || (truck.distanceUnit === 'miles' ? 100000 : 160000)
      default:
        return 0
    }
  }
  
  const mileageInterval = getMileageInterval()
  
  return (
    <div>
      <h3 className="text-lg font-bold mb-4 text-secondary-800">
        Record {getTypeLabel(type)} Maintenance
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="date" className="form-label">Service Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="mileage" className="form-label">
              {distanceUnit === 'miles' ? 'Mileage' : 'Distance (KM)'} at Service
            </label>
            <input
              type="number"
              id="mileage"
              name="mileage"
              value={formData.mileage}
              onChange={handleChange}
              className="form-input"
              min={0}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="nextDate" className="form-label">Next Service Date</label>
            <input
              type="date"
              id="nextDate"
              name="nextDate"
              value={formData.nextDate}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          {mileageInterval > 0 && (
            <div className="form-group">
              <label className="form-label">Next Service {distanceUnit === 'miles' ? 'Mileage' : 'Distance'}</label>
              <input
                type="text"
                value={parseInt(formData.mileage || 0) + parseInt(mileageInterval)}
                className="form-input bg-gray-100"
                disabled
              />
              <p className="text-xs text-secondary-500 mt-1">
                Based on your {getTypeLabel(type).toLowerCase()} interval of {mileageInterval.toLocaleString()} {distanceUnit}
              </p>
            </div>
          )}
          
          <div className="form-group md:col-span-2">
            <label htmlFor="notes" className="form-label">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
              rows={3}
              placeholder="Enter any notes about this maintenance..."
            ></textarea>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => onComplete()}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MaintenanceForm
