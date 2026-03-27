"use client"

import { useState, useEffect } from "react"

export interface Command {
  name: string
  description?: string
}

// Global cache
let globalCommands: Command[] = []
let globalFetched = false
let globalFetchPromise: Promise<void> | null = null
let globalListeners: Array<() => void> = []

function notifyListeners() {
  globalListeners.forEach((l) => l())
}

async function fetchCommandsOnce() {
  if (globalFetched) return
  if (globalFetchPromise) return globalFetchPromise

  globalFetchPromise = (async () => {
    try {
      const res = await fetch("/api/agent/commands")
      if (!res.ok) throw new Error(`${res.status}`)
      const data = (await res.json()) as { commands: Command[] }
      globalCommands = data.commands
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

export function useCommands() {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const listener = () => forceUpdate({})
    globalListeners.push(listener)
    if (!globalFetched && !globalFetchPromise) {
      fetchCommandsOnce()
    }
    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener)
    }
  }, [])

  return { commands: globalCommands }
}
