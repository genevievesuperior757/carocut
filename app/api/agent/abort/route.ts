import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 },
      )
    }

    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
    const client = getClientForWorkspace(workspacePath)
    const { error } = await client.session.abort({
      sessionID: sessionId,
    })
    if (error) {
      return NextResponse.json({ error: String(error) }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
