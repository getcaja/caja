import type { Frame } from '../types/frame'
import { buildClassString, detectLabelPairs, escapeAttr, escapeText, type LabelAssociation } from './exportShared'
import { collectGoogleFonts, toGoogleFontUrl, toGoogleFontStyleRule } from './googleFonts'

/** Build the id attribute string from htmlId or label association */
function resolveIdAttr(frame: Frame, assoc?: LabelAssociation): string {
  // User-defined htmlId takes precedence
  if (frame.htmlId) return ` id="${escapeAttr(frame.htmlId)}"`
  // Label-input association for accessibility
  if (assoc?.role === 'input') return ` id="${assoc.id}"`
  return ''
}

export function exportToHTML(
  frame: Frame,
  indent = 0,
  associations?: Map<string, LabelAssociation>,
): string {
  if (frame.hidden) return ''

  const pad = '  '.repeat(indent)
  const classes = buildClassString(frame)
  const classAttr = classes ? ` class="${classes}"` : ''

  if (frame.type === 'text') {
    const tag = frame.tag || 'p'
    const content = escapeText(frame.content)
    const hrefAttr = tag === 'a' && frame.href ? ` href="${escapeAttr(frame.href)}"` : ''
    const assoc = associations?.get(frame.id)
    const forAttr = assoc?.role === 'label' ? ` for="${assoc.id}"` : ''
    const idAttr = resolveIdAttr(frame, assoc)
    return `${pad}<${tag}${idAttr}${hrefAttr}${forAttr}${classAttr}>${content}</${tag}>\n`
  }

  if (frame.type === 'image') {
    const srcAttr = frame.src ? ` src="${escapeAttr(frame.src)}"` : ''
    const altAttr = ` alt="${escapeAttr(frame.alt || '')}"`
    const idAttr = resolveIdAttr(frame)
    return `${pad}<img${idAttr}${srcAttr}${altAttr}${classAttr}>\n`
  }

  if (frame.type === 'button') {
    const content = escapeText(frame.content)
    const idAttr = resolveIdAttr(frame)
    return `${pad}<button${idAttr} type="button"${classAttr}>${content}</button>\n`
  }

  if (frame.type === 'input') {
    const it = frame.inputType
    const typeAttr = it !== 'text' ? ` type="${it}"` : ''
    const placeholderAttr = it !== 'checkbox' && it !== 'radio' && it !== 'range' && frame.placeholder ? ` placeholder="${escapeAttr(frame.placeholder)}"` : ''
    const checkedAttr = (it === 'checkbox' || it === 'radio') && frame.checked ? ' checked' : ''
    const nameAttr = it === 'radio' && frame.inputName ? ` name="${escapeAttr(frame.inputName)}"` : ''
    const valueAttr = it === 'radio' && frame.inputValue ? ` value="${escapeAttr(frame.inputValue)}"` : ''
    const rangeAttrs = it === 'range' ? ` min="${frame.min}" max="${frame.max}" step="${frame.step}" value="${frame.defaultValue}"` : ''
    const numberAttrs = it === 'number' ? `${frame.min !== 0 ? ` min="${frame.min}"` : ''}${frame.max !== 100 ? ` max="${frame.max}"` : ''}${frame.step !== 1 ? ` step="${frame.step}"` : ''}` : ''
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = resolveIdAttr(frame, assoc)
    return `${pad}<input${idAttr}${typeAttr}${nameAttr}${valueAttr}${placeholderAttr}${checkedAttr}${rangeAttrs}${numberAttrs}${disabledAttr}${classAttr}>\n`
  }

  if (frame.type === 'textarea') {
    const placeholderAttr = frame.placeholder ? ` placeholder="${escapeAttr(frame.placeholder)}"` : ''
    const rowsAttr = ` rows="${frame.rows}"`
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = resolveIdAttr(frame, assoc)
    return `${pad}<textarea${idAttr}${placeholderAttr}${rowsAttr}${disabledAttr}${classAttr}></textarea>\n`
  }

  if (frame.type === 'select') {
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = resolveIdAttr(frame, assoc)
    let result = `${pad}<select${idAttr}${disabledAttr}${classAttr}>\n`
    for (const opt of frame.options) {
      result += `${pad}  <option value="${escapeAttr(opt.value)}">${escapeText(opt.label)}</option>\n`
    }
    result += `${pad}</select>\n`
    return result
  }

  // Box
  const tag = frame.tag || 'div'
  const idAttr = resolveIdAttr(frame)
  const childAssociations = detectLabelPairs(frame.children)
  const mergedAssociations = associations
    ? new Map([...associations, ...childAssociations])
    : childAssociations

  const hasChildren = frame.children.length > 0

  if (hasChildren) {
    let result = `${pad}<${tag}${idAttr}${classAttr}>\n`
    for (const child of frame.children) {
      result += exportToHTML(child, indent + 1, mergedAssociations)
    }
    result += `${pad}</${tag}>\n`
    return result
  }
  return `${pad}<${tag}${idAttr}${classAttr}></${tag}>\n`
}

export function exportToHTMLDocument(root: Frame): string {
  const bodyClasses = buildClassString(root)
  const bodyClassAttr = bodyClasses ? ` class="${bodyClasses}"` : ''
  const body = root.children.map((f) => exportToHTML(f, 2)).join('\n')

  // [Experimental] Google Fonts — collect all used fonts and generate <link> + <style>
  const googleFonts = collectGoogleFonts(root.children)
  const fontLinks = googleFonts
    .map((f) => `  <link href="${toGoogleFontUrl(f)}" rel="stylesheet">`)
    .join('\n')
  const fontStyles = googleFonts.length
    ? `  <style>\n${googleFonts.map((f) => `    ${toGoogleFontStyleRule(f)}`).join('\n')}\n  </style>`
    : ''
  const fontBlock = [fontLinks, fontStyles].filter(Boolean).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Caja Export</title>
${fontBlock ? fontBlock + '\n' : ''}  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4/dist/cdn.min.js"></script>
</head>
<body${bodyClassAttr}>
${body}</body>
</html>
`
}
