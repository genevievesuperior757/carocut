"use client"

import { createContext, useContext } from "react"
import type { PendingInteraction } from "@/lib/types"

interface QuestionContextValue {
  pendingInteraction: PendingInteraction | null
  onQuestionReply: (answer: string[][]) => void
}

const QuestionContext = createContext<QuestionContextValue>({
  pendingInteraction: null,
  onQuestionReply: () => {},
})

export const QuestionProvider = QuestionContext.Provider
export const useQuestionContext = () => useContext(QuestionContext)
