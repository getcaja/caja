import type { Frame } from '../types/frame'
import { buildClassString, detectLabelPairs, escapeAttr, escapeText, type LabelAssociation } from './exportShared'
import { resolveAssetSrc } from '../lib/assetOps'

/** Build the id attribute string from htmlId or label association */
function resolveIdAttr(frame: Frame, assoc?: LabelAssociation): string {
  if (frame.htmlId) return ` id="${escapeAttr(frame.htmlId)}"`
  if (assoc?.role === 'input') return ` id="${assoc.id}"`
  return ''
}

export function exportToJSX(
  frame: Frame,
  indent = 0,
  associations?: Map<string, LabelAssociation>,
): string {
  if (frame.hidden) return ''

  const pad = '  '.repeat(indent)
  const classes = buildClassString(frame)

  if (frame.type === 'text') {
    const tag = frame.tag || 'p'
    const content = escapeText(frame.content)
    const hrefAttr = tag === 'a' && frame.href ? ` href="${escapeAttr(frame.href)}"` : ''
    const assoc = associations?.get(frame.id)
    const htmlForAttr = assoc?.role === 'label' ? ` htmlFor="${assoc.id}"` : ''
    const idAttr = resolveIdAttr(frame, assoc)
    return `${pad}<${tag}${idAttr}${hrefAttr}${htmlForAttr} className="${classes}">${content}</${tag}>\n`
  }

  if (frame.type === 'image') {
    const src = frame.src ? resolveAssetSrc(frame.src) : ''
    const srcAttr = src ? ` src="${escapeAttr(src)}"` : ''
    const altAttr = ` alt="${escapeAttr(frame.alt || '')}"`
    const idAttr = resolveIdAttr(frame)
    return `${pad}<img${idAttr}${srcAttr}${altAttr} className="${classes}" />\n`
  }

  if (frame.type === 'button') {
    const content = escapeText(frame.content)
    const idAttr = resolveIdAttr(frame)
    if (frame.href) {
      const hrefAttr = ` href="${escapeAttr(frame.href)}"`
      return `${pad}<a${idAttr}${hrefAttr} className="${classes}">${content}</a>\n`
    }
    return `${pad}<button${idAttr} type="button" className="${classes}">${content}</button>\n`
  }

  if (frame.type === 'input') {
    const it = frame.inputType
    const typeAttr = it !== 'text' ? ` type="${it}"` : ''
    const placeholderAttr = it !== 'checkbox' && it !== 'radio' && it !== 'range' && frame.placeholder ? ` placeholder="${escapeAttr(frame.placeholder)}"` : ''
    const checkedAttr = (it === 'checkbox' || it === 'radio') && frame.checked ? ' defaultChecked' : ''
    const nameAttr = it === 'radio' && frame.inputName ? ` name="${escapeAttr(frame.inputName)}"` : ''
    const valueAttr = it === 'radio' && frame.inputValue ? ` value="${escapeAttr(frame.inputValue)}"` : ''
    const rangeAttrs = it === 'range' ? ` min={${frame.min}} max={${frame.max}} step={${frame.step}} defaultValue={${frame.defaultValue}}` : ''
    const numberAttrs = it === 'number' ? `${frame.min !== 0 ? ` min={${frame.min}}` : ''}${frame.max !== 100 ? ` max={${frame.max}}` : ''}${frame.step !== 1 ? ` step={${frame.step}}` : ''}` : ''
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = resolveIdAttr(frame, assoc)
    return `${pad}<input${idAttr}${typeAttr}${nameAttr}${valueAttr}${placeholderAttr}${checkedAttr}${rangeAttrs}${numberAttrs}${disabledAttr} className="${classes}" />\n`
  }

  if (frame.type === 'textarea') {
    const placeholderAttr = frame.placeholder ? ` placeholder="${escapeAttr(frame.placeholder)}"` : ''
    const rowsAttr = ` rows={${frame.rows}}`
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = resolveIdAttr(frame, assoc)
    return `${pad}<textarea${idAttr}${placeholderAttr}${rowsAttr}${disabledAttr} className="${classes}" />\n`
  }

  if (frame.type === 'select') {
    const disabledAttr = frame.disabled ? ' disabled' : ''
    const assoc = associations?.get(frame.id)
    const idAttr = resolveIdAttr(frame, assoc)
    let result = `${pad}<select${idAttr}${disabledAttr} className="${classes}">\n`
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
    let result = `${pad}<${tag}${idAttr} className="${classes}">\n`
    for (const child of frame.children) {
      result += exportToJSX(child, indent + 1, mergedAssociations)
    }
    result += `${pad}</${tag}>\n`
    return result
  }
  return `${pad}<${tag}${idAttr} className="${classes}" />\n`
}
