"use client"

import { useMemo } from "react"
import type { Message, AssistantMessage } from "@/lib/types"

export interface ModelTokens {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export interface TokenUsage extends ModelTokens {
  total: number
  byModel: Record<string, ModelTokens>
}

function isAssistantMessage(msg: Message): msg is AssistantMessage {
  return msg.role === "assistant"
}

export function useTokenUsage(messages: Message[]): TokenUsage {
  return useMemo(() => {
    const byModel: Record<string, ModelTokens> = {}
    const totals: ModelTokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

    for (const msg of messages) {
      if (isAssistantMessage(msg) && msg.tokens) {
        const modelID = msg.modelID ?? "unknown"
        if (!byModel[modelID]) byModel[modelID] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
        byModel[modelID].input += msg.tokens.input ?? 0
        byModel[modelID].output += msg.tokens.output ?? 0
        byModel[modelID].cacheRead += msg.tokens.cache?.read ?? 0
        byModel[modelID].cacheWrite += msg.tokens.cache?.write ?? 0
        totals.input += msg.tokens.input ?? 0
        totals.output += msg.tokens.output ?? 0
        totals.cacheRead += msg.tokens.cache?.read ?? 0
        totals.cacheWrite += msg.tokens.cache?.write ?? 0
      }
    }

    return { ...totals, total: totals.input + totals.output, byModel }
  }, [messages])
}
