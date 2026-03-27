"use client"

import { useState, useEffect } from "react"

export interface Agent {
  name: string
  description?: string
}

// Global cache
let globalAgents: Agent[] = []
let globalFetched = false
let globalFetchPromise: Promise<void> | null = null
let globalListeners: Array<() => void> = []

function notifyListeners() {
  globalListeners.forEach((l) => l())
}

async function fetchAgentsOnce() {
  if (globalFetched) return
  if (globalFetchPromise) return globalFetchPromise

  globalFetchPromise = (async () => {
    try {
      const res = await fetch("/api/agent/agents")
      if (!res.ok) throw new Error(`${res.status}`)
      const data = (await res.json()) as { agents: Agent[] }
      globalAgents = data.agents
    } catch {
      // silently fall back to empty
    } finally {
      globalFetched = true
      globalFetchPromise = null
      notifyListeners()
    }
  })()

  return globalFetchPromise
}

export function useAgents() {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const listener = () => forceUpdate({})
    globalListeners.push(listener)
    if (!globalFetched && !globalFetchPromise) {
      fetchAgentsOnce()
    }
    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener)
    }
  }, [])

  return { agents: globalAgents }
}
