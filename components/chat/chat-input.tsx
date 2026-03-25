"use client"

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type DragEvent,
  type ChangeEvent,
} from "react"
import { MentionAutocomplete } from "./mention-autocomplete"
import type { Command } from "@/hooks/use-commands"
import type { Agent } from "@/hooks/use-agents"

interface ChatInputProps {
  onSend: (text: string, files?: File[], subagent?: string) => void
  onCommand?: (command: string, args?: string) => void
  onAbort?: () => void
  disabled?: boolean
  commands?: Command[]
  agents?: Agent[]
}

export function ChatInput({ onSend, onCommand, onAbort, disabled, commands = [], agents = [] }: ChatInputProps) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [autocompleteDismissed, setAutocompleteDismissed] = useState(false)

  // Compute autocomplete items based on text input
  const { autocompleteMode, autocompleteItems } = useMemo(() => {
    // Detect @agent at the start of text (no space allowed after @ to trigger autocomplete)
    const agentMatch = text.match(/^@([a-zA-Z0-9_-]*)$/)
    if (agentMatch && agents.length > 0) {
      const query = agentMatch[1].toLowerCase()
      const filtered = agents.filter((agent) => agent.name.toLowerCase().startsWith(query))
      return { autocompleteMode: filtered.length > 0 ? "agent" : "none", autocompleteItems: filtered }
    }

    // Detect /command at the start of text (no space allowed to trigger autocomplete)
    const commandMatch = text.match(/^\/([a-zA-Z0-9_-]*)$/)
    if (commandMatch && commands.length > 0) {
      const query = commandMatch[1].toLowerCase()
      const filtered = commands.filter((cmd) => cmd.name.toLowerCase().startsWith(query))
      return { autocompleteMode: filtered.length > 0 ? "command" : "none", autocompleteItems: filtered }
    }

    return { autocompleteMode: "none" as const, autocompleteItems: [] }
  }, [text, commands, agents])

  const handleItemSelect = useCallback((item: Command | Agent, mode: "command" | "agent") => {
    if (mode === "command") {
      setText(`/${item.name} `)
    } else {
      setText(`@${item.name} `)
    }
    setAutocompleteDismissed(false)
    textareaRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    if (disabled) return

    // Handle /command
    if (trimmed.startsWith("/") && onCommand) {
      const withoutSlash = trimmed.slice(1)
      const spaceIndex = withoutSlash.indexOf(" ")
      if (spaceIndex === -1) {
        onCommand(withoutSlash.toLowerCase(), "")
      } else {
        onCommand(withoutSlash.slice(0, spaceIndex).toLowerCase(), withoutSlash.slice(spaceIndex + 1).trim())
      }
      setText("")
      setFiles([])
      return
    }

    // Handle @subagent - extract subagent name and message
    let messageText = trimmed
    let subagentName: string | undefined

    const subagentMatch = trimmed.match(/^@([a-zA-Z0-9_-]+)\s+([\s\S]+)$/)
    if (subagentMatch) {
      subagentName = subagentMatch[1]
      messageText = subagentMatch[2]
    }

    onSend(messageText, files.length > 0 ? files : undefined, subagentName)
    setText("")
    setFiles([])
  }, [text, files, disabled, onSend, onCommand])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (autocompleteMode !== "none" && autocompleteItems.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, autocompleteItems.length - 1))
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          return
        }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault()
          handleItemSelect(autocompleteItems[selectedIndex], autocompleteMode as "command" | "agent")
          return
        }
        if (e.key === "Escape") {
          e.preventDefault()
          setAutocompleteDismissed(true)
          return
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [autocompleteMode, autocompleteItems, selectedIndex, handleItemSelect, handleSend],
  )

  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setSelectedIndex(0)
    setAutocompleteDismissed(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) setFiles((prev) => [...prev, ...droppedFiles])
  }, [])
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (selected && selected.length > 0) setFiles((prev) => [...prev, ...Array.from(selected)])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])
  const removeFile = useCallback((index: number) => { setFiles((prev) => prev.filter((_, i) => i !== index)) }, [])

  const trigger = autocompleteMode === "agent" ? "@" : "/"
  const placeholder = isDragging
    ? "拖放文件到此处..."
    : "输入消息... (/ 命令, @ agent)"

  return (
    <div
      className={`relative border-t border-[#E2E8F0] bg-white px-4 py-3 ${isDragging ? "ring-2 ring-inset ring-[#2563EB]/20" : ""}`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <MentionAutocomplete
        items={autocompleteItems}
        selectedIndex={selectedIndex}
        onSelect={(item) => handleItemSelect(item, autocompleteMode as "command" | "agent")}
        visible={autocompleteMode !== "none" && !autocompleteDismissed}
        trigger={trigger}
      />

      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-1.5 border border-[#E2E8F0]">
              <svg className="w-3.5 h-3.5 text-[#64748B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              <span className="text-xs text-[#1E293B] max-w-[140px] truncate font-medium">{file.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-[#94A3B8] hover:text-[#475569] cursor-pointer transition-colors duration-150" aria-label={`Remove ${file.name}`}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <button
          type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[#2563EB] hover:bg-[#EFF6FF] transition-colors duration-150 disabled:opacity-30 cursor-pointer"
          aria-label="Upload file"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef} value={text}
            onChange={handleTextChange} onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:opacity-40 transition-colors"
          />
        </div>

        {disabled && onAbort ? (
          <button type="button" onClick={onAbort} className="shrink-0 w-9 h-9 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] flex items-center justify-center transition-colors duration-150 cursor-pointer" aria-label="中断">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          </button>
        ) : (
          <button
            type="button" onClick={handleSend}
            disabled={disabled || (!text.trim() && files.length === 0)}
            className="shrink-0 w-9 h-9 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] flex items-center justify-center transition-colors duration-150 disabled:opacity-30 cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        )}
      </div>

      {isDragging && <div className="mt-2 text-center text-xs text-[#2563EB] font-medium">拖放文件以添加附件</div>}
    </div>
  )
}
