import { NextRequest, NextResponse } from "next/server"
import { startStudio } from "@/lib/studio-manager"
import { getWorkspacePath, workspaceExists } from "@/lib/workspace"

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    if (!(await workspaceExists(sessionId))) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const workspace = getWorkspacePath(sessionId)
    const instance = await startStudio(sessionId, workspace)
    return NextResponse.json(instance)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
