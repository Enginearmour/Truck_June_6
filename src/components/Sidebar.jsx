import { NavLink } from 'react-router-dom'
import { FaHome, FaTruck, FaQrcode, FaUpload } from 'react-icons/fa'

const Sidebar = () => {
  const navItems = [
    { to: '/', icon: <FaHome size={20} />, label: 'Dashboard' },
    { to: '/trucks', icon: <FaTruck size={20} />, label: 'Trucks' },
    { to: '/trucks/import', icon: <FaUpload size={20} />, label: 'Import' },
    { to: '/scan', icon: <FaQrcode size={20} />, label: 'Scan QR' },
  ]

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-secondary-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <img 
                className="h-12 w-auto" 
                src="https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                alt="Fleet Maintenance" 
              />
              <span className="ml-2 text-xl font-bold text-white">FleetMaintain</span>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-3 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-secondary-900 text-white'
                        : 'text-secondary-300 hover:bg-secondary-700 hover:text-white'
                    }`
                  }
                >
                  <div className="mr-3">{item.icon}</div>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-secondary-700 p-4">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-white">Fleet Company</p>
                <p className="text-xs text-secondary-300">MVP Version</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
