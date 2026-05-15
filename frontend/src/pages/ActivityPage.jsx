import { useEffect, useState } from 'react'
import { fetchActivity } from '../api'
import { useSession } from '../useSession'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ActivityPage() {
  const { session } = useSession()
  const [activity, setActivity] = useState([])

  useEffect(() => {
    async function loadActivity() {
      const data = await fetchActivity(session.accessToken)
      setActivity(data)
    }

    void loadActivity()
  }, [session?.accessToken])

  return (
    <section className="page-grid">
      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Activity</p>
            <h3>Uploads, restores, and failovers</h3>
          </div>
        </div>

        <div className="stack-list">
          {activity.length ? (
            activity.map((entry) => (
              <article className="list-row" key={entry.id}>
                <div>
                  <strong>{entry.action}</strong>
                  <span>{entry.filename || entry.details || 'Backup event'}</span>
                </div>
                <span className="soft-pill">{formatDate(entry.created_at)}</span>
              </article>
            ))
          ) : (
            <div className="empty-card">No activity logged yet.</div>
          )}
        </div>
      </section>
    </section>
  )
}

export default ActivityPage
