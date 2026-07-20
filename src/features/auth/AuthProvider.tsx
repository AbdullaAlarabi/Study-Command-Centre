import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/data'
import type { Profile } from '../../types/auth'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Profile>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrateSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const nextProfile = await getProfile(session.user.id)
      setUser(session.user)
      setProfile(nextProfile)
    } catch {
      await supabase?.auth.signOut()
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      void hydrateSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateSession(session)
    })

    return () => subscription.unsubscribe()
  }, [hydrateSession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error(
        'Supabase is not configured. Add the two VITE_SUPABASE variables to .env.local.',
      )
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    try {
      const nextProfile = await getProfile(data.user.id)
      setUser(data.user)
      setProfile(nextProfile)
      return nextProfile
    } catch (error) {
      await supabase.auth.signOut()
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ user, profile, loading, signIn, signOut }),
    [loading, profile, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
