import { Navigate } from 'react-router-dom'
import { useSession } from '../useSession'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSession()

  if (loading) {
    return <div className="route-loading">Loading secure workspace...</div>
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
