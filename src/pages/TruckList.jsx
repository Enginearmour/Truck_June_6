import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import TruckCard from '../components/TruckCard'
import { FaPlus, FaUpload, FaSearch, FaSortAmountDown, FaOilCan, FaFilter, FaGasPump, FaSmog, FaClipboardCheck } from 'react-icons/fa'
import { isAfter, isBefore, addDays, parseISO } from 'date-fns'

const TruckList = () => {
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortByUrgency, setSortByUrgency] = useState(true)
  const [sortByType, setSortByType] = useState('all') // 'all', 'oil', 'airFilter', 'fuelFilter', 'dpfCleaning', 'safetyInspection'
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const { data, error } = await supabase
          .from('trucks')
          .select('*')
        
        if (error) throw error
        
        setTrucks(data || [])
      } catch (error) {
        console.error('Error fetching trucks:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTrucks()
  }, [])
  
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
    const record = truck.maintenanceHistory?.find(r => r.type === type);
    
    // If no record exists but interval is set, it's due for initial service
    if (!record) return true;
    
    // Check by date
    if (record.nextDate) {
      const nextDate = new Date(record.nextDate);
      const today = new Date();
      
      // Check if maintenance is due
      if (isAfter(today, nextDate)) {
        return true;
      }
    }
    
    // Check by mileage
    if (truck.currentMileage && record.mileage) {
      // Calculate next due mileage
      const nextDueMileage = record.mileage + interval;
      
      // If current mileage has exceeded next due mileage
      if (truck.currentMileage >= nextDueMileage) {
        return true;
      }
    }
    
    return false;
  }
  
  // Helper function to check if a specific maintenance type is approaching due
  const isMaintenanceApproachingDue = (truck, type, interval) => {
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
    
    // If already due, it's not "approaching" due
    if (checkMaintenanceTypeDue(truck, type, interval)) {
      return false;
    }
    
    // Find the maintenance record for this type
    const record = truck.maintenanceHistory?.find(r => r.type === type);
    
    // If no record exists, it's due for initial service, not approaching
    if (!record) return false;
    
    // Check by date
    if (record.nextDate) {
      const nextDate = new Date(record.nextDate);
      const today = new Date();
      const twoWeeksFromNow = addDays(today, 14);
      
      // Check if maintenance will be due within the next two weeks
      if (isAfter(twoWeeksFromNow, nextDate) && isAfter(nextDate, today)) {
        return true;
      }
    }
    
    // Check by mileage
    if (truck.currentMileage && record.mileage) {
      // Calculate next due mileage
      const nextDueMileage = record.mileage + interval;
      
      // If current mileage is within threshold of next due mileage
      const approachingThreshold = truck.distanceUnit === 'miles' ? 500 : 800; // ~500 miles or ~800 km
      if (truck.currentMileage + approachingThreshold >= nextDueMileage && truck.currentMileage < nextDueMileage) {
        return true;
      }
    }
    
    return false;
  }
  
  // Helper function to check if safety inspection is due
  const isSafetyInspectionDue = (truck) => {
    if (!truck.safetyInspectionExpiryDate) {
      return truck.year ? true : false; // If truck exists but has no safety inspection record
    }
    
    const expiryDate = new Date(truck.safetyInspectionExpiryDate);
    const today = new Date();
    
    // Check if safety inspection is expired
    return isAfter(today, expiryDate);
  }
  
  // Helper function to check if safety inspection is approaching due
  const isSafetyInspectionApproachingDue = (truck) => {
    if (!truck.safetyInspectionExpiryDate || isSafetyInspectionDue(truck)) {
      return false;
    }
    
    const expiryDate = new Date(truck.safetyInspectionExpiryDate);
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    
    // Check if safety inspection will expire within 30 days
    return isAfter(thirtyDaysFromNow, expiryDate) && isAfter(expiryDate, today);
  }
  
  // Calculate urgency score for a truck (higher = more urgent)
  const getUrgencyScore = (truck) => {
    if (!truck) return 0;
    
    let score = 0;
    
    // Check for overdue maintenance items (highest priority)
    if (checkMaintenanceTypeDue(truck, 'oil', truck.oilChangeMileageInterval)) score += 100;
    if (checkMaintenanceTypeDue(truck, 'airFilter', truck.airFilterMileageInterval)) score += 90;
    if (checkMaintenanceTypeDue(truck, 'fuelFilter', truck.fuelFilterMileageInterval)) score += 80;
    if (checkMaintenanceTypeDue(truck, 'dpfCleaning', truck.dpfCleaningMileageInterval)) score += 70;
    if (isSafetyInspectionDue(truck)) score += 110; // Safety inspection is most critical
    
    // Check for approaching maintenance items (medium priority)
    if (isMaintenanceApproachingDue(truck, 'oil', truck.oilChangeMileageInterval)) score += 50;
    if (isMaintenanceApproachingDue(truck, 'airFilter', truck.airFilterMileageInterval)) score += 45;
    if (isMaintenanceApproachingDue(truck, 'fuelFilter', truck.fuelFilterMileageInterval)) score += 40;
    if (isMaintenanceApproachingDue(truck, 'dpfCleaning', truck.dpfCleaningMileageInterval)) score += 35;
    if (isSafetyInspectionApproachingDue(truck)) score += 55;
    
    // If truck has no maintenance history at all, it's a high priority
    if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
      score += 60;
    }
    
    return score;
  }
  
  // Calculate urgency score for a specific maintenance type
  const getMaintenanceTypeUrgencyScore = (truck, type) => {
    if (!truck) return 0;
    
    let score = 0;
    
    // Different scoring based on maintenance type
    if (type === 'oil') {
      if (checkMaintenanceTypeDue(truck, 'oil', truck.oilChangeMileageInterval)) score += 100;
      if (isMaintenanceApproachingDue(truck, 'oil', truck.oilChangeMileageInterval)) score += 50;
    } 
    else if (type === 'airFilter') {
      if (checkMaintenanceTypeDue(truck, 'airFilter', truck.airFilterMileageInterval)) score += 100;
      if (isMaintenanceApproachingDue(truck, 'airFilter', truck.airFilterMileageInterval)) score += 50;
    }
    else if (type === 'fuelFilter') {
      if (checkMaintenanceTypeDue(truck, 'fuelFilter', truck.fuelFilterMileageInterval)) score += 100;
      if (isMaintenanceApproachingDue(truck, 'fuelFilter', truck.fuelFilterMileageInterval)) score += 50;
    }
    else if (type === 'dpfCleaning') {
      if (checkMaintenanceTypeDue(truck, 'dpfCleaning', truck.dpfCleaningMileageInterval)) score += 100;
      if (isMaintenanceApproachingDue(truck, 'dpfCleaning', truck.dpfCleaningMileageInterval)) score += 50;
    }
    else if (type === 'safetyInspection') {
      if (isSafetyInspectionDue(truck)) score += 100;
      if (isSafetyInspectionApproachingDue(truck)) score += 50;
    }
    
    // If no maintenance history for this type, it's a high priority
    if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
      score += 60;
    } else if (!truck.maintenanceHistory.find(r => r.type === type) && type !== 'safetyInspection') {
      score += 60;
    }
    
    return score;
  }
  
  // Calculate overdue mileage for a specific maintenance type
  const getOverdueMileage = (truck, type) => {
    if (!truck || !truck.currentMileage) return 0;
    
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
    
    // If no interval, this maintenance type isn't tracked
    if (!interval) return 0;
    
    // If no maintenance history, return current mileage as overdue
    if (!truck.maintenanceHistory || truck.maintenanceHistory.length === 0) {
      return truck.currentMileage;
    }
    
    // Find the maintenance record for this type
    const record = truck.maintenanceHistory.find(r => r.type === type);
    
    // If no record exists, return current mileage as overdue
    if (!record) return truck.currentMileage;
    
    // Calculate next due mileage
    const nextDueMileage = record.mileage + interval;
    
    // If current mileage has exceeded next due mileage, calculate how much it's overdue
    if (truck.currentMileage >= nextDueMileage) {
      return truck.currentMileage - nextDueMileage;
    }
    
    return 0;
  }
  
  // Helper function to determine if a maintenance item is overdue
  const isMaintenanceOverdue = (truck, type) => {
    if (type === 'safetyInspection') {
      return isSafetyInspectionDue(truck);
    } else {
      let interval = 0;
      if (type === 'oil') interval = truck.oilChangeMileageInterval;
      else if (type === 'airFilter') interval = truck.airFilterMileageInterval;
      else if (type === 'fuelFilter') interval = truck.fuelFilterMileageInterval;
      else if (type === 'dpfCleaning') interval = truck.dpfCleaningMileageInterval;
      
      return checkMaintenanceTypeDue(truck, type, interval);
    }
  }
  
  // Helper function to get safety inspection expiry date as Date object
  const getSafetyInspectionExpiryDate = (truck) => {
    if (!truck || !truck.safetyInspectionExpiryDate) {
      return null;
    }
    return new Date(truck.safetyInspectionExpiryDate);
  }
  
  // Filter trucks based on search term
  const filteredTrucks = trucks.filter(truck => {
    const searchLower = searchTerm.toLowerCase()
    return (
      truck.vin?.toLowerCase().includes(searchLower) ||
      truck.make?.toLowerCase().includes(searchLower) ||
      truck.model?.toLowerCase().includes(searchLower) ||
      truck.year?.toString().includes(searchLower) ||
      truck.unitNumber?.toLowerCase().includes(searchLower)
    )
  })
  
  // Sort trucks based on selected criteria
  const sortedTrucks = (() => {
    if (sortByType === 'all' && sortByUrgency) {
      // Sort by overall urgency
      return [...filteredTrucks].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));
    } 
    else if (sortByType === 'safetyInspection') {
      // Special sorting for safety inspection by expiry date
      return [...filteredTrucks].sort((a, b) => {
        // First, prioritize trucks with no safety inspection record (they need one)
        const aHasInspection = !!a.safetyInspectionExpiryDate;
        const bHasInspection = !!b.safetyInspectionExpiryDate;
        
        if (!aHasInspection && bHasInspection) return -1;
        if (aHasInspection && !bHasInspection) return 1;
        
        // If neither has inspection, sort by year (newer trucks first as they're more likely to need inspection)
        if (!aHasInspection && !bHasInspection) {
          return (b.year || 0) - (a.year || 0);
        }
        
        // Next, prioritize expired inspections
        const aExpired = isSafetyInspectionDue(a);
        const bExpired = isSafetyInspectionDue(b);
        
        if (aExpired && !bExpired) return -1;
        if (!aExpired && bExpired) return 1;
        
        // If both are expired, sort by how long they've been expired (oldest expiry first)
        if (aExpired && bExpired) {
          const aExpiryDate = getSafetyInspectionExpiryDate(a);
          const bExpiryDate = getSafetyInspectionExpiryDate(b);
          
          if (aExpiryDate && bExpiryDate) {
            return aExpiryDate - bExpiryDate; // Oldest expiry first
          }
        }
        
        // If neither is expired, sort by approaching due
        const aApproaching = isSafetyInspectionApproachingDue(a);
        const bApproaching = isSafetyInspectionApproachingDue(b);
        
        if (aApproaching && !bApproaching) return -1;
        if (!aApproaching && bApproaching) return 1;
        
        // If both are approaching due or neither is, sort by expiry date (soonest first)
        const aExpiryDate = getSafetyInspectionExpiryDate(a);
        const bExpiryDate = getSafetyInspectionExpiryDate(b);
        
        if (aExpiryDate && bExpiryDate) {
          return aExpiryDate - bExpiryDate; // Soonest expiry first
        }
        
        // If all else is equal, sort by urgency score
        return getMaintenanceTypeUrgencyScore(b, 'safetyInspection') - getMaintenanceTypeUrgencyScore(a, 'safetyInspection');
      });
    }
    else if (sortByType !== 'all') {
      // Sort by specific maintenance type urgency
      return [...filteredTrucks].sort((a, b) => {
        // First, prioritize overdue vs. not overdue
        const aOverdue = isMaintenanceOverdue(a, sortByType);
        const bOverdue = isMaintenanceOverdue(b, sortByType);
        
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // If both are overdue or both are not overdue, use urgency score
        const scoreA = getMaintenanceTypeUrgencyScore(a, sortByType);
        const scoreB = getMaintenanceTypeUrgencyScore(b, sortByType);
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        
        // If scores are equal and both are overdue, sort by overdue mileage
        if (aOverdue && bOverdue) {
          const overdueA = getOverdueMileage(a, sortByType);
          const overdueB = getOverdueMileage(b, sortByType);
          return overdueB - overdueA;
        }
        
        // If scores are equal and neither is overdue, sort by approaching due
        const aApproaching = isMaintenanceApproachingDue(a, sortByType, 
          sortByType === 'oil' ? a.oilChangeMileageInterval : 
          sortByType === 'airFilter' ? a.airFilterMileageInterval :
          sortByType === 'fuelFilter' ? a.fuelFilterMileageInterval :
          sortByType === 'dpfCleaning' ? a.dpfCleaningMileageInterval : 0
        );
        
        const bApproaching = isMaintenanceApproachingDue(b, sortByType,
          sortByType === 'oil' ? b.oilChangeMileageInterval : 
          sortByType === 'airFilter' ? b.airFilterMileageInterval :
          sortByType === 'fuelFilter' ? b.fuelFilterMileageInterval :
          sortByType === 'dpfCleaning' ? b.dpfCleaningMileageInterval : 0
        );
        
        if (aApproaching && !bApproaching) return -1;
        if (!aApproaching && bApproaching) return 1;
        
        // If all else is equal, sort by current mileage (higher mileage first)
        return (b.currentMileage || 0) - (a.currentMileage || 0);
      });
    }
    
    // Default: no sorting
    return filteredTrucks;
  })();
  
  // Get the active sort type label for display
  const getActiveSortLabel = () => {
    if (sortByType === 'all' && sortByUrgency) {
      return "Overall Urgency";
    } else if (sortByType === 'oil') {
      return "Oil Change";
    } else if (sortByType === 'airFilter') {
      return "Air Filter";
    } else if (sortByType === 'fuelFilter') {
      return "Fuel Filter";
    } else if (sortByType === 'dpfCleaning') {
      return "DPF Cleaning";
    } else if (sortByType === 'safetyInspection') {
      return "Safety Inspection";
    }
    return "No Sort";
  }
  
  // Handle sort type change
  const handleSortTypeChange = (type) => {
    if (type === 'all') {
      setSortByUrgency(true);
    } else {
      setSortByUrgency(false);
    }
    setSortByType(type);
    setDropdownOpen(false); // Close dropdown after selection
  }
  
  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('sort-dropdown-container');
      if (dropdown && !dropdown.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary-800 mb-4 md:mb-0">Truck Fleet</h1>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search trucks..."
              className="pl-10 pr-4 py-2 border rounded-md w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <div id="sort-dropdown-container" className="relative">
              <button
                className="btn btn-primary flex items-center"
                onClick={toggleDropdown}
              >
                <FaSortAmountDown className="mr-2" />
                Sort: {getActiveSortLabel()}
              </button>
              
              <div 
                id="sort-dropdown" 
                className={`${dropdownOpen ? '' : 'hidden'} absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200`}
              >
                <div className="py-1">
                  <button 
                    className={`block px-4 py-2 text-sm w-full text-left ${sortByType === 'all' && sortByUrgency ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => handleSortTypeChange('all')}
                  >
                    <FaSortAmountDown className="inline mr-2" />
                    Overall Urgency
                  </button>
                  <button 
                    className={`block px-4 py-2 text-sm w-full text-left ${sortByType === 'oil' ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => handleSortTypeChange('oil')}
                  >
                    <FaOilCan className="inline mr-2" />
                    Oil Change
                  </button>
                  <button 
                    className={`block px-4 py-2 text-sm w-full text-left ${sortByType === 'airFilter' ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => handleSortTypeChange('airFilter')}
                  >
                    <FaFilter className="inline mr-2" />
                    Air Filter
                  </button>
                  <button 
                    className={`block px-4 py-2 text-sm w-full text-left ${sortByType === 'fuelFilter' ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => handleSortTypeChange('fuelFilter')}
                  >
                    <FaGasPump className="inline mr-2" />
                    Fuel Filter
                  </button>
                  <button 
                    className={`block px-4 py-2 text-sm w-full text-left ${sortByType === 'dpfCleaning' ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => handleSortTypeChange('dpfCleaning')}
                  >
                    <FaSmog className="inline mr-2" />
                    DPF Cleaning
                  </button>
                  <button 
                    className={`block px-4 py-2 text-sm w-full text-left ${sortByType === 'safetyInspection' ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => handleSortTypeChange('safetyInspection')}
                  >
                    <FaClipboardCheck className="inline mr-2" />
                    Safety Inspection
                  </button>
                </div>
              </div>
            </div>
            
            <Link 
              to="/trucks/add" 
              className="btn btn-primary flex items-center"
            >
              <FaPlus className="mr-2" />
              Add Truck
            </Link>
            
            <Link 
              to="/trucks/import" 
              className="btn btn-secondary flex items-center"
            >
              <FaUpload className="mr-2" />
              Import
            </Link>
          </div>
        </div>
      </div>
      
      {sortedTrucks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-medium text-secondary-800 mb-2">No trucks found</h2>
          {searchTerm ? (
            <p className="text-secondary-500 mb-6">No trucks match your search criteria. Try a different search term.</p>
          ) : (
            <p className="text-secondary-500 mb-6">You haven't added any trucks to your fleet yet.</p>
          )}
          
          <div className="flex justify-center space-x-4">
            <Link 
              to="/trucks/add" 
              className="btn btn-primary"
            >
              Add Your First Truck
            </Link>
            
            <Link 
              to="/trucks/import" 
              className="btn btn-secondary"
            >
              Import Trucks
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sortedTrucks.map(truck => (
            <TruckCard key={truck.id} truck={truck} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TruckList
