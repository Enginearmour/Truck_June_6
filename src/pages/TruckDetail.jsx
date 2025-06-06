import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'
import QRCode from 'react-qr-code'
import { FaPrint, FaEdit, FaTrash, FaOilCan, FaFilter, FaGasPump, FaExchangeAlt, FaClipboardCheck, FaSmog } from 'react-icons/fa'
import MaintenanceForm from '../components/MaintenanceForm'
import MaintenanceHistory from '../components/MaintenanceHistory'
import QRCodePrint from '../components/QRCodePrint'
import { format, addYears, isAfter, isBefore, addDays } from 'date-fns'

const TruckDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [truck, setTruck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingMileage, setEditingMileage] = useState(false)
  const [currentMileage, setCurrentMileage] = useState('')
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(null)
  const [showPrintQR, setShowPrintQR] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingOilInterval, setEditingOilInterval] = useState(false)
  const [oilChangeMileageInterval, setOilChangeMileageInterval] = useState('')
  const [editingAirFilterInterval, setEditingAirFilterInterval] = useState(false)
  const [airFilterMileageInterval, setAirFilterMileageInterval] = useState('')
  const [editingFuelFilterInterval, setEditingFuelFilterInterval] = useState(false)
  const [fuelFilterMileageInterval, setFuelFilterMileageInterval] = useState('')
  const [editingDpfCleaningInterval, setEditingDpfCleaningInterval] = useState(false)
  const [dpfCleaningMileageInterval, setDpfCleaningMileageInterval] = useState('')
  const [editingDistanceUnit, setEditingDistanceUnit] = useState(false)
  const [distanceUnit, setDistanceUnit] = useState('km')
  const [editingSafetyInspection, setEditingSafetyInspection] = useState(false)
  const [safetyInspectionDate, setSafetyInspectionDate] = useState('')
  const [editingUnitNumber, setEditingUnitNumber] = useState(false)
  const [unitNumber, setUnitNumber] = useState('')
  
  useEffect(() => {
    const fetchTruck = async () => {
      try {
        const { data, error } = await supabase
          .from('trucks')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) throw error
        
        // Ensure values have defaults if undefined
        const truckWithDefaults = {
          ...data,
          currentMileage: data.currentMileage || 0,
          oilChangeMileageInterval: data.oilChangeMileageInterval || (data.distanceUnit === 'miles' ? 5000 : 8000),
          airFilterMileageInterval: data.airFilterMileageInterval || (data.distanceUnit === 'miles' ? 15000 : 24000),
          fuelFilterMileageInterval: data.fuelFilterMileageInterval || (data.distanceUnit === 'miles' ? 25000 : 40000),
          dpfCleaningMileageInterval: data.dpfCleaningMileageInterval || (data.distanceUnit === 'miles' ? 100000 : 160000),
          distanceUnit: data.distanceUnit || 'km',
          safetyInspectionDate: data.safetyInspectionDate || null,
          safetyInspectionExpiryDate: data.safetyInspectionExpiryDate || null,
          unitNumber: data.unitNumber || ''
        }
        
        setTruck(truckWithDefaults)
        setCurrentMileage(truckWithDefaults.currentMileage.toString())
        setOilChangeMileageInterval(truckWithDefaults.oilChangeMileageInterval.toString())
        setAirFilterMileageInterval(truckWithDefaults.airFilterMileageInterval.toString())
        setFuelFilterMileageInterval(truckWithDefaults.fuelFilterMileageInterval.toString())
        setDpfCleaningMileageInterval(truckWithDefaults.dpfCleaningMileageInterval.toString())
        setDistanceUnit(truckWithDefaults.distanceUnit)
        setUnitNumber(truckWithDefaults.unitNumber)
        
        // Set safety inspection date if it exists
        if (truckWithDefaults.safetyInspectionDate) {
          setSafetyInspectionDate(format(new Date(truckWithDefaults.safetyInspectionDate), 'yyyy-MM-dd'))
        } else {
          setSafetyInspectionDate('')
        }
      } catch (error) {
        console.error('Error fetching truck:', error)
        toast.error('Failed to load truck details')
        navigate('/trucks')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTruck()
  }, [id, navigate])
  
  // Check if we should show a specific maintenance form based on navigation state
  useEffect(() => {
    if (location.state?.showMaintenanceForm) {
      console.log('Showing maintenance form:', location.state.showMaintenanceForm);
      
      if (location.state.showMaintenanceForm === 'safetyInspection') {
        setEditingSafetyInspection(true);
      } else {
        setShowMaintenanceForm(location.state.showMaintenanceForm);
      }
      
      // Clear the state to prevent showing the form again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);
  
  const handleUpdateMileage = async () => {
    try {
      const mileageValue = parseInt(currentMileage)
      
      if (isNaN(mileageValue)) {
        toast.error(`Please enter a valid ${distanceUnit === 'miles' ? 'mileage' : 'distance'}`)
        return
      }
      
      if (mileageValue < (truck.currentMileage || 0)) {
        toast.error(`New ${distanceUnit === 'miles' ? 'mileage' : 'distance'} cannot be less than current ${distanceUnit === 'miles' ? 'mileage' : 'distance'}`)
        return
      }
      
      const { error } = await supabase
        .from('trucks')
        .update({ currentMileage: mileageValue })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({ ...truck, currentMileage: mileageValue })
      setEditingMileage(false)
      toast.success(`${distanceUnit === 'miles' ? 'Mileage' : 'Distance'} updated successfully`)
    } catch (error) {
      console.error(`Error updating ${distanceUnit === 'miles' ? 'mileage' : 'distance'}:`, error)
      toast.error(`Failed to update ${distanceUnit === 'miles' ? 'mileage' : 'distance'}`)
    }
  }
  
  const handleUpdateUnitNumber = async () => {
    try {
      const { error } = await supabase
        .from('trucks')
        .update({ unitNumber })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({ ...truck, unitNumber })
      setEditingUnitNumber(false)
      toast.success('Unit Number updated successfully')
    } catch (error) {
      console.error('Error updating Unit Number:', error)
      toast.error('Failed to update Unit Number')
    }
  }
  
  const handleUpdateOilInterval = async () => {
    try {
      const intervalValue = parseInt(oilChangeMileageInterval)
      
      if (isNaN(intervalValue) || intervalValue < 1000) {
        toast.error(`Please enter a valid interval (minimum 1000 ${distanceUnit})`)
        return
      }
      
      const { error } = await supabase
        .from('trucks')
        .update({ oilChangeMileageInterval: intervalValue })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({ ...truck, oilChangeMileageInterval: intervalValue })
      setEditingOilInterval(false)
      toast.success('Oil change interval updated successfully')
    } catch (error) {
      console.error('Error updating oil change interval:', error)
      toast.error('Failed to update oil change interval')
    }
  }
  
  const handleUpdateAirFilterInterval = async () => {
    try {
      const intervalValue = parseInt(airFilterMileageInterval)
      
      if (isNaN(intervalValue) || intervalValue < 1000) {
        toast.error(`Please enter a valid interval (minimum 1000 ${distanceUnit})`)
        return
      }
      
      const { error } = await supabase
        .from('trucks')
        .update({ airFilterMileageInterval: intervalValue })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({ ...truck, airFilterMileageInterval: intervalValue })
      setEditingAirFilterInterval(false)
      toast.success('Air filter change interval updated successfully')
    } catch (error) {
      console.error('Error updating air filter change interval:', error)
      toast.error('Failed to update air filter change interval')
    }
  }
  
  const handleUpdateFuelFilterInterval = async () => {
    try {
      const intervalValue = parseInt(fuelFilterMileageInterval)
      
      if (isNaN(intervalValue) || intervalValue < 1000) {
        toast.error(`Please enter a valid interval (minimum 1000 ${distanceUnit})`)
        return
      }
      
      const { error } = await supabase
        .from('trucks')
        .update({ fuelFilterMileageInterval: intervalValue })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({ ...truck, fuelFilterMileageInterval: intervalValue })
      setEditingFuelFilterInterval(false)
      toast.success('Fuel filter change interval updated successfully')
    } catch (error) {
      console.error('Error updating fuel filter change interval:', error)
      toast.error('Failed to update fuel filter change interval')
    }
  }
  
  const handleUpdateDpfCleaningInterval = async () => {
    try {
      const intervalValue = parseInt(dpfCleaningMileageInterval)
      
      if (isNaN(intervalValue) || intervalValue < 1000) {
        toast.error(`Please enter a valid interval (minimum 1000 ${distanceUnit})`)
        return
      }
      
      const { error } = await supabase
        .from('trucks')
        .update({ dpfCleaningMileageInterval: intervalValue })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({ ...truck, dpfCleaningMileageInterval: intervalValue })
      setEditingDpfCleaningInterval(false)
      toast.success('DPF cleaning interval updated successfully')
    } catch (error) {
      console.error('Error updating DPF cleaning interval:', error)
      toast.error('Failed to update DPF cleaning interval')
    }
  }
  
  // Handler for checkbox toggle
  const handleUnitToggle = (e) => {
    const newUnit = e.target.checked ? 'miles' : 'km'
    setDistanceUnit(newUnit)
  }
  
  const handleUpdateDistanceUnit = async () => {
    try {
      if (distanceUnit !== 'miles' && distanceUnit !== 'km') {
        toast.error('Please select a valid distance unit (miles or km)')
        return
      }
      
      // Calculate new intervals based on the selected unit
      let newOilInterval = truck.oilChangeMileageInterval
      let newAirFilterInterval = truck.airFilterMileageInterval
      let newFuelFilterInterval = truck.fuelFilterMileageInterval
      let newDpfCleaningInterval = truck.dpfCleaningMileageInterval
      let newCurrentMileage = truck.currentMileage
      
      // If changing from miles to km, multiply by 1.60934
      if (truck.distanceUnit === 'miles' && distanceUnit === 'km') {
        const conversionFactor = 1.60934
        newOilInterval = Math.round(truck.oilChangeMileageInterval * conversionFactor)
        newAirFilterInterval = Math.round(truck.airFilterMileageInterval * conversionFactor)
        newFuelFilterInterval = Math.round(truck.fuelFilterMileageInterval * conversionFactor)
        newDpfCleaningInterval = Math.round(truck.dpfCleaningMileageInterval * conversionFactor)
        newCurrentMileage = Math.round(truck.currentMileage * conversionFactor)
      }
      // If changing from km to miles, divide by 1.60934
      else if (truck.distanceUnit === 'km' && distanceUnit === 'miles') {
        const conversionFactor = 1.60934
        newOilInterval = Math.round(truck.oilChangeMileageInterval / conversionFactor)
        newAirFilterInterval = Math.round(truck.airFilterMileageInterval / conversionFactor)
        newFuelFilterInterval = Math.round(truck.fuelFilterMileageInterval / conversionFactor)
        newDpfCleaningInterval = Math.round(truck.dpfCleaningMileageInterval / conversionFactor)
        newCurrentMileage = Math.round(truck.currentMileage / conversionFactor)
      }
      
      // Update the truck record with new unit and converted values
      const { error } = await supabase
        .from('trucks')
        .update({ 
          distanceUnit,
          oilChangeMileageInterval: newOilInterval,
          airFilterMileageInterval: newAirFilterInterval,
          fuelFilterMileageInterval: newFuelFilterInterval,
          dpfCleaningMileageInterval: newDpfCleaningInterval,
          currentMileage: newCurrentMileage
        })
        .eq('id', truck.id)
      
      if (error) throw error
      
      // Update local state
      setTruck({
        ...truck,
        distanceUnit,
        oilChangeMileageInterval: newOilInterval,
        airFilterMileageInterval: newAirFilterInterval,
        fuelFilterMileageInterval: newFuelFilterInterval,
        dpfCleaningMileageInterval: newDpfCleaningInterval,
        currentMileage: newCurrentMileage
      })
      
      // Update form state values
      setCurrentMileage(newCurrentMileage.toString())
      setOilChangeMileageInterval(newOilInterval.toString())
      setAirFilterMileageInterval(newAirFilterInterval.toString())
      setFuelFilterMileageInterval(newFuelFilterInterval.toString())
      setDpfCleaningMileageInterval(newDpfCleaningInterval.toString())
      
      setEditingDistanceUnit(false)
      toast.success('Distance unit updated successfully')
    } catch (error) {
      console.error('Error updating distance unit:', error)
      toast.error('Failed to update distance unit')
    }
  }
  
  const handleUpdateSafetyInspection = async () => {
    try {
      // Validate date
      if (!safetyInspectionDate) {
        toast.error('Please enter the safety inspection date')
        return
      }
      
      const inspectionDate = new Date(safetyInspectionDate)
      
      // Calculate expiry date (1 year after inspection date)
      const expiryDate = addYears(inspectionDate, 1)
      const formattedExpiryDate = format(expiryDate, 'yyyy-MM-dd')
      
      const { error } = await supabase
        .from('trucks')
        .update({
          safetyInspectionDate: safetyInspectionDate,
          safetyInspectionExpiryDate: formattedExpiryDate
        })
        .eq('id', truck.id)
      
      if (error) throw error
      
      setTruck({
        ...truck,
        safetyInspectionDate: safetyInspectionDate,
        safetyInspectionExpiryDate: formattedExpiryDate
      })
      setEditingSafetyInspection(false)
      toast.success('Safety inspection information updated successfully')
    } catch (error) {
      console.error('Error updating safety inspection:', error)
      toast.error('Failed to update safety inspection information')
    }
  }
  
  const handleDeleteTruck = async () => {
    try {
      const { error } = await supabase
        .from('trucks')
        .delete()
        .eq('id', truck.id)
      
      if (error) throw error
      
      toast.success('Truck deleted successfully')
      navigate('/trucks')
    } catch (error) {
      console.error('Error deleting truck:', error)
      toast.error('Failed to delete truck')
    }
  }
  
  const handleMaintenanceComplete = async () => {
    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      // Ensure values have defaults
      const updatedTruck = {
        ...data,
        currentMileage: data.currentMileage || 0,
        oilChangeMileageInterval: data.oilChangeMileageInterval || (data.distanceUnit === 'miles' ? 5000 : 8000),
        airFilterMileageInterval: data.airFilterMileageInterval || (data.distanceUnit === 'miles' ? 15000 : 24000),
        fuelFilterMileageInterval: data.fuelFilterMileageInterval || (data.distanceUnit === 'miles' ? 25000 : 40000),
        dpfCleaningMileageInterval: data.dpfCleaningMileageInterval || (data.distanceUnit === 'miles' ? 100000 : 160000),
        distanceUnit: data.distanceUnit || 'km',
        safetyInspectionDate: data.safetyInspectionDate || null,
        safetyInspectionExpiryDate: data.safetyInspectionExpiryDate || null,
        unitNumber: data.unitNumber || ''
      }
      
      setTruck(updatedTruck)
      setShowMaintenanceForm(null)
      toast.success('Maintenance record updated')
    } catch (error) {
      console.error('Error refreshing truck data:', error)
    }
  }
  
  const getMaintenanceStatus = (type) => {
    if (!truck || !truck.maintenanceHistory) return { status: 'unknown', color: 'gray' }
    
    const maintenance = truck.maintenanceHistory.find(m => m.type === type)
    
    // Get the appropriate interval based on maintenance type
    let interval = 0
    if (type === 'oil') {
      interval = truck.oilChangeMileageInterval || (truck.distanceUnit === 'miles' ? 5000 : 8000)
    } else if (type === 'airFilter') {
      interval = truck.airFilterMileageInterval || (truck.distanceUnit === 'miles' ? 15000 : 24000)
    } else if (type === 'fuelFilter') {
      interval = truck.fuelFilterMileageInterval || (truck.distanceUnit === 'miles' ? 25000 : 40000)
    } else if (type === 'dpfCleaning') {
      interval = truck.dpfCleaningMileageInterval || (truck.distanceUnit === 'miles' ? 100000 : 160000)
    }
    
    if (!maintenance) {
      // For any maintenance type with an interval, check if we're approaching due
      if (interval > 0) {
        return {
          status: 'due',
          color: 'red',
          nextMileage: truck.currentMileage // Due immediately for first service
        }
      }
      
      return { status: 'unknown', color: 'gray' }
    }
    
    // Calculate next due mileage based on maintenance type and interval
    let nextMileage = null
    if (interval > 0 && maintenance.mileage) {
      nextMileage = maintenance.mileage + interval
    }
    
    // Check if maintenance is due by date or mileage
    let isDue = false
    
    // Check date
    if (maintenance.nextDate) {
      const nextDate = new Date(maintenance.nextDate)
      const today = new Date()
      if (today > nextDate) {
        isDue = true
      }
    }
    
    // Check mileage
    if (nextMileage && truck.currentMileage >= nextMileage) {
      isDue = true
    }
    
    // Check if maintenance is approaching due (within threshold)
    const approachingThreshold = truck.distanceUnit === 'miles' ? 500 : 800 // ~500 miles or ~800 km
    const isApproachingDue = interval > 0 && 
      !isDue && 
      nextMileage && 
      truck.currentMileage + approachingThreshold >= nextMileage && 
      truck.currentMileage < nextMileage
    
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
      nextMileage
    }
  }
  
  const getSafetyInspectionStatus = () => {
    if (!truck || !truck.safetyInspectionDate || !truck.safetyInspectionExpiryDate) {
      return { status: 'unknown', color: 'gray' }
    }
    
    const today = new Date()
    const expiryDate = new Date(truck.safetyInspectionExpiryDate)
    
    // Check if safety inspection is expired
    if (isAfter(today, expiryDate)) {
      return { status: 'due', color: 'red' }
    }
    
    // Check if expiry date is approaching (within 30 days)
    const approachingDate = addDays(today, 30)
    if (isBefore(expiryDate, approachingDate)) {
      return { status: 'approaching', color: 'yellow' }
    }
    
    return { status: 'ok', color: 'green' }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  if (!truck) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-secondary-800 mb-2">Truck Not Found</h2>
        <p className="text-secondary-500 mb-6">The truck you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/trucks')}
          className="btn btn-primary"
        >
          Back to Truck List
        </button>
      </div>
    )
  }
  
  // Ensure currentMileage exists and has a default value
  const displayMileage = truck.currentMileage || 0
  
  const baseUrl = window.location.origin
  const qrValue = `${baseUrl}/trucks/${truck.id}`
  
  // Get maintenance status for each type
  const oilStatus = getMaintenanceStatus('oil')
  const airFilterStatus = getMaintenanceStatus('airFilter')
  const fuelFilterStatus = getMaintenanceStatus('fuelFilter')
  const dpfCleaningStatus = getMaintenanceStatus('dpfCleaning')
  const safetyInspectionStatus = getSafetyInspectionStatus()
  
  // Format safety inspection dates for display
  const formattedSafetyInspectionDate = truck.safetyInspectionDate 
    ? format(new Date(truck.safetyInspectionDate), 'MMM d, yyyy') 
    : 'Not recorded'
  
  const formattedSafetyInspectionExpiryDate = truck.safetyInspectionExpiryDate 
    ? format(new Date(truck.safetyInspectionExpiryDate), 'MMM d, yyyy') 
    : 'Not recorded'
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary-800 mb-4 md:mb-0">
          {truck.year} {truck.make} {truck.model}
        </h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPrintQR(true)}
            className="btn btn-secondary flex items-center"
          >
            <FaPrint className="mr-2" />
            Print QR
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger flex items-center"
          >
            <FaTrash className="mr-2" />
            Delete
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-secondary-800">Truck Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-secondary-500">VIN</p>
                <p className="font-medium text-black">{truck.vin}</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">Unit Number</p>
                  {!editingUnitNumber && (
                    <button
                      onClick={() => setEditingUnitNumber(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      {truck.unitNumber ? 'Edit' : 'Add'}
                    </button>
                  )}
                </div>
                
                {editingUnitNumber ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="text"
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      className="form-input mr-2"
                      placeholder="e.g. T-123"
                    />
                    <button
                      onClick={handleUpdateUnitNumber}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingUnitNumber(false)
                        setUnitNumber(truck.unitNumber || '')
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="font-bold text-red-600">
                    {truck.unitNumber || 'Not assigned'}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-secondary-500">Year</p>
                <p className="font-medium text-black">{truck.year}</p>
              </div>
              
              <div>
                <p className="text-sm text-secondary-500">Make</p>
                <p className="font-medium text-black">{truck.make}</p>
              </div>
              
              <div>
                <p className="text-sm text-secondary-500">Model</p>
                <p className="font-medium text-black">{truck.model}</p>
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">Distance Unit</p>
                  {!editingDistanceUnit && (
                    <button
                      onClick={() => setEditingDistanceUnit(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaExchangeAlt className="mr-1" />
                      Change
                    </button>
                  )}
                </div>
                
                {editingDistanceUnit ? (
                  <div className="flex items-center mt-1">
                    <div className="flex items-center">
                      <span className={`mr-2 ${distanceUnit === 'km' ? 'font-bold text-primary-600' : 'text-secondary-500'}`}>KM</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="distanceUnitToggle"
                          checked={distanceUnit === 'miles'}
                          onChange={handleUnitToggle}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="distanceUnitToggle"
                          className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                        ></label>
                      </div>
                      <span className={distanceUnit === 'miles' ? 'font-bold text-primary-600' : 'text-secondary-500'}>Miles</span>
                    </div>
                    <button
                      onClick={handleUpdateDistanceUnit}
                      className="btn btn-primary text-sm ml-4"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDistanceUnit(false)
                        setDistanceUnit(truck.distanceUnit || 'km')
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
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
                ) : (
                  <p className="font-medium text-black">
                    {truck.distanceUnit === 'miles' ? 'Miles' : 'Kilometers (KM)'}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">
                    Current {truck.distanceUnit === 'miles' ? 'Mileage' : 'Distance (KM)'}
                  </p>
                  {!editingMileage && (
                    <button
                      onClick={() => setEditingMileage(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Update
                    </button>
                  )}
                </div>
                
                {editingMileage ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      value={currentMileage}
                      onChange={(e) => setCurrentMileage(e.target.value)}
                      className="form-input mr-2"
                    />
                    <span className="mr-2">{truck.distanceUnit}</span>
                    <button
                      onClick={handleUpdateMileage}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingMileage(false)
                        setCurrentMileage((truck.currentMileage || 0).toString())
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-black">
                    {displayMileage.toLocaleString()} {truck.distanceUnit}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">
                    Oil Change Interval ({truck.distanceUnit})
                  </p>
                  {!editingOilInterval && (
                    <button
                      onClick={() => setEditingOilInterval(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Update
                    </button>
                  )}
                </div>
                
                {editingOilInterval ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      value={oilChangeMileageInterval}
                      onChange={(e) => setOilChangeMileageInterval(e.target.value)}
                      className="form-input mr-2"
                      min={1000}
                    />
                    <span className="mr-2">{truck.distanceUnit}</span>
                    <button
                      onClick={handleUpdateOilInterval}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingOilInterval(false)
                        setOilChangeMileageInterval((truck.oilChangeMileageInterval || (truck.distanceUnit === 'miles' ? 5000 : 8000)).toString())
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-black">
                    {(truck.oilChangeMileageInterval || (truck.distanceUnit === 'miles' ? 5000 : 8000)).toLocaleString()} {truck.distanceUnit}
                    
                    {oilStatus.nextMileage && (
                      <span className={`ml-2 text-sm ${oilStatus.color === 'red' ? 'text-red-500' : oilStatus.color === 'yellow' ? 'text-yellow-600' : 'text-green-500'}`}>
                        {oilStatus.status === 'due' && '(OVERDUE)'}
                        {oilStatus.status === 'approaching' && '(DUE SOON)'}
                        {oilStatus.status === 'ok' && '(OK)'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">
                    Air Filter Change Interval ({truck.distanceUnit})
                  </p>
                  {!editingAirFilterInterval && (
                    <button
                      onClick={() => setEditingAirFilterInterval(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Update
                    </button>
                  )}
                </div>
                
                {editingAirFilterInterval ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      value={airFilterMileageInterval}
                      onChange={(e) => setAirFilterMileageInterval(e.target.value)}
                      className="form-input mr-2"
                      min={1000}
                    />
                    <span className="mr-2">{truck.distanceUnit}</span>
                    <button
                      onClick={handleUpdateAirFilterInterval}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingAirFilterInterval(false)
                        setAirFilterMileageInterval((truck.airFilterMileageInterval || (truck.distanceUnit === 'miles' ? 15000 : 24000)).toString())
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-black">
                    {(truck.airFilterMileageInterval || (truck.distanceUnit === 'miles' ? 15000 : 24000)).toLocaleString()} {truck.distanceUnit}
                    
                    {airFilterStatus.nextMileage && (
                      <span className={`ml-2 text-sm ${airFilterStatus.color === 'red' ? 'text-red-500' : airFilterStatus.color === 'yellow' ? 'text-yellow-600' : 'text-green-500'}`}>
                        {airFilterStatus.status === 'due' && '(OVERDUE)'}
                        {airFilterStatus.status === 'approaching' && '(DUE SOON)'}
                        {airFilterStatus.status === 'ok' && '(OK)'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">
                    Fuel Filter Change Interval ({truck.distanceUnit})
                  </p>
                  {!editingFuelFilterInterval && (
                    <button
                      onClick={() => setEditingFuelFilterInterval(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Update
                    </button>
                  )}
                </div>
                
                {editingFuelFilterInterval ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      value={fuelFilterMileageInterval}
                      onChange={(e) => setFuelFilterMileageInterval(e.target.value)}
                      className="form-input mr-2"
                      min={1000}
                    />
                    <span className="mr-2">{truck.distanceUnit}</span>
                    <button
                      onClick={handleUpdateFuelFilterInterval}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingFuelFilterInterval(false)
                        setFuelFilterMileageInterval((truck.fuelFilterMileageInterval || (truck.distanceUnit === 'miles' ? 25000 : 40000)).toString())
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-black">
                    {(truck.fuelFilterMileageInterval || (truck.distanceUnit === 'miles' ? 25000 : 40000)).toLocaleString()} {truck.distanceUnit}
                    
                    {fuelFilterStatus.nextMileage && (
                      <span className={`ml-2 text-sm ${fuelFilterStatus.color === 'red' ? 'text-red-500' : fuelFilterStatus.color === 'yellow' ? 'text-yellow-600' : 'text-green-500'}`}>
                        {fuelFilterStatus.status === 'due' && '(OVERDUE)'}
                        {fuelFilterStatus.status === 'approaching' && '(DUE SOON)'}
                        {fuelFilterStatus.status === 'ok' && '(OK)'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">
                    DPF Cleaning Interval ({truck.distanceUnit})
                  </p>
                  {!editingDpfCleaningInterval && (
                    <button
                      onClick={() => setEditingDpfCleaningInterval(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Update
                    </button>
                  )}
                </div>
                
                {editingDpfCleaningInterval ? (
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      value={dpfCleaningMileageInterval}
                      onChange={(e) => setDpfCleaningMileageInterval(e.target.value)}
                      className="form-input mr-2"
                      min={1000}
                    />
                    <span className="mr-2">{truck.distanceUnit}</span>
                    <button
                      onClick={handleUpdateDpfCleaningInterval}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDpfCleaningInterval(false)
                        setDpfCleaningMileageInterval((truck.dpfCleaningMileageInterval || (truck.distanceUnit === 'miles' ? 100000 : 160000)).toString())
                      }}
                      className="btn btn-secondary text-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="font-medium text-black">
                    {(truck.dpfCleaningMileageInterval || (truck.distanceUnit === 'miles' ? 100000 : 160000)).toLocaleString()} {truck.distanceUnit}
                    
                    {dpfCleaningStatus.nextMileage && (
                      <span className={`ml-2 text-sm ${dpfCleaningStatus.color === 'red' ? 'text-red-500' : dpfCleaningStatus.color === 'yellow' ? 'text-yellow-600' : 'text-green-500'}`}>
                        {dpfCleaningStatus.status === 'due' && '(OVERDUE)'}
                        {dpfCleaningStatus.status === 'approaching' && '(DUE SOON)'}
                        {dpfCleaningStatus.status === 'ok' && '(OK)'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-500">
                    Safety Inspection
                  </p>
                  {!editingSafetyInspection && (
                    <button
                      onClick={() => setEditingSafetyInspection(true)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Update
                    </button>
                  )}
                </div>
                
                {editingSafetyInspection ? (
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center">
                      <label className="w-32 text-sm text-secondary-500">Inspection Date:</label>
                      <input
                        type="date"
                        value={safetyInspectionDate}
                        onChange={(e) => setSafetyInspectionDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="flex items-center mt-2">
                      <button
                        onClick={handleUpdateSafetyInspection}
                        className="btn btn-primary text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingSafetyInspection(false)
                          if (truck.safetyInspectionDate) {
                            setSafetyInspectionDate(format(new Date(truck.safetyInspectionDate), 'yyyy-MM-dd'))
                          } else {
                            setSafetyInspectionDate('')
                          }
                        }}
                        className="btn btn-secondary text-sm ml-2"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-secondary-500 mt-1">
                      Expiry date will be automatically set to 1 year after inspection date.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-black">
                      Inspection Date: {formattedSafetyInspectionDate}
                    </p>
                    <p className="font-medium text-black">
                      Expiry Date: {formattedSafetyInspectionExpiryDate}
                      
                      {truck.safetyInspectionExpiryDate && (
                        <span className={`ml-2 text-sm ${safetyInspectionStatus.color === 'red' ? 'text-red-500' : safetyInspectionStatus.color === 'yellow' ? 'text-yellow-600' : 'text-green-500'}`}>
                          {safetyInspectionStatus.status === 'due' && '(EXPIRED)'}
                          {safetyInspectionStatus.status === 'approaching' && '(EXPIRING SOON)'}
                          {safetyInspectionStatus.status === 'ok' && '(VALID)'}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3 text-secondary-800">Maintenance Actions</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <button
                  onClick={() => setShowMaintenanceForm('oil')}
                  className={`btn ${oilStatus.color === 'red' ? 'btn-danger' : oilStatus.color === 'yellow' ? 'btn-warning' : 'btn-secondary'} flex items-center justify-center`}
                >
                  <FaOilCan className="mr-2" />
                  Oil Change
                  {oilStatus.status === 'due' && <span className="ml-1">!</span>}
                </button>
                
                <button
                  onClick={() => setShowMaintenanceForm('airFilter')}
                  className={`btn ${airFilterStatus.color === 'red' ? 'btn-danger' : airFilterStatus.color === 'yellow' ? 'btn-warning' : 'btn-secondary'} flex items-center justify-center`}
                >
                  <FaFilter className="mr-2" />
                  Air Filter
                  {airFilterStatus.status === 'due' && <span className="ml-1">!</span>}
                </button>
                
                <button
                  onClick={() => setShowMaintenanceForm('fuelFilter')}
                  className={`btn ${fuelFilterStatus.color === 'red' ? 'btn-danger' : fuelFilterStatus.color === 'yellow' ? 'btn-warning' : 'btn-secondary'} flex items-center justify-center`}
                >
                  <FaGasPump className="mr-2" />
                  Fuel Filter
                  {fuelFilterStatus.status === 'due' && <span className="ml-1">!</span>}
                </button>
                
                <button
                  onClick={() => setShowMaintenanceForm('dpfCleaning')}
                  className={`btn ${dpfCleaningStatus.color === 'red' ? 'btn-danger' : dpfCleaningStatus.color === 'yellow' ? 'btn-warning' : 'btn-secondary'} flex items-center justify-center`}
                >
                  <FaSmog className="mr-2" />
                  DPF Cleaning
                  {dpfCleaningStatus.status === 'due' && <span className="ml-1">!</span>}
                </button>
                
                <button
                  onClick={() => setEditingSafetyInspection(true)}
                  className={`btn ${safetyInspectionStatus.color === 'red' ? 'btn-danger' : safetyInspectionStatus.color === 'yellow' ? 'btn-warning' : 'btn-secondary'} flex items-center justify-center`}
                >
                  <FaClipboardCheck className="mr-2" />
                  Safety Inspection
                  {safetyInspectionStatus.status === 'due' && <span className="ml-1">!</span>}
                </button>
              </div>
            </div>
          </div>
          
          {showMaintenanceForm && (
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <MaintenanceForm 
                truck={truck} 
                type={showMaintenanceForm} 
                onComplete={handleMaintenanceComplete} 
              />
            </div>
          )}
          
          <MaintenanceHistory truck={truck} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-secondary-800">QR Code</h2>
          
          <div className="flex justify-center mb-4">
            <QRCode value={qrValue} size={200} />
          </div>
          
          <p className="text-sm text-center mb-4 text-secondary-700">
            Scan this QR code to quickly access this truck's maintenance records.
          </p>
          
          <button
            onClick={() => setShowPrintQR(true)}
            className="btn btn-primary w-full flex items-center justify-center"
          >
            <FaPrint className="mr-2" />
            Print QR Code
          </button>
          
          <p className="text-xs text-center mt-4 text-secondary-500">
            {qrValue}
          </p>
        </div>
      </div>
      
      {showPrintQR && (
        <QRCodePrint 
          truck={truck} 
          onClose={() => setShowPrintQR(false)} 
        />
      )}
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-secondary-800">Confirm Deletion</h2>
            <p className="mb-6 text-secondary-700">
              Are you sure you want to delete this truck and all its maintenance records? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTruck}
                className="btn btn-danger"
              >
                Delete Truck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TruckDetail
