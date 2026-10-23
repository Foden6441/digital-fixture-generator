"use client"

import { createContext, useContext, useEffect, useState } from "react"
interface AppUser { id: string; email: string; name?: string | null; role: string }
interface AppSession { user: AppUser }

interface AuthContextType {
  user: AppUser | null
  session: AppSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [session, setSession] = useState<AppSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/session").then(async (response) => response.ok ? response.json() : null)
      .then((nextSession: AppSession | null) => { setSession(nextSession); setUser(nextSession?.user ?? null) })
      .catch(() => { setSession(null); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      if (!response.ok) return { error: new Error("Invalid email or password") }
      const data: AppSession = await response.json(); setSession(data); setUser(data.user); return { error: null }
    } catch (error) { return { error: error instanceof Error ? error : new Error("Sign in failed") } }
  }

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
