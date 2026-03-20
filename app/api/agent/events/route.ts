import path from "node:path"
import { NextRequest } from "next/server"
import { getClientForWorkspace } from "@/lib/opencode"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId")
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const close = () => {
        if (!closed) {
          closed = true
          controller.close()
        }
      }

      try {
        const workspacePath = path.resolve(process.cwd(), "workspaces", sessionId)
        const client = getClientForWorkspace(workspacePath)
        const result = await client.event.subscribe()
        const eventStream = result.stream

        for await (const event of eventStream) {
          if (closed) break

          // Filter events to only those relevant to this session.
          // Events may have sessionID in their properties.
          const props = "properties" in event ? event.properties : undefined
          if (
            props &&
            typeof props === "object" &&
            "sessionID" in props &&
            (props as { sessionID?: string }).sessionID !== sessionId
          ) {
            continue
          }

          const payload = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(payload))
        }
      } catch (err) {
        if (!closed) {
          const msg = err instanceof Error ? err.message : "Stream error"
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: msg })}\n\n`),
          )
        }
      } finally {
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
