import { Activity, HardDrive, Shield, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchActivity, fetchDashboardSummary, fetchFiles } from '../api'
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

function DashboardPage() {
  const { session } = useSession()
  const [summary, setSummary] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalUsers: session?.isAdmin ? 0 : 1,
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      try {
        if (session?.isAdmin) {
          const data = await fetchDashboardSummary(session.accessToken)
          setSummary({
            totalFiles: data.totalFiles ?? 0,
            totalSize: data.totalSize ?? 0,
            totalUsers: data.totalUsers ?? 0,
            recentActivity: data.recentActivity ?? [],
          })
          return
        }

        const [files, activity] = await Promise.all([
          fetchFiles(session.accessToken),
          fetchActivity(session.accessToken),
        ])

        setSummary({
          totalFiles: files.length,
          totalSize: files.reduce((sum, file) => sum + Number(file.file_size || 0), 0),
          totalUsers: 1,
          recentActivity: activity.slice(0, 10),
        })
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [session?.accessToken, session?.isAdmin])

  const cards = [
    { label: 'Total protected files', value: summary.totalFiles, icon: <Shield size={18} /> },
    { label: 'Total storage volume', value: formatBytes(summary.totalSize), icon: <HardDrive size={18} /> },
    { label: 'Active users', value: summary.totalUsers, icon: <Users size={18} /> },
  ]

  return (
    <section className="page-grid">
      <div className="hero-banner">
        <div>
          <p className="page-kicker">Overview</p>
          <h3>Encrypted backup operations at a glance</h3>
          <p className="muted-copy">
            Monitor protected files, replication readiness, and the most recent backup
            events from your workspace.
          </p>
        </div>
      </div>

      <div className="card-grid">
        {cards.map(({ label, value, icon }) => (
          <article className="metric-card" key={label}>
            {icon}
            <strong>{loading ? '...' : value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>

      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Recent activity log</p>
            <h3>Latest events</h3>
          </div>
        </div>

        <div className="stack-list">
          {summary.recentActivity.length ? (
            summary.recentActivity.map((item) => (
              <article className="list-row" key={item.id}>
                <div>
                  <strong>{item.action}</strong>
                  <span>{item.filename || item.details || 'System event'}</span>
                </div>
                <span className="soft-pill">{formatDate(item.created_at)}</span>
              </article>
            ))
          ) : (
            <div className="empty-card">
              <Activity size={18} />
              <span>No recent activity yet.</span>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

export default DashboardPage
