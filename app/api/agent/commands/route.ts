import { NextResponse } from "next/server"
import { getClient } from "@/lib/opencode"

const BUILTIN_COMMANDS = [
  { name: "compact", description: "Summarize conversation history to save context space" },
]

export async function GET() {
  try {
    const client = getClient()
    const result = await client.command.list()

    if (result.error) {
      return NextResponse.json({ commands: BUILTIN_COMMANDS })
    }

    const builtinNames = new Set(BUILTIN_COMMANDS.map((c) => c.name))
    const customCommands = (result.data || [])
      .filter((cmd) => !builtinNames.has(cmd.name) && cmd.name.startsWith("carocut"))
      .map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
      }))

    return NextResponse.json({ commands: [...BUILTIN_COMMANDS, ...customCommands] })
  } catch {
    return NextResponse.json({ commands: BUILTIN_COMMANDS })
  }
}
