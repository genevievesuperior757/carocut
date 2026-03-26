import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import { getClientForWorkspace } from "@/lib/opencode"

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId")
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  try {
    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
    const client = getClientForWorkspace(workspacePath)

    const [permRes, qRes] = await Promise.all([
      client.permission.list(),
      client.question.list(),
    ])

    const permissions = (permRes.data ?? []) as Array<Record<string, unknown>>
    const questions = (qRes.data ?? []) as Array<Record<string, unknown>>

    // Enrich questions with session title (subagent name)
    const enriched = await Promise.all(
      questions.map(async (q) => {
        try {
          const sid = q.sessionID as string
          if (!sid) return q
          const sRes = await client.session.get({ sessionID: sid })
          const title = (sRes.data as { title?: string })?.title
          return title ? { ...q, sessionTitle: title } : q
        } catch {
          return q
        }
      }),
    )

    return NextResponse.json({ permissions, questions: enriched })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
