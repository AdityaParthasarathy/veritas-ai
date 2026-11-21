import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setUnauthorizedHandler } from '../services/api'
import { changePasswordRequest, deleteAccountRequest, fetchCurrentUser, loginUser, registerUser } from '../services/authService'
import { getToken, setToken } from '../services/tokenStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => Boolean(getToken()))
  const [sessionExpired, setSessionExpired] = useState(false)

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getToken()) {
        clearSession()
        setSessionExpired(true)
      }
    })
  }, [clearSession])

  // Restore the session after a reload by asking the API who the stored token belongs to.
  useEffect(() => {
    if (!getToken()) return undefined
    let cancelled = false
    fetchCurrentUser()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && clearSession())
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const applySession = useCallback((data) => {
    setToken(data.access_token)
    setSessionExpired(false)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (email, password) => applySession(await loginUser({ email, password })), [applySession])
  const register = useCallback(
    async (email, password, fullName) => applySession(await registerUser({ email, password, full_name: fullName || null })),
    [applySession],
  )

  // Changing the password revokes every older token on the server and returns a fresh one.
  const changePassword = useCallback(
    async (currentPassword, newPassword) => applySession(await changePasswordRequest(currentPassword, newPassword)),
    [applySession],
  )
  const deleteAccount = useCallback(
    async (password) => {
      await deleteAccountRequest(password)
      clearSession()
    },
    [clearSession],
  )

  const value = useMemo(
    () => ({ user, checking, sessionExpired, login, register, changePassword, deleteAccount, logout: clearSession }),
    [user, checking, sessionExpired, login, register, changePassword, deleteAccount, clearSession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
