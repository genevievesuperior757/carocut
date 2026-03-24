"use client"

import { useMemo } from "react"
import type { Message, AssistantMessage } from "@/lib/types"

export interface TokenUsage {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
}

function isAssistantMessage(msg: Message): msg is AssistantMessage {
  return msg.role === "assistant"
}

export function useTokenUsage(messages: Message[]): TokenUsage {
  return useMemo(() => {
    const usage: TokenUsage = {
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    }

    for (const msg of messages) {
      if (isAssistantMessage(msg) && msg.tokens) {
        usage.input += msg.tokens.input ?? 0
        usage.output += msg.tokens.output ?? 0
        usage.reasoning += msg.tokens.reasoning ?? 0
        usage.cacheRead += msg.tokens.cache?.read ?? 0
        usage.cacheWrite += msg.tokens.cache?.write ?? 0
      }
    }

    usage.total = usage.input + usage.output + usage.reasoning
    return usage
  }, [messages])
}
