/* Context + hook: fast-refresh rule expects components-only files */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '../types'
import { clearCookie } from '../lib/cookies'

const STORAGE_KEY = 'chat_app_user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as User
    if (u && typeof u._id === 'string' && typeof u.email === 'string') return u
  } catch {
    /* ignore */
  }
  return null
}

type AuthContextValue = {
  user: User | null
  setUser: (u: User | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readStoredUser())

  const setUser = useCallback((u: User | null) => {
    setUserState(u)
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const logout = useCallback(() => {
    clearCookie('token')
    setUser(null)
  }, [setUser])

  const value = useMemo(
    () => ({ user, setUser, logout }),
    [user, setUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
