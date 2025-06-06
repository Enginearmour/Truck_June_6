import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'
import CSVReader from 'react-csv-reader'
import { FaFileUpload, FaDownload, FaCheck, FaTimes } from 'react-icons/fa'

const ImportTrucks = () => {
  const navigate = useNavigate()
  const [csvData, setCsvData] = useState(null)
  const [validationResults, setValidationResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [rawCsvData, setRawCsvData] = useState(null)
  
  const handleCSVUpload = (data, fileInfo) => {
    // Store raw data for debugging
    setRawCsvData(data)
    
    // Check if file is empty
    if (data.length === 0) {
      toast.error('The uploaded file is empty')
      return
    }
    
    // EXTREME DEBUGGING
    console.log('CSV IMPORT DEBUGGING:')
    console.log('Raw data received:', data)
    console.log('File info:', fileInfo)
    console.log('First row:', data[0])
    console.log('Headers (keys of first row):', Object.keys(data[0]))
    
    // Get all headers from the CSV file
    const csvHeaders = Object.keys(data[0])
    
    // Log each header and its value for the first row
    console.log('HEADER VALUES FOR FIRST ROW:')
    csvHeaders.forEach(header => {
      console.log(`${header}: ${data[0][header]}`)
    })
    
    // SUPER AGGRESSIVE MILEAGE DETECTION
    // Try to find any header that might contain mileage information
    let mileageHeader = null
    const mileageKeywords = ['mileage', 'miles', 'km', 'odometer', 'distance', 'current', 'odo']
    
    // First try exact matches with normalization
    for (const header of csvHeaders) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (normalizedHeader === 'currentmileage' || 
          normalizedHeader === 'mileage' || 
          normalizedHeader === 'odometer') {
        mileageHeader = header
        console.log('Found exact mileage header match:', header)
        break
      }
    }
    
    // If no exact match, try partial matches
    if (!mileageHeader) {
      for (const header of csvHeaders) {
        const normalizedHeader = header.toLowerCase()
        for (const keyword of mileageKeywords) {
          if (normalizedHeader.includes(keyword)) {
            mileageHeader = header
            console.log('Found partial mileage header match:', header, 'with keyword:', keyword)
            break
          }
        }
        if (mileageHeader) break
      }
    }
    
    // If still no match, look for any numeric value that could be mileage
    if (!mileageHeader) {
      console.log('No mileage header found, looking for numeric values...')
      for (const header of csvHeaders) {
        const value = data[0][header]
        // Check if the value is numeric and in a reasonable mileage range
        const numValue = parseInt(value)
        if (!isNaN(numValue) && numValue > 0 && numValue < 2000000) {
          // Exclude year which is typically 1900-2100
          if (!(numValue >= 1900 && numValue <= 2100)) {
            mileageHeader = header
            console.log('Found potential mileage value in header:', header, 'with value:', value)
            break
          }
        }
      }
    }
    
    // Create a map of normalized headers to actual headers
    const normalizedHeaderMap = {}
    csvHeaders.forEach(header => {
      // Create multiple normalized versions of each header
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '')
      normalizedHeaderMap[normalized] = header
      
      // Also add a version with spaces replaced by underscores
      const normalizedWithUnderscores = header.toLowerCase().replace(/\s+/g, '_')
      normalizedHeaderMap[normalizedWithUnderscores] = header
    })
    
    console.log('Normalized header map:', normalizedHeaderMap)
    
    // Define required fields and their possible normalized variations
    const requiredFields = {
      'vin': ['vin', 'vehicleid', 'vehicleidentificationnumber', 'vehicle_id', 'vehicle_identification_number'],
      'year': ['year', 'vehicleyear', 'modelyear', 'vehicle_year', 'model_year'],
      'make': ['make', 'vehiclemake', 'manufacturer', 'vehicle_make'],
      'model': ['model', 'vehiclemodel', 'vehicle_model'],
      'currentMileage': ['currentmileage', 'mileage', 'current', 'odometer', 'miles', 'km', 'distance', 'odo', 'current_mileage']
    }
    
    // If we found a mileage header, add it to the currentMileage variations
    if (mileageHeader) {
      requiredFields.currentMileage.push(mileageHeader.toLowerCase().replace(/[^a-z0-9]/g, ''))
      requiredFields.currentMileage.push(mileageHeader.toLowerCase().replace(/\s+/g, '_'))
    }
    
    // Map required fields to actual CSV headers
    const fieldMapping = {}
    const missingFields = []
    
    Object.entries(requiredFields).forEach(([field, variations]) => {
      let found = false
      
      // Special case for currentMileage if we found a header
      if (field === 'currentMileage' && mileageHeader) {
        fieldMapping[field] = mileageHeader
        found = true
      } else {
        // Try to find a matching header using normalized variations
        for (const variation of variations) {
          if (normalizedHeaderMap[variation]) {
            fieldMapping[field] = normalizedHeaderMap[variation]
            found = true
            break
          }
        }
        
        // If no direct match, try to find a header that contains the field name
        if (!found) {
          for (const header of csvHeaders) {
            const normalizedHeader = header.toLowerCase()
            if (variations.some(v => normalizedHeader.includes(v))) {
              fieldMapping[field] = header
              found = true
              break
            }
          }
        }
      }
      
      if (!found) {
        missingFields.push(field)
      }
    })
    
    console.log('Field mapping:', fieldMapping)
    console.log('Missing fields:', missingFields)
    
    if (missingFields.length > 0) {
      // Special handling for currentMileage
      if (missingFields.includes('currentMileage')) {
        toast.error(`Could not find a column for current mileage. Please ensure your CSV has a column for vehicle mileage/odometer reading.`)
      } else {
        toast.error(`Missing required headers: ${missingFields.join(', ')}`)
      }
      return
    }
    
    // Map optional fields
    const optionalFieldMappings = {
      'unitNumber': ['unitnumber', 'unit', 'truckunit', 'trucknumber', 'unit_number', 'truck_unit', 'truck_number'],
      'distanceUnit': ['distanceunit', 'unit', 'miles', 'km', 'distance_unit'],
      'oilChangeMileageInterval': ['oilchangemileageinterval', 'oilchangeinterval', 'oilinterval', 'oil_change_interval'],
      'airFilterMileageInterval': ['airfiltermileageinterval', 'airfilterinterval', 'airinterval', 'air_filter_interval'],
      'fuelFilterMileageInterval': ['fuelfiltermileageinterval', 'fuelfilterinterval', 'fuelinterval', 'fuel_filter_interval'],
      'dpfCleaningMileageInterval': ['dpfcleaningmileageinterval', 'dpfcleaninginterval', 'dpfinterval', 'dpf_cleaning_interval'],
      'safetyInspectionDate': ['safetyinspectiondate', 'inspectiondate', 'safetydate', 'safety_inspection_date', 'inspection_date'],
      'safetyInspectionExpiryDate': ['safetyinspectionexpirydate', 'inspectionexpirydate', 'safetyexpiry', 'safety_inspection_expiry', 'inspection_expiry'],
      'lastOilChangeMileage': ['lastoilchangemileage', 'oilchangemileage', 'lastoilchange', 'last_oil_change'],
      'lastAirFilterMileage': ['lastairfiltermileage', 'airfiltermileage', 'lastairfilter', 'last_air_filter'],
      'lastFuelFilterMileage': ['lastfuelfiltermileage', 'fuelfiltermileage', 'lastfuelfilter', 'last_fuel_filter'],
      'lastDpfCleaningMileage': ['lastdpfcleaningmileage', 'dpfcleaningmileage', 'lastdpfcleaning', 'last_dpf_cleaning']
    }
    
    // Map optional fields to actual CSV headers
    Object.entries(optionalFieldMappings).forEach(([field, variations]) => {
      for (const header of csvHeaders) {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
        const normalizedWithUnderscores = header.toLowerCase().replace(/\s+/g, '_')
        if (variations.some(v => normalizedHeader.includes(v) || normalizedWithUnderscores.includes(v))) {
          fieldMapping[field] = header
          break
        }
      }
    })
    
    console.log('Complete field mapping:', fieldMapping)
    
    // Map the data using our field mapping
    const normalizedData = data.map(row => {
      const normalizedRow = {}
      
      // Map each field using our field mapping
      Object.entries(fieldMapping).forEach(([field, header]) => {
        normalizedRow[field] = row[header]
      })
      
      return normalizedRow
    })
    
    console.log('Normalized data first row:', normalizedData[0])
    
    setCsvData(normalizedData)
    
    // Validate each row
    const results = normalizedData.map((row, index) => {
      const errors = []
      
      // Validate VIN
      if (!row.vin || row.vin.length !== 17) {
        errors.push('VIN must be 17 characters')
      }
      
      // Validate year
      const year = parseInt(row.year)
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        errors.push('Invalid year')
      }
      
      // Validate make and model
      if (!row.make || row.make.trim() === '') {
        errors.push('Make is required')
      }
      
      if (!row.model || row.model.trim() === '') {
        errors.push('Model is required')
      }
      
      // Validate mileage
      const mileage = parseInt(row.currentMileage)
      if (isNaN(mileage) || mileage < 0) {
        errors.push('Invalid mileage')
      }
      
      return {
        rowIndex: index + 1,
        data: row,
        errors,
        isValid: errors.length === 0
      }
    })
    
    setValidationResults(results)
  }
  
  const handleImport = async () => {
    if (!csvData) return
    
    const validRows = validationResults.filter(r => r.isValid)
    
    if (validRows.length === 0) {
      toast.error('No valid data to import')
      return
    }
    
    setLoading(true)
    
    try {
      // Prepare data for import
      const trucksToImport = validRows.map(row => {
        // Start with the basic required fields
        const truckData = {
          vin: row.data.vin.toUpperCase(),
          year: parseInt(row.data.year),
          make: row.data.make,
          model: row.data.model,
          currentMileage: parseInt(row.data.currentMileage),
          maintenanceHistory: []
        }
        
        // Add optional fields if they exist
        if (row.data.unitNumber) truckData.unitNumber = row.data.unitNumber
        if (row.data.distanceUnit) truckData.distanceUnit = row.data.distanceUnit
        
        // Add maintenance interval fields if they exist
        if (row.data.oilChangeMileageInterval) 
          truckData.oilChangeMileageInterval = parseInt(row.data.oilChangeMileageInterval)
        if (row.data.airFilterMileageInterval) 
          truckData.airFilterMileageInterval = parseInt(row.data.airFilterMileageInterval)
        if (row.data.fuelFilterMileageInterval) 
          truckData.fuelFilterMileageInterval = parseInt(row.data.fuelFilterMileageInterval)
        if (row.data.dpfCleaningMileageInterval) 
          truckData.dpfCleaningMileageInterval = parseInt(row.data.dpfCleaningMileageInterval)
        
        // Add safety inspection fields if they exist
        if (row.data.safetyInspectionDate) 
          truckData.safetyInspectionDate = row.data.safetyInspectionDate
        if (row.data.safetyInspectionExpiryDate) 
          truckData.safetyInspectionExpiryDate = row.data.safetyInspectionExpiryDate
        
        // Add last maintenance mileage fields if they exist
        const maintenanceHistory = []
        
        if (row.data.lastOilChangeMileage) {
          maintenanceHistory.push({
            type: 'oil',
            date: new Date().toISOString().split('T')[0],
            mileage: parseInt(row.data.lastOilChangeMileage),
            notes: 'Imported from CSV'
          })
        }
        
        if (row.data.lastAirFilterMileage) {
          maintenanceHistory.push({
            type: 'airFilter',
            date: new Date().toISOString().split('T')[0],
            mileage: parseInt(row.data.lastAirFilterMileage),
            notes: 'Imported from CSV'
          })
        }
        
        if (row.data.lastFuelFilterMileage) {
          maintenanceHistory.push({
            type: 'fuelFilter',
            date: new Date().toISOString().split('T')[0],
            mileage: parseInt(row.data.lastFuelFilterMileage),
            notes: 'Imported from CSV'
          })
        }
        
        if (row.data.lastDpfCleaningMileage) {
          maintenanceHistory.push({
            type: 'dpfCleaning',
            date: new Date().toISOString().split('T')[0],
            mileage: parseInt(row.data.lastDpfCleaningMileage),
            notes: 'Imported from CSV'
          })
        }
        
        if (maintenanceHistory.length > 0) {
          truckData.maintenanceHistory = maintenanceHistory
        }
        
        return truckData
      })
      
      // Import trucks
      const { data, error } = await supabase
        .from('trucks')
        .insert(trucksToImport)
      
      if (error) throw error
      
      toast.success(`Successfully imported ${validRows.length} trucks`)
      navigate('/trucks')
    } catch (error) {
      console.error('Error importing trucks:', error)
      toast.error('Failed to import trucks: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const downloadSampleCSV = () => {
    // Simplified headers for better compatibility
    const sampleData = [
      {
        "VIN": "1HGCM82633A123456",
        "Year": "2022",
        "Make": "Freightliner",
        "Model": "Cascadia",
        "Mileage": "50000",
        "Unit Number": "101",
        "Distance Unit": "km",
        "Oil Change Interval": "8000",
        "Air Filter Interval": "24000",
        "Fuel Filter Interval": "40000",
        "DPF Cleaning Interval": "160000",
        "Safety Inspection Date": "2023-06-15",
        "Safety Inspection Expiry": "2024-06-15",
        "Last Oil Change": "42000",
        "Last Air Filter": "35000",
        "Last Fuel Filter": "30000",
        "Last DPF Cleaning": "20000"
      },
      {
        "VIN": "2FMZA51636X123456",
        "Year": "2021",
        "Make": "Peterbilt",
        "Model": "579",
        "Mileage": "75000",
        "Unit Number": "102",
        "Distance Unit": "km",
        "Oil Change Interval": "8000",
        "Air Filter Interval": "24000",
        "Fuel Filter Interval": "40000",
        "DPF Cleaning Interval": "160000",
        "Safety Inspection Date": "2023-08-20",
        "Safety Inspection Expiry": "2024-08-20",
        "Last Oil Change": "68000",
        "Last Air Filter": "60000",
        "Last Fuel Filter": "55000",
        "Last DPF Cleaning": "40000"
      },
      {
        "VIN": "3VWSE69M35M123456",
        "Year": "2023",
        "Make": "Kenworth",
        "Model": "T680",
        "Mileage": "25000",
        "Unit Number": "103",
        "Distance Unit": "km",
        "Oil Change Interval": "8000",
        "Air Filter Interval": "24000",
        "Fuel Filter Interval": "40000",
        "DPF Cleaning Interval": "160000",
        "Safety Inspection Date": "2023-09-05",
        "Safety Inspection Expiry": "2024-09-05",
        "Last Oil Change": "20000",
        "Last Air Filter": "20000",
        "Last Fuel Filter": "20000",
        "Last DPF Cleaning": "20000"
      }
    ]
    
    // Convert to CSV string
    const headers = Object.keys(sampleData[0])
    const csvRows = []
    
    // Add header row
    csvRows.push(headers.join(','))
    
    // Add data rows
    for (const row of sampleData) {
      const values = headers.map(header => {
        const val = row[header] || ''
        // Escape commas and quotes
        return `"${val.toString().replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    }
    
    const csvString = csvRows.join('\n')
    
    // Create a download link
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString)
    a.download = 'truck_import_template.csv'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    toast.success('Sample CSV downloaded successfully')
  }
  
  // Function to display raw CSV data for debugging
  const showRawCsvData = () => {
    if (!rawCsvData) return null
    
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-md font-medium mb-2">Raw CSV Data (Debug View)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                {rawCsvData.length > 0 && Object.keys(rawCsvData[0]).map((header, i) => (
                  <th key={i} className="px-2 py-1 border">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawCsvData.slice(0, 3).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-2 py-1 border">{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">Showing first 3 rows only</p>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary-800 mb-6">Import Trucks</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Instructions</h2>
          <p className="text-secondary-600 mb-4">
            Upload a CSV file with truck information to bulk import trucks into your fleet. 
            The CSV file should include the following columns: VIN, Year, Make, Model, and Mileage.
            Additional maintenance information can also be included.
          </p>
          
          <button
            onClick={downloadSampleCSV}
            className="btn btn-secondary flex items-center"
          >
            <FaDownload className="mr-2" />
            Download Sample CSV
          </button>
        </div>
        
        <div className="border-t border-b py-6 my-6">
          <h2 className="text-lg font-medium mb-4">Upload CSV File</h2>
          
          <div className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center">
            <CSVReader
              onFileLoaded={handleCSVUpload}
              parserOptions={{ 
                header: true, 
                skipEmptyLines: true,
                transformHeader: (header) => header.trim()
              }}
              cssClass="csv-reader-input"
              cssInputClass="hidden"
              label={
                <div className="flex flex-col items-center">
                  <FaFileUpload className="text-4xl text-secondary-400 mb-2" />
                  <span className="text-secondary-600 font-medium">
                    Click to upload or drag and drop CSV file
                  </span>
                  <span className="text-secondary-500 text-sm mt-1">
                    Only CSV files are supported
                  </span>
                </div>
              }
            />
          </div>
        </div>
        
        {/* Debug view of raw CSV data */}
        {rawCsvData && showRawCsvData()}
        
        {validationResults.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Validation Results</h2>
            <p className="text-secondary-600 mb-4">
              {validationResults.filter(r => r.isValid).length} of {validationResults.length} rows are valid for import.
            </p>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Row
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      VIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Year/Make/Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Mileage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {validationResults.map((result, index) => (
                    <tr key={index} className={result.isValid ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {result.rowIndex}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
                        {result.data.vin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
                        {result.data.year} {result.data.make} {result.data.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-800">
                        {result.data.currentMileage}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {result.isValid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaCheck className="mr-1" /> Valid
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <FaTimes className="mr-1" /> Invalid
                            </span>
                            <ul className="mt-1 text-xs text-red-600">
                              {result.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => navigate('/trucks')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="btn btn-primary"
            disabled={!csvData || validationResults.filter(r => r.isValid).length === 0 || loading}
          >
            {loading ? 'Importing...' : 'Import Trucks'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportTrucks
