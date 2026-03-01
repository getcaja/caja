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
  { value: 'label', label: 'label — Label' },
]


export const INPUT_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'number', label: 'Number' },
  { value: 'search', label: 'Search' },
  { value: 'tel', label: 'Tel' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'range', label: 'Range' },
]

export const OVERFLOW_OPTIONS = [
  { value: 'visible', label: 'Default' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'scroll', label: 'Scroll' },
]

export const BOX_SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Default', token: '' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
  { value: '2xl', label: '2XL' },
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
  { value: 'none', label: 'None', tooltip: 'No Transform' },
  { value: 'uppercase', label: 'AA', tooltip: 'Uppercase' },
  { value: 'lowercase', label: 'aa', tooltip: 'Lowercase' },
  { value: 'capitalize', label: 'Aa', tooltip: 'Capitalize' },
]

export const WHITE_SPACE_OPTIONS = [
  { value: 'normal', label: 'Wrap', tooltip: 'Wrap Text' },
  { value: 'nowrap', label: 'No Wrap', tooltip: 'No Wrap' },
  { value: 'pre-wrap', label: 'Pre Wrap', tooltip: 'Preserve Whitespace' },
]

export const ALIGN_SELF_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
]

const BADGE = 'bg-accent/15 text-accent'
const COMPONENT_BADGE = 'bg-purple-500/15 text-purple-400'

export const TYPE_BADGE_STYLES: Record<string, string> = {
  root: BADGE,
  box: BADGE,
  text: BADGE,
  image: BADGE,
  button: BADGE,
  input: BADGE,
  textarea: BADGE,
  select: BADGE,
  link: BADGE,
  component: COMPONENT_BADGE,
  master: COMPONENT_BADGE,
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
  component: 'Component',
  master: 'Master',
}

export function getBadgeKey(type: ElementType, isRoot: boolean, tag?: string, opts?: { isInstance?: boolean; isMaster?: boolean }): string {
  if (isRoot) return 'root'
  if (opts?.isMaster) return 'master'
  if (opts?.isInstance) return 'component'
  if (type === 'text' && tag === 'a') return 'link'
  return type
}
