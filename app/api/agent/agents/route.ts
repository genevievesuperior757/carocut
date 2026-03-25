import { NextResponse } from "next/server"
import { getClient } from "@/lib/opencode"

export async function GET() {
  try {
    const client = getClient()
    const result = await client.app.agents()

    if (result.error) {
      return NextResponse.json({ agents: [] })
    }

    // Filter to only show carocut-* subagents (exclude primary agent)
    const PRIMARY_AGENT = "carocut-orchestrator"
    const agents = (result.data || [])
      .filter((agent) => agent.name.startsWith("carocut") && agent.name !== PRIMARY_AGENT)
      .map((agent) => ({
        name: agent.name,
        description: agent.description,
      }))

    return NextResponse.json({ agents })
  } catch {
    return NextResponse.json({ agents: [] })
  }
}
