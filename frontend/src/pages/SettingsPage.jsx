import { useState } from 'react'
import { changePassword } from '../api'
import { useSession } from '../useSession'

function SettingsPage() {
  const { session, signOut } = useSession()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [message, setMessage] = useState('')

  async function handlePasswordChange(event) {
    event.preventDefault()

    try {
      const result = await changePassword(session.accessToken, form)
      setMessage(result.message)
      setForm({ currentPassword: '', newPassword: '' })
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to change password.')
    }
  }

  return (
    <section className="page-grid settings-grid">
      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Account details</p>
            <h3>Your profile</h3>
          </div>
        </div>

        <div className="settings-card">
          <strong>{session?.name}</strong>
          <span>{session?.email}</span>
        </div>
      </section>

      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Security</p>
            <h3>Change password</h3>
          </div>
        </div>

        <form className="auth-form" onSubmit={handlePasswordChange}>
          <label>
            Current password
            <input
              type="password"
              value={form.currentPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              required
            />
          </label>

          <label>
            New password
            <input
              type="password"
              value={form.newPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, newPassword: event.target.value }))
              }
              required
            />
          </label>

          {message ? <div className="inline-message info">{message}</div> : null}

          <button className="primary-button" type="submit">
            Update password
          </button>
        </form>

        <button className="ghost-button" onClick={signOut} type="button">
          Logout
        </button>
      </section>
    </section>
  )
}

export default SettingsPage
