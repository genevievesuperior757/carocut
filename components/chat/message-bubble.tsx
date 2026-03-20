"use client"

import type { Message, Part } from "@/lib/types"
import { PartRenderer } from "./part-renderer"
import { LogoIcon } from "@/components/ui/logo"

interface MessageBubbleProps {
  info: Message
  parts: Part[]
}

export function MessageBubble({ info, parts }: MessageBubbleProps) {
  const isUser = info.role === "user"

  // For user messages, only render text and file parts
  const visibleParts = isUser
    ? parts.filter((p) => p.type === "text" || p.type === "file")
    : parts

  if (visibleParts.length === 0) return null

  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 mt-1">
          <LogoIcon size="sm" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-[#2563EB] text-white"
            : "bg-[#F1F5F9] border border-[#E2E8F0]"
        }`}
      >
        {!isUser && (
          <div className="mb-1.5 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
            {info.agent || "Assistant"}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {visibleParts.map((part) => (
            <PartRenderer key={part.id} part={part} isUser={isUser} />
          ))}
        </div>
      </div>
    </div>
  )
}
