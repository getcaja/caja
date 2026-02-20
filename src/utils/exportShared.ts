import type { Frame } from '../types/frame'
import { frameToClasses } from './frameToClasses'

/** Convert text to a valid HTML id: lowercase, non-alphanum → '-', collapse, trim */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Escape text content — only chars that are structurally special in HTML */
export function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Escape an attribute value (includes quotes on top of text escaping) */
export function escapeAttr(text: string): string {
  return escapeText(text)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface LabelAssociation {
  role: 'label' | 'input'
  id: string
}

const INPUT_TYPES: Frame['type'][] = ['input', 'textarea', 'select']

/**
 * Scan children for label+input pairs: a text[tag='label'] immediately followed
 * by an input/textarea/select. Returns a map keyed by frame.id.
 */
export function detectLabelPairs(children: Frame[]): Map<string, LabelAssociation> {
  const associations = new Map<string, LabelAssociation>()
  const usedIds = new Set<string>()

  for (let i = 0; i < children.length - 1; i++) {
    const current = children[i]
    const next = children[i + 1]

    if (
      current.type === 'text' &&
      current.tag === 'label' &&
      INPUT_TYPES.includes(next.type)
    ) {
      let baseId = slugify(current.content)
      if (!baseId) baseId = next.name

      let finalId = baseId
      let counter = 2
      while (usedIds.has(finalId)) {
        finalId = `${baseId}-${counter}`
        counter++
      }
      usedIds.add(finalId)

      associations.set(current.id, { role: 'label', id: finalId })
      associations.set(next.id, { role: 'input', id: finalId })
      i++ // skip next since it's already paired
    }
  }

  return associations
}

const AUTO_NAME_RE = /^frame-\d+$/

/** Build class string: only prepend frame.name if it's user-customized */
export function buildClassString(frame: Frame): string {
  const classes = frameToClasses(frame)
  if (frame.name && !AUTO_NAME_RE.test(frame.name)) {
    return [frame.name, classes].filter(Boolean).join(' ')
  }
  return classes
}
