import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getClient, getClientForWorkspace } from "@/lib/opencode"
import { createWorkspace } from "@/lib/workspace"
import { formatError } from "@/lib/api-utils"

export async function GET() {
  try {
    const client = getClient()
    const { data, error } = await client.session.list({ roots: true })
    if (error) {
      return NextResponse.json({ error: formatError(error) }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: formatError(err) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { title, agent, initialMessage } = body
    const client = getClient()
    const { data, error } = await client.session.create({
      title,
    })
    if (error || !data) {
      return NextResponse.json(
        { error: error ? formatError(error) : "Failed to create session" },
        { status: 502 },
      )
    }

    await createWorkspace(data.id)

    // If agent is specified, send an initial prompt to start that agent
    if (agent) {
      const workspacePath = path.resolve(process.cwd(), "workspaces", data.id)
      const workspaceClient = getClientForWorkspace(workspacePath)
      const message = initialMessage || `启动 ${agent}，等待用户指令`

      const promptResult = await workspaceClient.session.promptAsync({
        sessionID: data.id,
        parts: [{ type: "text", text: message }],
        agent,
      })
      if (promptResult.error) {
        return NextResponse.json(
          { ...data, warning: `Session created but initial prompt failed: ${formatError(promptResult.error)}` },
          { status: 201 },
        )
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: formatError(err) },
      { status: 500 },
    )
  }
}
