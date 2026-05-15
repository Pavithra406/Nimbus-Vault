import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../useSession'

function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useSession()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const nextSession = await signIn(form)
      navigate(nextSession?.isAdmin ? '/admin/dashboard' : '/app/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-hero">
        <span className="hero-label">AES-256 secured</span>
        <h1>Protect every backup across clouds from one control center.</h1>
        <p>
          Sign in to access your encrypted vault, activity feeds, replication status,
          and restore controls.
        </p>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <ShieldCheck size={20} />
          <div>
            <h2>Login</h2>
            <p>Enter your account details to continue.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </section>
  )
}

export default LoginPage
