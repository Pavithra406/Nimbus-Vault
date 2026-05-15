import { Navigate } from 'react-router-dom'
import { useSession } from '../useSession'

function AdminRoute({ children }) {
  const { isAuthenticated, loading, session } = useSession()

  if (loading) {
    return <div className="route-loading">Loading admin workspace...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return session?.isAdmin ? children : <Navigate to="/app/dashboard" replace />
}

export default AdminRoute
