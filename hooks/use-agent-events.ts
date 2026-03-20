"use client"

import { useEffect, useRef } from "react"
import type { Event } from "@/lib/types"

export type EventHandler = (event: Event) => void

/**
 * Subscribes to the agent SSE stream for a given session.
 * Passes raw SDK Event objects to the handler without transformation.
 */
export function useAgentEvents(
  sessionId: string | null,
  onEvent: EventHandler,
) {
  const handlerRef = useRef<EventHandler>(onEvent)

  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!sessionId) return

    const url = `/api/agent/events?sessionId=${encodeURIComponent(sessionId)}`
    const es = new EventSource(url)

    es.onmessage = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as Event
        handlerRef.current(parsed)
      } catch {
        // Ignore malformed messages
      }
    }

    return () => {
      es.close()
    }
  }, [sessionId])
}
