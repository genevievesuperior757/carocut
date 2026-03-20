"use client"

import { useState, useCallback } from "react"
import type { Artifact } from "@/lib/types"

export function useArtifacts(sessionId: string | null) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null,
  )
  const [studioAvailable, setStudioAvailable] = useState(false)

  /** Fetch the artifact list for the current session. */
  const refreshArtifacts = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch(
        `/api/files/artifacts?sessionId=${encodeURIComponent(sessionId)}`,
      )
      if (!res.ok) throw new Error("Failed to fetch artifacts")
      const data: Artifact[] = await res.json()
      setArtifacts(data)
    } catch (err) {
      console.error("refreshArtifacts error:", err)
    }
  }, [sessionId])

  /** Check the current Studio status for this session (also triggers auto-start). */
  const checkStudio = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch(
        `/api/studio/status?sessionId=${encodeURIComponent(sessionId)}`,
      )
      if (!res.ok) throw new Error("Failed to check studio status")
      const data: { status?: string } = await res.json()
      const isRunning = data.status === "running" || data.status === "starting"
      setStudioAvailable(isRunning)
    } catch (err) {
      console.error("checkStudio error:", err)
      setStudioAvailable(false)
    }
  }, [sessionId])

  /** Start the Studio for this session. */
  const startStudio = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch("/api/studio/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error("Failed to start studio")
      const data: { status?: string } = await res.json()
      setStudioAvailable(
        data.status === "running" || data.status === "starting",
      )
    } catch (err) {
      console.error("startStudio error:", err)
    }
  }, [sessionId])

  /** Stop the Studio for this session. */
  const stopStudio = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch("/api/studio/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error("Failed to stop studio")
      setStudioAvailable(false)
    } catch (err) {
      console.error("stopStudio error:", err)
    }
  }, [sessionId])

  return {
    artifacts,
    selectedArtifact,
    studioAvailable,
    refreshArtifacts,
    checkStudio,
    startStudio,
    stopStudio,
    setSelectedArtifact,
  }
}
