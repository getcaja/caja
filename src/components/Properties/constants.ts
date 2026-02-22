import type { ElementType } from '../../types/frame'

export const BOX_TAG_OPTIONS = [
  { value: 'div', label: 'div' },
  { value: 'section', label: 'section' },
  { value: 'nav', label: 'nav' },
  { value: 'header', label: 'header' },
  { value: 'footer', label: 'footer' },
  { value: 'main', label: 'main' },
  { value: 'article', label: 'article' },
  { value: 'aside', label: 'aside' },
  { value: 'ul', label: 'ul' },
  { value: 'ol', label: 'ol' },
  { value: 'li', label: 'li' },
  { value: 'form', label: 'form' },
]

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
  { value: 'label', label: 'label — Label' },
]


export const INPUT_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'number', label: 'Number' },
]

export const OVERFLOW_OPTIONS = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'scroll', label: 'Scroll' },
]

export const BOX_SHADOW_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'sm', label: 'shadow-sm' },
  { value: 'base', label: 'shadow' },
  { value: 'md', label: 'shadow-md' },
  { value: 'lg', label: 'shadow-lg' },
  { value: 'xl', label: 'shadow-xl' },
  { value: '2xl', label: 'shadow-2xl' },
]

export const CURSOR_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'default', label: 'Default' },
  { value: 'pointer', label: 'Pointer' },
  { value: 'text', label: 'Text' },
  { value: 'not-allowed', label: 'Not Allowed' },
  { value: 'grab', label: 'Grab' },
]

export const TEXT_TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'AA' },
  { value: 'lowercase', label: 'aa' },
  { value: 'capitalize', label: 'Aa' },
]

export const WHITE_SPACE_OPTIONS = [
  { value: 'normal', label: 'Wrap' },
  { value: 'nowrap', label: 'No Wrap' },
  { value: 'pre-wrap', label: 'Pre Wrap' },
]

export const ALIGN_SELF_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
]

export const TYPE_BADGE_STYLES: Record<string, string> = {
  root: 'bg-blue-900/30 text-blue-400',
  box: 'bg-accent/15 text-accent',
  text: 'bg-emerald-900/30 text-emerald-400',
  image: 'bg-violet-900/30 text-violet-400',
  button: 'bg-amber-900/30 text-amber-400',
  input: 'bg-sky-900/30 text-sky-400',
  textarea: 'bg-sky-900/30 text-sky-400',
  select: 'bg-sky-900/30 text-sky-400',
  link: 'bg-indigo-900/30 text-indigo-400',
}

export const TYPE_BADGE_LABELS: Record<string, string> = {
  root: 'Body',
  box: 'Frame',
  text: 'Text',
  image: 'Image',
  button: 'Button',
  input: 'Input',
  textarea: 'Textarea',
  select: 'Select',
  link: 'Link',
}

export function getBadgeKey(type: ElementType, isRoot: boolean, tag?: string): string {
  if (isRoot) return 'root'
  if (type === 'text' && tag === 'a') return 'link'
  return type
}
