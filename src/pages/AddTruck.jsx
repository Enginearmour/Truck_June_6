import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'
import { format, addYears } from 'date-fns'

const AddTruck = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    vin: '',
    unitNumber: '',
    year: new Date().getFullYear(),
    make: '',
    model: '',
    currentMileage: '',
    oilChangeMileageInterval: '8000', // Default oil change interval for KM
    airFilterMileageInterval: '24000', // Default air filter change interval for KM
    fuelFilterMileageInterval: '40000', // Default fuel filter change interval for KM
    dpfCleaningMileageInterval: '160000', // Default DPF cleaning interval for KM
    distanceUnit: 'km', // Default distance unit is now KM
    safetyInspectionDate: '' // Safety inspection date
  })
  
  const [loading, setLoading] = useState(false)
  
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // If changing distance unit, update the default intervals accordingly
    if (name === 'distanceUnit') {
      const newIntervals = {
        miles: {
          oilChangeMileageInterval: '5000',
          airFilterMileageInterval: '15000',
          fuelFilterMileageInterval: '25000',
          dpfCleaningMileageInterval: '100000'
        },
        km: {
          oilChangeMileageInterval: '8000',
          airFilterMileageInterval: '24000',
          fuelFilterMileageInterval: '40000',
          dpfCleaningMileageInterval: '160000'
        }
      }
      
      // Only update intervals if they're still at default values
      const isOilDefault = formData.oilChangeMileageInterval === '5000' || formData.oilChangeMileageInterval === '8000'
      const isAirDefault = formData.airFilterMileageInterval === '15000' || formData.airFilterMileageInterval === '24000'
      const isFuelDefault = formData.fuelFilterMileageInterval === '25000' || formData.fuelFilterMileageInterval === '40000'
      const isDpfDefault = formData.dpfCleaningMileageInterval === '100000' || formData.dpfCleaningMileageInterval === '160000'
      
      setFormData(prev => ({
        ...prev,
        distanceUnit: value,
        oilChangeMileageInterval: isOilDefault ? newIntervals[value].oilChangeMileageInterval : prev.oilChangeMileageInterval,
        airFilterMileageInterval: isAirDefault ? newIntervals[value].airFilterMileageInterval : prev.airFilterMileageInterval,
        fuelFilterMileageInterval: isFuelDefault ? newIntervals[value].fuelFilterMileageInterval : prev.fuelFilterMileageInterval,
        dpfCleaningMileageInterval: isDpfDefault ? newIntervals[value].dpfCleaningMileageInterval : prev.dpfCleaningMileageInterval
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }
  
  // New handler for checkbox
  const handleUnitChange = (e) => {
    const newUnit = e.target.checked ? 'miles' : 'km'
    
    // Use the existing handleChange function with a simulated event
    handleChange({
      target: {
        name: 'distanceUnit',
        value: newUnit
      }
    })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Validate VIN (basic validation)
      if (formData.vin.length !== 17) {
        toast.error('VIN must be 17 characters')
        setLoading(false)
        return
      }
      
      // Validate year
      const year = parseInt(formData.year)
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        toast.error('Please enter a valid year')
        setLoading(false)
        return
      }
      
      // Validate mileage
      const mileage = parseInt(formData.currentMileage)
      if (isNaN(mileage) || mileage < 0) {
        toast.error(`Please enter a valid ${formData.distanceUnit === 'miles' ? 'mileage' : 'distance'}`)
        setLoading(false)
        return
      }
      
      // Validate oil change interval
      const oilChangeMileageInterval = parseInt(formData.oilChangeMileageInterval)
      if (isNaN(oilChangeMileageInterval) || oilChangeMileageInterval < 1000) {
        toast.error(`Please enter a valid oil change interval (minimum 1000 ${formData.distanceUnit})`)
        setLoading(false)
        return
      }
      
      // Validate air filter change interval
      const airFilterMileageInterval = parseInt(formData.airFilterMileageInterval)
      if (isNaN(airFilterMileageInterval) || airFilterMileageInterval < 1000) {
        toast.error(`Please enter a valid air filter change interval (minimum 1000 ${formData.distanceUnit})`)
        setLoading(false)
        return
      }
      
      // Validate fuel filter change interval
      const fuelFilterMileageInterval = parseInt(formData.fuelFilterMileageInterval)
      if (isNaN(fuelFilterMileageInterval) || fuelFilterMileageInterval < 1000) {
        toast.error(`Please enter a valid fuel filter change interval (minimum 1000 ${formData.distanceUnit})`)
        setLoading(false)
        return
      }
      
      // Validate DPF cleaning interval
      const dpfCleaningMileageInterval = parseInt(formData.dpfCleaningMileageInterval)
      if (isNaN(dpfCleaningMileageInterval) || dpfCleaningMileageInterval < 1000) {
        toast.error(`Please enter a valid DPF cleaning interval (minimum 1000 ${formData.distanceUnit})`)
        setLoading(false)
        return
      }
      
      // Calculate safety inspection expiry date if inspection date is provided
      let safetyInspectionDate = null
      let safetyInspectionExpiryDate = null
      
      if (formData.safetyInspectionDate) {
        safetyInspectionDate = formData.safetyInspectionDate
        // Set expiry date to 1 year after inspection date
        safetyInspectionExpiryDate = format(addYears(new Date(safetyInspectionDate), 1), 'yyyy-MM-dd')
      }
      
      // Create truck record
      const { data, error } = await supabase
        .from('trucks')
        .insert([{
          vin: formData.vin.toUpperCase(),
          unitNumber: formData.unitNumber, // Added Unit Number
          year,
          make: formData.make,
          model: formData.model,
          currentMileage: mileage,
          oilChangeMileageInterval,
          airFilterMileageInterval,
          fuelFilterMileageInterval,
          dpfCleaningMileageInterval,
          distanceUnit: formData.distanceUnit,
          safetyInspectionDate,
          safetyInspectionExpiryDate,
          maintenanceHistory: []
        }])
        .select()
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation')
      }
      
      toast.success('Truck added successfully')
      navigate(`/trucks/${data[0].id}`)
    } catch (error) {
      console.error('Error adding truck:', error)
      toast.error(error.message || 'Failed to add truck')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary-800 mb-6">Add New Truck</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="form-group">
              <label htmlFor="vin" className="form-label">VIN (Vehicle Identification Number)</label>
              <input
                type="text"
                id="vin"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. 1HGCM82633A123456"
                maxLength={17}
                required
              />
              <p className="text-xs text-secondary-500 mt-1">
                The VIN should be 17 characters long
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="unitNumber" className="form-label">Unit Number</label>
              <input
                type="text"
                id="unitNumber"
                name="unitNumber"
                value={formData.unitNumber}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. T-123"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Optional identifier used by your company
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="year" className="form-label">Year</label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="form-input"
                min={1900}
                max={new Date().getFullYear() + 1}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="make" className="form-label">Make</label>
              <input
                type="text"
                id="make"
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. Freightliner"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="model" className="form-label">Model</label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. Cascadia"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label flex items-center">
                <span>Distance Unit</span>
                <div className="ml-4 flex items-center">
                  <span className={`mr-2 ${formData.distanceUnit === 'km' ? 'font-bold text-primary-600' : 'text-secondary-500'}`}>KM</span>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      id="distanceUnitToggle"
                      checked={formData.distanceUnit === 'miles'}
                      onChange={handleUnitChange}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label
                      htmlFor="distanceUnitToggle"
                      className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                    ></label>
                  </div>
                  <span className={formData.distanceUnit === 'miles' ? 'font-bold text-primary-600' : 'text-secondary-500'}>Miles</span>
                </div>
              </label>
              <style jsx>{`
                .toggle-checkbox:checked {
                  right: 0;
                  border-color: #3b82f6;
                }
                .toggle-checkbox:checked + .toggle-label {
                  background-color: #3b82f6;
                }
                .toggle-checkbox {
                  left: 0;
                  transition: all 0.3s;
                  border-color: #d1d5db;
                }
                .toggle-checkbox:checked {
                  left: auto;
                  right: 0;
                }
                .toggle-label {
                  transition: all 0.3s;
                }
              `}</style>
            </div>
            
            <div className="form-group">
              <label htmlFor="currentMileage" className="form-label">Current {formData.distanceUnit === 'miles' ? 'Mileage' : 'Distance (KM)'}</label>
              <input
                type="number"
                id="currentMileage"
                name="currentMileage"
                value={formData.currentMileage}
                onChange={handleChange}
                className="form-input"
                placeholder={`e.g. ${formData.distanceUnit === 'miles' ? '50000' : '80000'}`}
                min={0}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="oilChangeMileageInterval" className="form-label">
                Oil Change Interval ({formData.distanceUnit})
              </label>
              <input
                type="number"
                id="oilChangeMileageInterval"
                name="oilChangeMileageInterval"
                value={formData.oilChangeMileageInterval}
                onChange={handleChange}
                className="form-input"
                placeholder={`e.g. ${formData.distanceUnit === 'miles' ? '5000' : '8000'}`}
                min={1000}
                required
              />
              <p className="text-xs text-secondary-500 mt-1">
                Recommended interval between oil changes
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="airFilterMileageInterval" className="form-label">
                Air Filter Change Interval ({formData.distanceUnit})
              </label>
              <input
                type="number"
                id="airFilterMileageInterval"
                name="airFilterMileageInterval"
                value={formData.airFilterMileageInterval}
                onChange={handleChange}
                className="form-input"
                placeholder={`e.g. ${formData.distanceUnit === 'miles' ? '15000' : '24000'}`}
                min={1000}
                required
              />
              <p className="text-xs text-secondary-500 mt-1">
                Recommended interval between air filter changes
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="fuelFilterMileageInterval" className="form-label">
                Fuel Filter Change Interval ({formData.distanceUnit})
              </label>
              <input
                type="number"
                id="fuelFilterMileageInterval"
                name="fuelFilterMileageInterval"
                value={formData.fuelFilterMileageInterval}
                onChange={handleChange}
                className="form-input"
                placeholder={`e.g. ${formData.distanceUnit === 'miles' ? '25000' : '40000'}`}
                min={1000}
                required
              />
              <p className="text-xs text-secondary-500 mt-1">
                Recommended interval between fuel filter changes
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="dpfCleaningMileageInterval" className="form-label">
                DPF Cleaning Interval ({formData.distanceUnit})
              </label>
              <input
                type="number"
                id="dpfCleaningMileageInterval"
                name="dpfCleaningMileageInterval"
                value={formData.dpfCleaningMileageInterval}
                onChange={handleChange}
                className="form-input"
                placeholder={`e.g. ${formData.distanceUnit === 'miles' ? '100000' : '160000'}`}
                min={1000}
                required
              />
              <p className="text-xs text-secondary-500 mt-1">
                Recommended interval between DPF (Diesel Particulate Filter) cleanings
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="safetyInspectionDate" className="form-label">
                Safety Inspection Date
              </label>
              <input
                type="date"
                id="safetyInspectionDate"
                name="safetyInspectionDate"
                value={formData.safetyInspectionDate}
                onChange={handleChange}
                className="form-input"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Date when the safety inspection was performed (expiry will be set to 1 year after this date)
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => navigate('/trucks')}
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
              {loading ? 'Adding...' : 'Add Truck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTruck
