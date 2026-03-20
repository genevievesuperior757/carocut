import { NextRequest, NextResponse } from "next/server"
import { stopStudio } from "@/lib/studio-manager"

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    stopStudio(sessionId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
