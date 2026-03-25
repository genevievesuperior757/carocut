import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"
import { createWorkspace } from "@/lib/workspace"
import { formatError } from "@/lib/api-utils"

const DEFAULT_AGENT = "carocut-orchestrator"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, parts, agent } = await req.json()
    if (!sessionId || !parts) {
      return NextResponse.json(
        { error: "Missing sessionId or parts" },
        { status: 400 },
      )
    }

    // Ensure workspace directory exists
    await createWorkspace(sessionId)
    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)

    const client = getClientForWorkspace(workspacePath)
    const { error } = await client.session.promptAsync({
      sessionID: sessionId,
      parts,
      agent: agent || DEFAULT_AGENT
    })
    if (error) {
      return NextResponse.json({ error: formatError(error) }, { status: 502 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
