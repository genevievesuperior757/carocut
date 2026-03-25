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
    } catch {
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createSession = useCallback(async (title?: string): Promise<{ session: Session | null; error?: string }> => {
    try {
      const res = await fetch("/api/agent/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("无法连接到 OpenCode 后端，请确认服务已启动")
      const session: Session = await res.json()
      setSessions((prev) => [session, ...prev])
      return { session }
    } catch (err) {
      return { session: null, error: err instanceof Error ? err.message : "未知错误" }
    }
  }, [])

  const updateSession = useCallback(async (id: string, title: string): Promise<{ session: Session | null; error?: string }> => {
    try {
      const res = await fetch("/api/agent/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      })
      if (!res.ok) throw new Error("无法连接到 OpenCode 后端，请确认服务已启动")
      const updated: Session = await res.json()
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)))
      return { session: updated }
    } catch (err) {
      return { session: null, error: err instanceof Error ? err.message : "未知错误" }
    }
  }, [])

  const deleteSession = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(
        `/api/agent/session?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      )
      if (!res.ok) throw new Error("无法连接到 OpenCode 后端，请确认服务已启动")
      setSessions((prev) => prev.filter((s) => s.id !== id))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "未知错误" }
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
