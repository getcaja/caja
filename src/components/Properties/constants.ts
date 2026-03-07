import type { ElementType } from '../../types/frame'

export const BOX_TAG_OPTIONS = [
  { value: 'div', label: 'Div', hint: '<div>' },
  { value: 'section', label: 'Section', hint: '<section>' },
  { value: 'nav', label: 'Navigation', hint: '<nav>' },
  { value: 'header', label: 'Header', hint: '<header>' },
  { value: 'footer', label: 'Footer', hint: '<footer>' },
  { value: 'main', label: 'Main', hint: '<main>' },
  { value: 'article', label: 'Article', hint: '<article>' },
  { value: 'aside', label: 'Sidebar', hint: '<aside>' },
  { value: 'ul', label: 'Unordered List', hint: '<ul>' },
  { value: 'ol', label: 'Ordered List', hint: '<ol>' },
  { value: 'li', label: 'List Item', hint: '<li>' },
  { value: 'form', label: 'Form', hint: '<form>' },
]

export const TEXT_TAG_OPTIONS = [
  { value: 'p', label: 'Paragraph', hint: '<p>' },
  { value: 'h1', label: 'Heading 1', hint: '<h1>' },
  { value: 'h2', label: 'Heading 2', hint: '<h2>' },
  { value: 'h3', label: 'Heading 3', hint: '<h3>' },
  { value: 'h4', label: 'Heading 4', hint: '<h4>' },
  { value: 'h5', label: 'Heading 5', hint: '<h5>' },
  { value: 'h6', label: 'Heading 6', hint: '<h6>' },
  { value: 'span', label: 'Inline', hint: '<span>' },
  { value: 'label', label: 'Label', hint: '<label>' },
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
  { value: 'base', label: 'Default' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'XL' },
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
  { value: 'nowrap', label: 'None', tooltip: 'No Wrap' },
  { value: 'normal', label: 'Wrap', tooltip: 'Wrap Text' },
  { value: 'pre-wrap', label: 'Pre', tooltip: 'Preserve Whitespace' },
]

export const ALIGN_SELF_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
]

export const TRANSFORM_ORIGIN_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
]

const BADGE = 'bg-accent fg-default'
const COMPONENT_BADGE = BADGE

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
  master: 'Master',
}

export function getBadgeKey(type: ElementType, isRoot: boolean, tag?: string, opts?: { isMaster?: boolean }): string {
  if (isRoot) return 'root'
  if (opts?.isMaster) return 'master'
  if (type === 'text' && tag === 'a') return 'link'
  return type
}
