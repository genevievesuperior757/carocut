import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"
import { formatError } from "@/lib/api-utils"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, requestId, reply } = await req.json()
    if (!sessionId || !requestId || !reply) {
      return NextResponse.json(
        { error: "Missing sessionId, requestId or reply" },
        { status: 400 },
      )
    }
    if (!["once", "always", "reject"].includes(reply)) {
      return NextResponse.json(
        { error: "reply must be one of: once, always, reject" },
        { status: 400 },
      )
    }
    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
    const client = getClientForWorkspace(workspacePath)
    const { error } = await client.permission.reply({
      requestID: requestId,
      reply,
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
