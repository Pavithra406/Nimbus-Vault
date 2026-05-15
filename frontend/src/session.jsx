import { useEffect, useState } from 'react'
import { fetchProfile, loginUser, registerUser } from './api'
import { SessionContext } from './session-context'

const storageKey = 'mcb-session'

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(storageKey)

    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch {
      localStorage.removeItem(storageKey)
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.accessToken) {
      localStorage.removeItem(storageKey)
      setLoading(false)
      return
    }

    localStorage.setItem(storageKey, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    async function hydrateSession() {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const profile = await fetchProfile(session.accessToken)
        setSession((current) => ({
          ...current,
          ...profile,
          accessToken: current.accessToken,
        }))
      } catch {
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    void hydrateSession()
  }, [session?.accessToken])

  async function signIn(credentials) {
    const loginResult = await loginUser(credentials)
    const profile = await fetchProfile(loginResult.accessToken)

    const nextSession = {
      ...loginResult,
      ...profile,
      accessToken: loginResult.accessToken,
    }

    setSession(nextSession)
    return nextSession
  }

  async function signUp(payload) {
    return await registerUser(payload)
  }

  async function refreshProfile() {
    if (!session?.accessToken) return null

    const profile = await fetchProfile(session.accessToken)
    setSession((current) => ({
      ...current,
      ...profile,
      accessToken: current.accessToken,
    }))
    return profile
  }

  function signOut() {
    setSession(null)
    localStorage.removeItem(storageKey)
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        isAuthenticated: Boolean(session?.accessToken),
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}
