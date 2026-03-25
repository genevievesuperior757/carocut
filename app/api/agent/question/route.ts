import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"
import { formatError } from "@/lib/api-utils"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, questionId, answer } = await req.json()
    if (!sessionId || !questionId || answer === undefined) {
      return NextResponse.json(
        { error: "Missing sessionId, questionId or answer" },
        { status: 400 },
      )
    }

    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
    const client = getClientForWorkspace(workspacePath)
    // answer can be a string or array of selected labels
    const answers: string[][] = Array.isArray(answer) ? answer : [[answer]]
    const { error } = await client.question.reply({
      requestID: questionId,
      answers,
    })
    if (error) {
      return NextResponse.json({ error: formatError(error) }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
