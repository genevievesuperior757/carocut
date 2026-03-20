import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"
import { createWorkspace } from "@/lib/workspace"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, parts } = await req.json()
    if (!sessionId || !parts) {
      return NextResponse.json(
        { error: "Missing sessionId or parts" },
        { status: 400 },
      )
    }

    // Ensure workspace directory exists
    await createWorkspace(sessionId)
    const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)

    // Use a workspace-aware client so opencode's Instance.directory points to
    // the session workspace.  This makes bash, write, edit and other file tools
    // operate inside workspaces/<sessionId> instead of the project root.
    const client = getClientForWorkspace(workspacePath)
    const { error } = await client.session.promptAsync({
      sessionID: sessionId,
      parts,
    })
    if (error) {
      return NextResponse.json({ error: String(error) }, { status: 502 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
