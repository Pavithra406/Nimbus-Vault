import { useEffect, useState } from 'react'
import { fetchUsers } from '../api'
import { useSession } from '../useSession'

function UsersPage() {
  const { session } = useSession()
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (!session?.isAdmin) return

    async function loadUsers() {
      const data = await fetchUsers(session.accessToken)
      setUsers(data)
    }

    void loadUsers()
  }, [session?.accessToken, session?.isAdmin])

  if (!session?.isAdmin) {
    return (
      <section className="page-grid">
        <div className="empty-card">This page is available to admin users only.</div>
      </section>
    )
  }

  return (
    <section className="page-grid">
      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Users</p>
            <h3>Registered accounts</h3>
          </div>
        </div>

        <div className="stack-list">
          {users.map((user) => (
            <article className="list-row" key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <span className="soft-pill">{user.files_count} files</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default UsersPage
