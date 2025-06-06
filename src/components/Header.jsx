import { Link } from 'react-router-dom'
import { FaTruck, FaQrcode } from 'react-icons/fa'

const Header = () => {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-primary-700">FleetMaintain</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/trucks/add" 
              className="btn btn-primary flex items-center space-x-2"
            >
              <FaTruck />
              <span>Add Truck</span>
            </Link>
            <Link 
              to="/scan" 
              className="btn btn-secondary flex items-center space-x-2"
            >
              <FaQrcode />
              <span>Scan QR</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
