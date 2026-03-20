import { createOpencodeClient } from "@opencode-ai/sdk/v2"

let client: ReturnType<typeof createOpencodeClient> | null = null

const baseUrl = `http://127.0.0.1:${process.env.OPENCODE_PORT || 4096}`

/** Default client (no workspace directory override). */
export function getClient() {
  if (!client) {
    client = createOpencodeClient({ baseUrl })
  }
  return client
}

/** Client whose requests set x-opencode-directory so agent tools operate in the workspace. */
export function getClientForWorkspace(directory: string) {
  return createOpencodeClient({ baseUrl, directory })
}
