import {
  Activity,
  CloudUpload,
  Files,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../useSession'

function AppLayout() {
  const { session, signOut } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminArea = location.pathname.startsWith('/admin')

  const navigationItems = isAdminArea
    ? [
        { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { to: '/admin/activity', label: 'Activity', icon: <Activity size={18} /> },
        { to: '/admin/users', label: 'Users', icon: <Users size={18} /> },
        { to: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
      ]
    : [
        { to: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { to: '/app/upload', label: 'Upload Backup', icon: <CloudUpload size={18} /> },
        { to: '/app/files', label: 'My Files', icon: <Files size={18} /> },
        { to: '/app/activity', label: 'Activity', icon: <Activity size={18} /> },
        { to: '/app/settings', label: 'Settings', icon: <Settings size={18} /> },
      ]

  function handleLogout() {
    signOut()
    navigate('/login')
  }

  const currentLabel =
    navigationItems.find((item) => item.to === location.pathname)?.label || 'Workspace'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Shield size={20} />
          </div>
          <div>
            <p className="brand-eyebrow">Multi-Cloud</p>
            <h1>Encrypted Backup</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="nav-link nav-logout" onClick={handleLogout} type="button">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="page-kicker">Secure workspace</p>
            <h2>{currentLabel}</h2>
          </div>

          <div className="profile-chip">
            <div className="profile-avatar">{session?.name?.slice(0, 1) || 'U'}</div>
            <div>
              <strong>{session?.name}</strong>
              <span>{session?.email}</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
