import { ShieldPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../useSession'

function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useSession()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await signUp(form)
      setSuccess('Account created successfully. Redirecting to login...')
      window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 900)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-hero">
        <span className="hero-label">Zero-friction onboarding</span>
        <h1>Create your backup workspace and start encrypting files before upload.</h1>
        <p>
          Every file is encrypted server-side, tracked in MySQL, and prepared for
          replication across AWS, GCP, and Firebase.
        </p>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <ShieldPlus size={20} />
          <div>
            <h2>Register</h2>
            <p>Create your account to access the dashboard.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {error ? <div className="inline-message error">{error}</div> : null}
          {success ? <div className="inline-message success">{success}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Go to login</Link>
        </p>
      </div>
    </section>
  )
}

export default RegisterPage
