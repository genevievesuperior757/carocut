"use client"

import { useCallback, useMemo } from "react"
import type { useOpenCodeSync } from "@/hooks/use-opencode-sync"
import { useCommands } from "@/hooks/use-commands"
import { useAgents } from "@/hooks/use-agents"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { PermissionDialog } from "./permission-dialog"
import { QuestionProvider } from "./question-context"

interface ChatPanelProps {
  sync: ReturnType<typeof useOpenCodeSync>
}

export function ChatPanel({ sync }: ChatPanelProps) {
  const {
    messages,
    parts,
    sessionStatus,
    pendingInteraction,
    sendMessage,
    sendCommand,
    abortSession,
    replyPermission,
    replyQuestion,
  } = sync

  const { commands } = useCommands()
  const { agents } = useAgents()

  const handlePermissionReply = useCallback(
    (reply: "once" | "always" | "reject") => {
      if (pendingInteraction?.kind === "permission") {
        replyPermission(pendingInteraction.request.id, reply)
      }
    },
    [pendingInteraction, replyPermission],
  )

  const handleQuestionReply = useCallback(
    (answer: string[][]) => {
      if (pendingInteraction?.kind === "question") {
        replyQuestion(pendingInteraction.request.id, answer)
      }
    },
    [pendingInteraction, replyQuestion],
  )

  const questionCtx = useMemo(
    () => ({ pendingInteraction, onQuestionReply: handleQuestionReply }),
    [pendingInteraction, handleQuestionReply],
  )

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="h-12 px-5 flex items-center border-b border-[#E2E8F0]">
        <span className="text-sm font-semibold text-[#475569]">Chat</span>
      </div>

      <QuestionProvider value={questionCtx}>
        <MessageList messages={messages} parts={parts} sessionStatus={sessionStatus} />
      </QuestionProvider>

      {pendingInteraction?.kind === "permission" && (
        <PermissionDialog request={pendingInteraction.request} onReply={handlePermissionReply} />
      )}

      <ChatInput
        onSend={sendMessage}
        onCommand={sendCommand}
        onAbort={abortSession}
        disabled={sessionStatus.type === "busy"}
        commands={commands}
        agents={agents}
      />
    </div>
  )
}
