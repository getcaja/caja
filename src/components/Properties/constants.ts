import type { ElementType } from '../../types/frame'

export const TEXT_TAG_OPTIONS = [
  { value: 'p', label: 'p — Paragraph' },
  { value: 'h1', label: 'h1 — Heading 1' },
  { value: 'h2', label: 'h2 — Heading 2' },
  { value: 'h3', label: 'h3 — Heading 3' },
  { value: 'h4', label: 'h4 — Heading 4' },
  { value: 'h5', label: 'h5 — Heading 5' },
  { value: 'h6', label: 'h6 — Heading 6' },
  { value: 'span', label: 'span — Inline' },
  { value: 'a', label: 'a — Link' },
]

export const FONT_WEIGHT_OPTIONS = [
  { value: '100', label: '100 — Thin' },
  { value: '200', label: '200 — Extra Light' },
  { value: '300', label: '300 — Light' },
  { value: '400', label: '400 — Normal' },
  { value: '500', label: '500 — Medium' },
  { value: '600', label: '600 — Semi Bold' },
  { value: '700', label: '700 — Bold' },
  { value: '800', label: '800 — Extra Bold' },
  { value: '900', label: '900 — Black' },
]

export const INPUT_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'number', label: 'Number' },
]

export const OVERFLOW_OPTIONS = [
  { value: 'visible', label: 'Off' },
  { value: 'hidden', label: 'Clip' },
  { value: 'scroll', label: 'Scroll' },
]

export const TYPE_BADGE_STYLES: Record<string, string> = {
  root: 'bg-blue-900/30 text-blue-400',
  box: 'bg-accent/15 text-accent',
  text: 'bg-emerald-900/30 text-emerald-400',
  image: 'bg-violet-900/30 text-violet-400',
  button: 'bg-amber-900/30 text-amber-400',
  input: 'bg-sky-900/30 text-sky-400',
}

export const TYPE_BADGE_LABELS: Record<string, string> = {
  root: 'Body',
  box: 'Frame',
  text: 'Text',
  image: 'Image',
  button: 'Button',
  input: 'Input',
}

export function getBadgeKey(type: ElementType, isRoot: boolean): string {
  return isRoot ? 'root' : type
}
