import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { FaTruck, FaExclamationTriangle, FaCheckCircle, FaWrench, FaClipboardCheck, FaSmog, FaFilter, FaGasPump, FaOilCan } from 'react-icons/fa'
import { format, isAfter, isBefore, addDays } from 'date-fns'

const Dashboard = () => {
  const [trucks, setTrucks] = useState([])
  const [stats, setStats] = useState({
    totalTrucks: 0,
    maintenanceDue: 0,
    recentMaintenance: 0
  })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const { data, error } = await supabase
          .from('trucks')
          .select('*')
        
        if (error) throw error
        
        // Add debugging for Unit 103
        const unit103 = data.find(truck => truck.unitNumber === '103');
        if (unit103) {
          console.log('Unit 103 data:', unit103);
          console.log('Unit 103 maintenance due check:', checkTruckMaintenanceDue(unit103));
          
          // Check fuel filter specifically
          if (unit103.maintenanceHistory) {
            const fuelFilterRecord = unit103.maintenanceHistory.find(r => r.type === 'fuelFilter');
            if (fuelFilterRecord) {
              console.log('Unit 103 fuel filter record:', fuelFilterRecord);
              const interval = unit103.fuelFilterMileageInterval || 25000;
              const nextDueMileage = fuelFilterRecord.mileage + interval;
              console.log('Unit 103 next due mileage:', nextDueMileage);
              console.log('Unit 103 current mileage:', unit103.currentMileage);
              console.log('Unit 103 fuel filter overdue?', unit103.currentMileage >= nextDueMileage);
            }
          }
        }
        
        setTrucks(data || [])
        
        // Calculate stats
        const total = data.length
        
        // Count trucks with any maintenance due (including safety inspection)
        const maintenanceDue = data.filter(truck => checkTruckMaintenanceDue(truck)).length
        
        const recentMaintenance = data.filter(truck => {
          if (!truck.maintenanceHistory) return false
          
          const lastMonth = new Date()
          lastMonth.setMonth(lastMonth.getMonth() - 1)
          
          return truck.maintenanceHistory.some(record => {
            if (!record.date) return false
            
            const serviceDate = new Date(record.date)
            
            // Check if maintenance was performed in the last month
            return isAfter(serviceDate, lastMonth)
          })
        }).length
        
        setStats({
          totalTrucks: total,
          maintenanceDue,
          recentMaintenance
        })
      } catch (error) {
        console.error('Error fetching trucks:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTrucks()
  }, [])
  
  // Helper function to check if a truck has any maintenance due
  const checkTruckMaintenanceDue = (truck) => {
    if (!truck) return false
    
    // Check if truck has no maintenance history but has intervals set
    if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
      if (truck.oilChangeMileageInterval || truck.airFilterMileageInterval || truck.fuelFilterMileageInterval || truck.dpfCleaningMileageInterval) {
        return true;
      }
    }
    
    // Check oil change maintenance
    if (checkMaintenanceTypeDue(truck, 'oil', truck.oilChangeMileageInterval)) {
      return true;
    }
    
    // Check air filter maintenance
    if (checkMaintenanceTypeDue(truck, 'airFilter', truck.airFilterMileageInterval)) {
      return true;
    }
    
    // Check fuel filter maintenance
    if (checkMaintenanceTypeDue(truck, 'fuelFilter', truck.fuelFilterMileageInterval)) {
      return true;
    }
    
    // Check DPF cleaning maintenance
    if (checkMaintenanceTypeDue(truck, 'dpfCleaning', truck.dpfCleaningMileageInterval)) {
      return true;
    }
    
    // Check safety inspection
    if (truck.safetyInspectionExpiryDate) {
      const expiryDate = new Date(truck.safetyInspectionExpiryDate)
      const today = new Date()
      const thirtyDaysFromNow = addDays(today, 30)
      
      // Check if safety inspection is expired or will expire within 30 days
      if (isAfter(today, expiryDate) || (isAfter(thirtyDaysFromNow, expiryDate) && isAfter(expiryDate, today))) {
        return true;
      }
    } else if (truck.year) {
      // If truck exists but has no safety inspection record
      return true;
    }
    
    return false;
  }
  
  // Helper function to check if a specific maintenance type is due
  const checkMaintenanceTypeDue = (truck, type, interval) => {
    if (!truck) return false;
    
    // If no interval is set but the type exists in the schema, use default values
    if (!interval) {
      if (type === 'oil') interval = 5000;
      else if (type === 'airFilter') interval = 15000;
      else if (type === 'fuelFilter') interval = 25000;
      else if (type === 'dpfCleaning') interval = 100000;
    }
    
    // If no interval, this maintenance type isn't tracked
    if (!interval) return false;
    
    // If no maintenance history, but interval is set, it's due for initial service
    if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
      return true;
    }
    
    // Find the maintenance record for this type
    const record = truck.maintenanceHistory.find(r => r.type === type);
    
    // If no record exists but interval is set, it's due for initial service
    if (!record) return true;
    
    // Check by date
    if (record.nextDate) {
      const nextDate = new Date(record.nextDate);
      const today = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);
      
      // Check if maintenance is due or will be due within the next two weeks
      if (isAfter(today, nextDate) || (isAfter(twoWeeksFromNow, nextDate) && isAfter(nextDate, today))) {
        return true;
      }
    }
    
    // Check by mileage
    if (truck.currentMileage && record.mileage) {
      // Calculate next due mileage
      const nextDueMileage = record.mileage + interval;
      
      // If current mileage is within threshold of next due mileage or has exceeded it
      const approachingThreshold = truck.distanceUnit === 'miles' ? 500 : 800; // ~500 miles or ~800 km
      if (truck.currentMileage + approachingThreshold >= nextDueMileage || truck.currentMileage >= nextDueMileage) {
        return true;
      }
    }
    
    return false;
  }
  
  // Helper function to check if a truck has any overdue maintenance (not just approaching)
  const hasOverdueMaintenance = (truck) => {
    if (!truck) return false;
    
    // Check if truck has no maintenance history but has intervals set
    if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
      if (truck.oilChangeMileageInterval || truck.airFilterMileageInterval || truck.fuelFilterMileageInterval || truck.dpfCleaningMileageInterval) {
        return true;
      }
    }
    
    // Check regular maintenance by date
    if (truck.maintenanceHistory && truck.maintenanceHistory.some(record => {
      if (!record.nextDate) return false;
      
      const nextDate = new Date(record.nextDate);
      const today = new Date();
      
      // Check if next maintenance date is in the past
      return isAfter(today, nextDate);
    })) {
      return true;
    }
    
    // Check regular maintenance by mileage
    if (truck.maintenanceHistory && truck.currentMileage && truck.maintenanceHistory.some(record => {
      if (!record.type || !record.mileage) return false;
      
      // Get the appropriate interval based on maintenance type
      let interval = 0;
      if (record.type === 'oil') {
        interval = truck.oilChangeMileageInterval || 5000;
      } else if (record.type === 'airFilter') {
        interval = truck.airFilterMileageInterval || 15000;
      } else if (record.type === 'fuelFilter') {
        interval = truck.fuelFilterMileageInterval || 25000;
      } else if (record.type === 'dpfCleaning') {
        interval = truck.dpfCleaningMileageInterval || 100000;
      }
      
      // Calculate next due mileage
      const nextDueMileage = record.mileage + interval;
      
      // Check if current mileage exceeds next due mileage
      return truck.currentMileage >= nextDueMileage;
    })) {
      return true;
    }
    
    // Check safety inspection
    if (truck.safetyInspectionExpiryDate) {
      const expiryDate = new Date(truck.safetyInspectionExpiryDate);
      const today = new Date();
      
      // Check if safety inspection is expired
      if (isAfter(today, expiryDate)) {
        return true;
      }
    } else if (truck.year) {
      // If truck exists but has no safety inspection record
      return true;
    }
    
    return false;
  }
  
  // Get trucks that need maintenance soon
  const trucksDueMaintenance = trucks
    .filter(truck => {
      // Special debug for Unit 103
      if (truck.unitNumber === '103') {
        const isDue = checkTruckMaintenanceDue(truck);
        console.log('Unit 103 is due for maintenance?', isDue);
        return isDue;
      }
      return checkTruckMaintenanceDue(truck);
    })
    .sort((a, b) => {
      // Sort by maintenance urgency (prioritize overdue items)
      const aHasOverdue = hasOverdueMaintenance(a);
      const bHasOverdue = hasOverdueMaintenance(b);
      
      if (aHasOverdue && !bHasOverdue) return -1;
      if (!aHasOverdue && bHasOverdue) return 1;
      
      // If both have same overdue status, sort by most recent service date
      return 0;
    });
  
  // Get top 5 trucks due for maintenance
  const topTrucksDueMaintenance = trucksDueMaintenance.slice(0, 5);
  
  // Get recently serviced trucks
  const recentlyServiced = [...trucks]
    .filter(truck => truck.maintenanceHistory && truck.maintenanceHistory.length > 0)
    .sort((a, b) => {
      const aLatest = a.maintenanceHistory.reduce((latest, record) => {
        if (!record.date) return latest
        const recordDate = new Date(record.date)
        return !latest || recordDate > latest ? recordDate : latest
      }, null)
      
      const bLatest = b.maintenanceHistory.reduce((latest, record) => {
        if (!record.date) return latest
        const recordDate = new Date(record.date)
        return !latest || recordDate > latest ? recordDate : latest
      }, null)
      
      if (!aLatest) return 1
      if (!bLatest) return -1
      return bLatest - aLatest
    })
    .slice(0, 5) // Get top 5
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary-800 mb-6">Fleet Maintenance Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-primary-100 p-3 mr-4">
            <FaTruck className="text-primary-600 text-xl" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">Total Trucks</p>
            <p className="text-2xl font-bold text-secondary-800">{stats.totalTrucks}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-yellow-100 p-3 mr-4">
            <FaExclamationTriangle className="text-yellow-600 text-xl" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">Maintenance Due</p>
            <p className="text-2xl font-bold text-secondary-800">{stats.maintenanceDue}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <FaCheckCircle className="text-green-600 text-xl" />
          </div>
          <div>
            <p className="text-sm text-secondary-500">Recent Maintenance</p>
            <p className="text-2xl font-bold text-secondary-800">{stats.recentMaintenance}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-secondary-800">Maintenance Due Soon</h2>
            <Link to="/trucks" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          {topTrucksDueMaintenance.length === 0 ? (
            <p className="text-center text-secondary-500 py-8">No maintenance due soon</p>
          ) : (
            <div className="space-y-4">
              {topTrucksDueMaintenance.map(truck => {
                // Get all maintenance items that are due or approaching due
                const dueItems = [];
                
                // Check if truck has no maintenance history but has intervals set
                if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
                  if (truck.oilChangeMileageInterval) {
                    dueItems.push({
                      type: 'oil',
                      status: 'due',
                      message: 'Initial service needed'
                    });
                  }
                  if (truck.airFilterMileageInterval) {
                    dueItems.push({
                      type: 'airFilter',
                      status: 'due',
                      message: 'Initial service needed'
                    });
                  }
                  if (truck.fuelFilterMileageInterval) {
                    dueItems.push({
                      type: 'fuelFilter',
                      status: 'due',
                      message: 'Initial service needed'
                    });
                  }
                  if (truck.dpfCleaningMileageInterval) {
                    dueItems.push({
                      type: 'dpfCleaning',
                      status: 'due',
                      message: 'Initial service needed'
                    });
                  }
                } else {
                  // Check each maintenance type
                  const maintenanceTypes = ['oil', 'airFilter', 'fuelFilter', 'dpfCleaning'];
                  const today = new Date();
                  const twoWeeksFromNow = new Date();
                  twoWeeksFromNow.setDate(today.getDate() + 14);
                  
                  maintenanceTypes.forEach(type => {
                    // Get the appropriate interval based on maintenance type
                    let interval = 0;
                    if (type === 'oil') {
                      interval = truck.oilChangeMileageInterval || 5000;
                    } else if (type === 'airFilter') {
                      interval = truck.airFilterMileageInterval || 15000;
                    } else if (type === 'fuelFilter') {
                      interval = truck.fuelFilterMileageInterval || 25000;
                    } else if (type === 'dpfCleaning') {
                      interval = truck.dpfCleaningMileageInterval || 100000;
                    }
                    
                    // If no interval is set, skip this maintenance type
                    if (!interval) return;
                    
                    const record = truck.maintenanceHistory.find(r => r.type === type);
                    
                    if (!record) {
                      // If no record exists but interval is set, it's due for initial service
                      dueItems.push({
                        type,
                        status: 'due',
                        message: 'Initial service needed'
                      });
                      return;
                    }
                    
                    // Check by date
                    let dateStatus = null;
                    if (record.nextDate) {
                      const nextDate = new Date(record.nextDate);
                      
                      if (isAfter(today, nextDate)) {
                        dateStatus = {
                          type,
                          status: 'overdue',
                          message: `Due on ${format(nextDate, 'MMM d, yyyy')}`,
                          date: record.nextDate
                        };
                      } else if (isAfter(twoWeeksFromNow, nextDate)) {
                        dateStatus = {
                          type,
                          status: 'approaching',
                          message: `Due on ${format(nextDate, 'MMM d, yyyy')}`,
                          date: record.nextDate
                        };
                      }
                    }
                    
                    // Check by mileage
                    let mileageStatus = null;
                    if (record.mileage && truck.currentMileage) {
                      // Calculate next due mileage
                      const nextDueMileage = record.mileage + interval;
                      const approachingThreshold = truck.distanceUnit === 'miles' ? 500 : 800;
                      
                      if (truck.currentMileage >= nextDueMileage) {
                        mileageStatus = {
                          type,
                          status: 'overdue',
                          message: `Due at ${nextDueMileage.toLocaleString()} ${truck.distanceUnit || 'miles'}`,
                          mileage: nextDueMileage
                        };
                      } else if (truck.currentMileage + approachingThreshold >= nextDueMileage) {
                        mileageStatus = {
                          type,
                          status: 'approaching',
                          message: `Due at ${nextDueMileage.toLocaleString()} ${truck.distanceUnit || 'miles'}`,
                          mileage: nextDueMileage
                        };
                      }
                    }
                    
                    // Add the most critical status (overdue > approaching)
                    if (dateStatus && dateStatus.status === 'overdue') {
                      dueItems.push(dateStatus);
                    } else if (mileageStatus && mileageStatus.status === 'overdue') {
                      dueItems.push(mileageStatus);
                    } else if (dateStatus && dateStatus.status === 'approaching') {
                      dueItems.push(dateStatus);
                    } else if (mileageStatus && mileageStatus.status === 'approaching') {
                      dueItems.push(mileageStatus);
                    }
                  });
                }
                
                // Check safety inspection
                if (truck.safetyInspectionExpiryDate) {
                  const expiryDate = new Date(truck.safetyInspectionExpiryDate);
                  const today = new Date();
                  const thirtyDaysFromNow = addDays(today, 30);
                  
                  if (isAfter(today, expiryDate)) {
                    dueItems.push({
                      type: 'safetyInspection',
                      status: 'overdue',
                      message: `Expired on ${format(expiryDate, 'MMM d, yyyy')}`,
                      date: truck.safetyInspectionExpiryDate
                    });
                  } else if (isAfter(thirtyDaysFromNow, expiryDate)) {
                    dueItems.push({
                      type: 'safetyInspection',
                      status: 'approaching',
                      message: `Expires on ${format(expiryDate, 'MMM d, yyyy')}`,
                      date: truck.safetyInspectionExpiryDate
                    });
                  }
                } else if (truck.year) {
                  // If truck exists but has no safety inspection record
                  dueItems.push({
                    type: 'safetyInspection',
                    status: 'due',
                    message: 'Safety inspection needed'
                  });
                }
                
                // If no due items were found, skip this truck
                if (dueItems.length === 0) return null;
                
                return (
                  <div key={truck.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-black">{truck.year} {truck.make} {truck.model}</h3>
                        {truck.unitNumber && (
                          <p className="text-sm font-bold text-red-600">Unit: {truck.unitNumber}</p>
                        )}
                        <p className="text-sm text-black">VIN: {truck.vin}</p>
                      </div>
                      <Link 
                        to={`/trucks/${truck.id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View
                      </Link>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium text-black">Maintenance Due:</p>
                      <div className="mt-1 space-y-1">
                        {dueItems.map((item, index) => {
                          const typeLabels = {
                            oil: 'Oil Change',
                            airFilter: 'Air Filter',
                            fuelFilter: 'Fuel Filter',
                            dpfCleaning: 'DPF Cleaning',
                            safetyInspection: 'Safety Inspection'
                          };
                          
                          const statusColors = {
                            overdue: 'text-red-500',
                            approaching: 'text-yellow-600',
                            due: 'text-red-500'
                          };
                          
                          const icons = {
                            oil: <FaOilCan className={`${item.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} mr-2`} />,
                            airFilter: <FaFilter className={`${item.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} mr-2`} />,
                            fuelFilter: <FaGasPump className={`${item.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} mr-2`} />,
                            dpfCleaning: <FaSmog className={`${item.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} mr-2`} />,
                            safetyInspection: <FaClipboardCheck className={`${item.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} mr-2`} />
                          };
                          
                          return (
                            <div key={index} className="flex items-center text-sm">
                              {icons[item.type] || <FaWrench className={`${item.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} mr-2`} />}
                              <span className="text-black">{typeLabels[item.type] || item.type}: </span>
                              <span className={`ml-1 ${statusColors[item.status] || 'text-black'}`}>
                                {item.message}
                                {item.status === 'overdue' && ' (OVERDUE)'}
                                {item.status === 'approaching' && ' (SOON)'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-secondary-800">Recently Serviced</h2>
            <Link to="/trucks" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          {recentlyServiced.length === 0 ? (
            <p className="text-center text-secondary-500 py-8">No recent maintenance records</p>
          ) : (
            <div className="space-y-4">
              {recentlyServiced.map(truck => {
                // Find the most recent maintenance record
                const latestRecord = truck.maintenanceHistory.reduce((latest, record) => {
                  if (!record.date) return latest
                  
                  const recordDate = new Date(record.date)
                  return !latest || recordDate > new Date(latest.date) ? record : latest
                }, null)
                
                if (!latestRecord) return null
                
                const typeLabels = {
                  oil: 'Oil Change',
                  airFilter: 'Air Filter Change',
                  fuelFilter: 'Fuel Filter Change',
                  dpfCleaning: 'DPF Cleaning',
                  safetyInspection: 'Safety Inspection'
                }
                
                // Check if this truck also has maintenance due
                const hasDueMaintenance = checkTruckMaintenanceDue(truck);
                const maintenanceStatus = hasDueMaintenance ? 
                  <span className="text-xs text-red-500 font-medium ml-2">(Maintenance Due)</span> : 
                  null;
                
                return (
                  <div key={truck.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-black">{truck.year} {truck.make} {truck.model}</h3>
                        {truck.unitNumber && (
                          <p className="text-sm font-bold text-red-600">Unit: {truck.unitNumber}</p>
                        )}
                        <p className="text-sm text-black">VIN: {truck.vin}</p>
                      </div>
                      <Link 
                        to={`/trucks/${truck.id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View
                      </Link>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium text-black">
                        Recent Service: {maintenanceStatus}
                      </p>
                      <div className="mt-1 text-sm">
                        <p>
                          <span className="text-black font-medium">Type:</span> <span className="text-black">{typeLabels[latestRecord.type] || latestRecord.type}</span>
                        </p>
                        <p>
                          <span className="text-black font-medium">Date:</span> <span className="text-black">{format(new Date(latestRecord.date), 'MMM d, yyyy')}</span>
                        </p>
                        <p>
                          <span className="text-black font-medium">Mileage:</span> <span className="text-black">{latestRecord.mileage.toLocaleString()} {truck.distanceUnit || 'miles'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
