"use client"

import { useEffect, useRef } from "react"
import type { Event } from "@/lib/types"
import { subscribeToAgentEventStream } from "@/lib/agent-event-stream"

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

    return subscribeToAgentEventStream({
      sessionId,
      onEvent: (event) => handlerRef.current(event),
    })
  }, [sessionId])
}
