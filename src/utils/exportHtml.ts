import type { Frame } from '../types/frame'
import { buildClassString, detectLabelPairs, escapeAttr, escapeText, type LabelAssociation } from './exportShared'

export function exportToHTML(
  frame: Frame,
  indent = 0,
  associations?: Map<string, LabelAssociation>,
): string {
  const pad = '  '.repeat(indent)
  const classes = buildClassString(frame)
  const classAttr = classes ? ` class="${classes}"` : ''

  if (frame.type === 'text') {
    const tag = frame.tag || 'p'
    const content = escapeText(frame.content)
    const hrefAttr = tag === 'a' && frame.href ? ` href="${escapeAttr(frame.href)}"` : ''
    const assoc = associations?.get(frame.id)
    const forAttr = assoc?.role === 'label' ? ` for="${assoc.id}"` : ''
    return `${pad}<${tag}${hrefAttr}${forAttr}${classAttr}>${content}</${tag}>\n`
  }

  if (frame.type === 'image') {
    const srcAttr = frame.src ? ` src="${escapeAttr(frame.src)}"` : ''
    const altAttr = ` alt="${escapeAttr(frame.alt || '')}"`
    return `${pad}<img${srcAttr}${altAttr}${classAttr}>\n`
  }

  if (frame.type === 'button') {
    const label = escapeText(frame.label)
    return `${pad}<button type="button"${classAttr}>${label}</button>\n`
  }

  if (frame.type === 'input') {
    const typeAttr = frame.inputType !== 'text' ? ` type="${frame.inputType}"` : ''
    const placeholderAttr = frame.placeholder ? ` placeholder="${escapeAttr(frame.placeholder)}"` : ''
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = assoc?.role === 'input' ? ` id="${assoc.id}"` : ''
    return `${pad}<input${typeAttr}${placeholderAttr}${disabledAttr}${idAttr}${classAttr}>\n`
  }

  if (frame.type === 'textarea') {
    const placeholderAttr = frame.placeholder ? ` placeholder="${escapeAttr(frame.placeholder)}"` : ''
    const rowsAttr = ` rows="${frame.rows}"`
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = assoc?.role === 'input' ? ` id="${assoc.id}"` : ''
    return `${pad}<textarea${placeholderAttr}${rowsAttr}${disabledAttr}${idAttr}${classAttr}></textarea>\n`
  }

  if (frame.type === 'select') {
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = assoc?.role === 'input' ? ` id="${assoc.id}"` : ''
    let result = `${pad}<select${disabledAttr}${idAttr}${classAttr}>\n`
    for (const opt of frame.options) {
      result += `${pad}  <option value="${escapeAttr(opt.value)}">${escapeText(opt.label)}</option>\n`
    }
    result += `${pad}</select>\n`
    return result
  }

  // Box
  const tag = frame.tag || 'div'
  const childAssociations = detectLabelPairs(frame.children)
  const mergedAssociations = associations
    ? new Map([...associations, ...childAssociations])
    : childAssociations

  const hasChildren = frame.children.length > 0

  if (hasChildren) {
    let result = `${pad}<${tag}${classAttr}>\n`
    for (const child of frame.children) {
      result += exportToHTML(child, indent + 1, mergedAssociations)
    }
    result += `${pad}</${tag}>\n`
    return result
  }
  return `${pad}<${tag}${classAttr}></${tag}>\n`
}

export function exportToHTMLDocument(frames: Frame[]): string {
  const body = frames.map((f) => exportToHTML(f, 2)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Caja Export</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
${body}</body>
</html>
`
}
