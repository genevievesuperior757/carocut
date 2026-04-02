export interface UploadedPromptFile {
  path: string
  filename: string
  mime?: string
}

export type PromptPartInput =
  | { type: "text"; text: string }
  | { type: "agent"; name: string }

function buildMentionText(text: string, files?: UploadedPromptFile[]) {
  const mentions = (files ?? []).map((file) => `@${file.path}`)
  if (mentions.length === 0) return text
  if (!text) return mentions.join("\n")
  return `${text}\n\n${mentions.join("\n")}`
}

export function buildPromptParts(input: {
  sessionId: string
  text: string
  subagent?: string
  files?: UploadedPromptFile[]
}): PromptPartInput[] {
  const parts: PromptPartInput[] = []

  if (input.subagent) {
    parts.push({ type: "agent", name: input.subagent })
  }

  parts.push({
    type: "text",
    text: buildMentionText(input.text, input.files),
  })

  return parts
}
