// Batch variable substitution for MCP batch_update operations.
// Replaces "$prev", "$0", "$1", etc. ONLY in known ID-reference fields
// to avoid corrupting content text like "$0" (a price) into a frame ID.

interface ToolResult {
  success: boolean
  data?: unknown
}

const ID_FIELDS = new Set(['parent_id', 'id', 'new_parent_id', 'component_id', 'frame_id'])

export function resolveRefs(params: Record<string, unknown>, resultIds: string[]): Record<string, unknown> {
  const resolve = (val: unknown, key?: string): unknown => {
    if (typeof val === 'string' && key && ID_FIELDS.has(key)) {
      if (val === '$prev') {
        for (let i = resultIds.length - 1; i >= 0; i--) {
          if (resultIds[i]) return resultIds[i]
        }
        return val
      }
      const m = val.match(/^\$(\d+)$/)
      if (m) {
        const idx = parseInt(m[1])
        return (idx < resultIds.length && resultIds[idx]) ? resultIds[idx] : val
      }
      return val
    }
    if (Array.isArray(val)) return val.map((v) => resolve(v))
    if (val !== null && typeof val === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) out[k] = resolve(v, k)
      return out
    }
    return val
  }
  return resolve(params) as Record<string, unknown>
}

export function extractResultId(result: ToolResult): string {
  if (!result.data || typeof result.data !== 'object') return ''
  const d = result.data as Record<string, unknown>
  if (typeof d.id === 'string') return d.id
  if (typeof d.duplicate === 'string') return d.duplicate
  if (typeof d.removed === 'string') return d.removed
  if (typeof d.wrapper === 'string') return d.wrapper
  return ''
}
