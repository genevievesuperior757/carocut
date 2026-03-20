"use client"

import { useState, useCallback } from "react"
import type { Session } from "@/lib/types"

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agent/session")
      if (!res.ok) throw new Error("Failed to fetch sessions")
      const data: Session[] = await res.json()
      setSessions(data)
      return data
    } catch (err) {
      console.error("fetchSessions error:", err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createSession = useCallback(async (title?: string) => {
    try {
      const res = await fetch("/api/agent/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Failed to create session")
      const session: Session = await res.json()
      setSessions((prev) => [session, ...prev])
      return session
    } catch (err) {
      console.error("createSession error:", err)
      return null
    }
  }, [])

  const updateSession = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch("/api/agent/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      })
      if (!res.ok) throw new Error("Failed to update session")
      const updated: Session = await res.json()
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)))
      return updated
    } catch (err) {
      console.error("updateSession error:", err)
      return null
    }
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(
        `/api/agent/session?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      )
      if (!res.ok) throw new Error("Failed to delete session")
      setSessions((prev) => prev.filter((s) => s.id !== id))
      return true
    } catch (err) {
      console.error("deleteSession error:", err)
      return false
    }
  }, [])

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  }
}
