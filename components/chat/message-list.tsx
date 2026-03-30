"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Message, Part, SessionStatus } from "@/lib/types"
import { MessageBubble } from "./message-bubble"

interface MessageListProps {
  messages: Message[]
  parts: Map<string, Part[]>
  sessionStatus: SessionStatus
  sessionId: string
}

export function MessageList({ messages, parts, sessionStatus, sessionId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isBusy = sessionStatus.type === "busy"

  // 检测用户是否在底部（允许50px误差容忍）
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const atBottom = scrollHeight - scrollTop - clientHeight < 50
    setIsAtBottom(atBottom)
  }, [])

  // 只有当用户在底部时才自动滚动
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, parts, sessionStatus, isAtBottom])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-11 h-11 rounded-2xl bg-[#E2E8F0] flex items-center justify-center mb-3">
          <svg
            className="w-5 h-5 text-[#94A3B8]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-[13px] text-[#94A3B8] text-center">
          Send a message to start creating
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-2.5">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            info={msg}
            parts={parts.get(msg.id) ?? []}
            sessionId={sessionId}
          />
        ))}
        {isBusy && (
          <div className="flex items-center gap-2 py-2 px-1">
            <div className="flex gap-1">
              <span className="w-[5px] h-[5px] rounded-full bg-[#94A3B8] animate-pulse" />
              <span className="w-[5px] h-[5px] rounded-full bg-[#94A3B8] animate-pulse [animation-delay:150ms]" />
              <span className="w-[5px] h-[5px] rounded-full bg-[#94A3B8] animate-pulse [animation-delay:300ms]" />
            </div>
            <span className="text-[11px] text-[#94A3B8]">Processing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
