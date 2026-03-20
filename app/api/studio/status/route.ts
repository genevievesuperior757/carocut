import { NextRequest, NextResponse } from "next/server"
import { getStudioInstance, isStudioReady, startStudio, touchStudioInstance } from "@/lib/studio-manager"
import { getWorkspacePath } from "@/lib/workspace"

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    // Check if studio is already running
    const instance = getStudioInstance(sessionId)
    if (instance && (instance.status === "running" || instance.status === "starting")) {
      touchStudioInstance(sessionId)
      return NextResponse.json(instance)
    }

    // Check if conditions are met to auto-start
    if (isStudioReady(sessionId)) {
      const workspace = getWorkspacePath(sessionId)
      const started = await startStudio(sessionId, workspace)
      return NextResponse.json(started)
    }

    // Conditions not met
    return NextResponse.json({ status: "unavailable" })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
