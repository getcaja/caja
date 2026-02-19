import type { Frame } from '../types/frame'
import { frameToClasses } from './frameToClasses'

export function exportToJSX(frame: Frame, indent = 0): string {
  const pad = '  '.repeat(indent)
  const classes = [frame.name, frameToClasses(frame)].filter(Boolean).join(' ')

  if (frame.type === 'text') {
    const tag = frame.tag || 'p'
    const content = frame.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const hrefAttr = tag === 'a' && frame.href ? ` href="${frame.href}"` : ''
    return `${pad}<${tag}${hrefAttr} className="${classes}">${content}</${tag}>\n`
  }

  if (frame.type === 'image') {
    const srcAttr = frame.src ? ` src="${frame.src}"` : ''
    const altAttr = ` alt="${frame.alt || ''}"`
    return `${pad}<img${srcAttr}${altAttr} className="${classes}" />\n`
  }

  if (frame.type === 'button') {
    const label = frame.label.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `${pad}<button className="${classes}">${label}</button>\n`
  }

  if (frame.type === 'input') {
    const typeAttr = frame.inputType !== 'text' ? ` type="${frame.inputType}"` : ''
    const placeholderAttr = frame.placeholder ? ` placeholder="${frame.placeholder}"` : ''
    const disabledAttr = frame.disabled ? ' disabled' : ''
    return `${pad}<input${typeAttr}${placeholderAttr}${disabledAttr} className="${classes}" />\n`
  }

  const hasChildren = frame.children.length > 0

  if (hasChildren) {
    let result = `${pad}<div className="${classes}">\n`
    for (const child of frame.children) {
      result += exportToJSX(child, indent + 1)
    }
    result += `${pad}</div>\n`
    return result
  }
  return `${pad}<div className="${classes}" />\n`
}
