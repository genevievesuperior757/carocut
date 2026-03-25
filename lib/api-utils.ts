/**
 * Format an error value to a readable string for API responses.
 * Handles Error instances, strings, and plain objects with nested errors.
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>
    if (obj.message) return String(obj.message)
    if (obj.error) return formatError(obj.error)
    try {
      return JSON.stringify(error)
    } catch {
      return "Unknown error"
    }
  }
  return "Unknown error"
}
