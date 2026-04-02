import type { Event } from "@/lib/types"

type EventHandler = (event: Event) => void

type EventSourceFactory = (url: string) => EventSource

interface StreamEntry {
  eventSource: EventSource
  listeners: Set<EventHandler>
}

const streams = new Map<string, StreamEntry>()

function defaultCreateEventSource(url: string) {
  return new EventSource(url)
}

export function subscribeToAgentEventStream(input: {
  sessionId: string
  onEvent: EventHandler
  createEventSource?: EventSourceFactory
}) {
  const { sessionId, onEvent, createEventSource = defaultCreateEventSource } = input
  const existing = streams.get(sessionId)

  if (existing) {
    existing.listeners.add(onEvent)
    return () => unsubscribe(sessionId, onEvent)
  }

  const url = `/api/agent/events?sessionId=${encodeURIComponent(sessionId)}`
  const eventSource = createEventSource(url)
  const listeners = new Set<EventHandler>([onEvent])

  eventSource.onmessage = (messageEvent: MessageEvent) => {
    try {
      const parsed = JSON.parse(messageEvent.data) as Event
      for (const listener of listeners) {
        listener(parsed)
      }
    } catch {
      // Ignore malformed messages
    }
  }

  streams.set(sessionId, {
    eventSource,
    listeners,
  })

  return () => unsubscribe(sessionId, onEvent)
}

function unsubscribe(sessionId: string, onEvent: EventHandler) {
  const entry = streams.get(sessionId)
  if (!entry) return

  entry.listeners.delete(onEvent)
  if (entry.listeners.size > 0) return

  entry.eventSource.close()
  streams.delete(sessionId)
}

export function resetAgentEventStreamsForTest() {
  for (const entry of streams.values()) {
    entry.eventSource.close()
  }
  streams.clear()
}
