import { Link } from 'react-router-dom'
import { FaTruck } from 'react-icons/fa'

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <FaTruck className="text-6xl text-secondary-300 mb-6" />
      <h1 className="text-3xl font-bold text-secondary-800 mb-2">Page Not Found</h1>
      <p className="text-secondary-600 mb-8 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  )
}

export default NotFound
