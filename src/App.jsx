import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TruckList from './pages/TruckList'
import TruckDetail from './pages/TruckDetail'
import AddTruck from './pages/AddTruck'
import ImportTrucks from './pages/ImportTrucks'
import ScanQR from './pages/ScanQR'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="trucks" element={<TruckList />} />
        <Route path="trucks/add" element={<AddTruck />} />
        <Route path="trucks/import" element={<ImportTrucks />} />
        <Route path="trucks/:id" element={<TruckDetail />} />
        <Route path="scan" element={<ScanQR />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
