import { Activity, Database, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchDashboardSummary } from '../api'
import { useSession } from '../useSession'

function formatBytes(value) {
  if (!value) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / 1024 ** exponent
  return `${amount.toFixed(amount >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function AdminDashboardPage() {
  const { session } = useSession()
  const [summary, setSummary] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalUsers: 0,
    recentActivity: [],
  })

  useEffect(() => {
    async function loadSummary() {
      const data = await fetchDashboardSummary(session.accessToken)
      setSummary({
        totalFiles: data.totalFiles ?? 0,
        totalSize: data.totalSize ?? 0,
        totalUsers: data.totalUsers ?? 0,
        recentActivity: data.recentActivity ?? [],
      })
    }

    void loadSummary()
  }, [session?.accessToken])

  const cards = [
    { label: 'Protected files', value: summary.totalFiles, icon: <ShieldCheck size={18} /> },
    { label: 'Storage volume', value: formatBytes(summary.totalSize), icon: <Database size={18} /> },
    { label: 'Registered users', value: summary.totalUsers, icon: <Users size={18} /> },
  ]

  return (
    <section className="page-grid">
      <div className="hero-banner admin-hero">
        <div>
          <p className="page-kicker">Admin dashboard</p>
          <h3>System-wide backup visibility and user oversight</h3>
          <p className="muted-copy">
            Review platform-wide activity, user growth, and protected storage from
            the administrative workspace.
          </p>
        </div>
      </div>

      <div className="card-grid">
        {cards.map(({ label, value, icon }) => (
          <article className="metric-card" key={label}>
            {icon}
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>

      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Administrative activity</p>
            <h3>Latest system events</h3>
          </div>
        </div>

        <div className="stack-list">
          {summary.recentActivity.length ? (
            summary.recentActivity.map((item) => (
              <article className="list-row" key={item.id}>
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.details || item.filename || 'System event'}</span>
                </div>
                <span className="soft-pill">
                  <Activity size={14} />
                  {formatDate(item.created_at)}
                </span>
              </article>
            ))
          ) : (
            <div className="empty-card">No admin activity logged yet.</div>
          )}
        </div>
      </section>
    </section>
  )
}

export default AdminDashboardPage
