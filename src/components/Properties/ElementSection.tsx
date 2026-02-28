import { useState } from 'react'
import { Eye, EyeOff, Plus, X, Check, Code } from 'lucide-react'
import type { Frame, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, SelectOption } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { TokenInput } from '../ui/TokenInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { TYPE_BADGE_STYLES, TYPE_BADGE_LABELS, getBadgeKey, BOX_TAG_OPTIONS, TEXT_TAG_OPTIONS, INPUT_TYPE_OPTIONS } from './constants'
import { isExternalUrl, isLocalAssetPath, downloadAsset } from '../../lib/assetOps'

const TEXT_LIKE = new Set(['text', 'email', 'password', 'number', 'search', 'tel', 'url'])

function getTagOptions(type: Frame['type'], tag?: string) {
  if (type === 'box') return BOX_TAG_OPTIONS
  if (type === 'text' && tag !== 'a') return TEXT_TAG_OPTIONS
  return null
}

function getTagDefault(type: Frame['type']) {
  if (type === 'box') return 'div'
  if (type === 'text') return 'p'
  return ''
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 cursor-pointer select-none"
    >
      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
        checked ? 'bg-accent border-accent text-white' : 'border-border-accent bg-surface-2'
      }`}>
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      <span className={`text-[12px] ${checked ? 'text-text-primary' : 'text-text-muted'}`}>{label}</span>
    </button>
  )
}

export function ElementSection({ frame, isRoot }: { frame: Frame; isRoot: boolean }) {
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const toggleHidden = useFrameStore((s) => s.toggleHidden)
  const advancedMode = useFrameStore((s) => s.advancedMode)
  const filePath = useFrameStore((s) => s.filePath)
  const [downloading, setDownloading] = useState(false)

  const frameTag = 'tag' in frame ? (frame as { tag?: string }).tag : undefined
  const key = getBadgeKey(frame.type, isRoot, frameTag)
  const tagOptions = getTagOptions(frame.type, frameTag)
  const currentTag = frameTag || getTagDefault(frame.type)

  const handleImageSrcBlur = async () => {
    if (frame.type !== 'image') return
    const img = frame as ImageElement
    if (!isExternalUrl(img.src) || downloading) return
    setDownloading(true)
    try {
      const { localPath } = await downloadAsset(img.src, filePath)
      updateFrame(frame.id, { src: localPath })
    } catch (err) {
      console.warn('Image download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const updateOption = (index: number, field: keyof SelectOption, value: string) => {
    const sel = frame as SelectElement
    const options = sel.options.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt
    )
    updateFrame(frame.id, { options })
  }

  const addOption = () => {
    const sel = frame as SelectElement
    const n = sel.options.length + 1
    updateFrame(frame.id, { options: [...sel.options, { value: `option-${n}`, label: `Option ${n}` }] })
  }

  const removeOption = (index: number) => {
    const sel = frame as SelectElement
    if (sel.options.length <= 1) return
    updateFrame(frame.id, { options: sel.options.filter((_, i) => i !== index) })
  }

  return (
    <div className="p-3 border-b border-border flex flex-col gap-2">
      {/* Header: badge + name + eye */}
      <div className="flex items-center gap-2">
        <span className={`text-[12px] px-1.5 py-0.5 rounded-md font-medium ${TYPE_BADGE_STYLES[key]}`}>
          {TYPE_BADGE_LABELS[key]}
        </span>
        {!isRoot ? (
          <>
            <input
              type="text"
              value={frame.name}
              onChange={(e) => renameFrame(frame.id, e.target.value)}
              className="flex-1 c-input min-w-0"
            />
            <button
              type="button"
              onClick={() => toggleHidden(frame.id)}
              className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
                frame.hidden ? 'text-destructive' : 'text-text-muted hover:text-text-secondary'
              }`}
              title={frame.hidden ? 'Show element' : 'Hide element'}
            >
              {frame.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Tag selector */}
      {!isRoot && tagOptions && (
        <div className="flex items-center gap-2">
          <TokenInput
            value={currentTag}
            options={tagOptions}
            onChange={(v) => updateFrame(frame.id, { tag: v })}
            inlineLabel={<Code size={12} />}
            classPrefix="tag"
          />
          <div className="w-5 shrink-0" />
        </div>
      )}

      {/* Text */}
      {frame.type === 'text' && (() => {
        const t = frame as TextElement
        return (
          <>
            {t.tag === 'a' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={t.href || ''}
                  onChange={(e) => updateFrame(frame.id, { href: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 c-input"
                />
                <div className="w-5 shrink-0" />
              </div>
            )}
            <div className="flex items-start gap-2">
              <textarea
                value={t.content}
                onChange={(e) => updateFrame(frame.id, { content: e.target.value })}
                className="flex-1 h-14 c-textarea"
                placeholder="Text content..."
              />
              <div className="w-5 shrink-0" />
            </div>
          </>
        )
      })()}

      {/* Image */}
      {frame.type === 'image' && (() => {
        const img = frame as ImageElement
        return (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                {isLocalAssetPath(img.src) ? (
                  <div className="flex items-center gap-1">
                    <span className="flex-1 c-input text-text-muted truncate" title={img.src}>
                      {img.src.split('/').pop()}
                    </span>
                    <button
                      className="shrink-0 text-[10px] text-text-muted hover:text-text-primary"
                      onClick={() => updateFrame(frame.id, { src: '' })}
                      title="Remove image"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={img.src}
                      onChange={(e) => updateFrame(frame.id, { src: e.target.value })}
                      onBlur={handleImageSrcBlur}
                      placeholder="https://..."
                      className="w-full c-input"
                    />
                    {downloading && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted animate-pulse">
                        Downloading...
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="w-5 shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={img.alt}
                onChange={(e) => updateFrame(frame.id, { alt: e.target.value })}
                placeholder="Alt text..."
                className="flex-1 c-input"
              />
              <div className="w-5 shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup
                value={img.objectFit}
                options={[
                  { value: 'cover', label: 'Cover' },
                  { value: 'contain', label: 'Contain' },
                  { value: 'fill', label: 'Fill' },
                  { value: 'none', label: 'None' },
                ]}
                onChange={(v) => updateFrame(frame.id, { objectFit: v as ImageElement['objectFit'] })}
                className="flex-1"
              />
              <div className="w-5 shrink-0" />
            </div>
          </>
        )
      })()}

      {/* Button */}
      {frame.type === 'button' && (() => {
        const btn = frame as ButtonElement
        return (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={btn.content}
              onChange={(e) => updateFrame(frame.id, { content: e.target.value })}
              placeholder="Button text..."
              className="flex-1 c-input"
            />
            <div className="w-5 shrink-0" />
          </div>
        )
      })()}

      {/* Input */}
      {frame.type === 'input' && (() => {
        const inp = frame as InputElement
        const it = inp.inputType
        return (
          <>
            <div className="flex items-center gap-2">
              <TokenInput
                value={it}
                options={INPUT_TYPE_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { inputType: v as InputElement['inputType'] })}
                inlineLabel="Ty"
                classPrefix="type"
              />
              <div className="w-5 shrink-0" />
            </div>
            {TEXT_LIKE.has(it) && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inp.placeholder}
                  onChange={(e) => updateFrame(frame.id, { placeholder: e.target.value })}
                  placeholder="Placeholder..."
                  className="flex-1 c-input"
                />
                <div className="w-5 shrink-0" />
              </div>
            )}
            {it === 'radio' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inp.inputName}
                  onChange={(e) => updateFrame(frame.id, { inputName: e.target.value })}
                  placeholder="Name"
                  className="flex-1 c-input"
                />
                <input
                  type="text"
                  value={inp.inputValue}
                  onChange={(e) => updateFrame(frame.id, { inputValue: e.target.value })}
                  placeholder="Value"
                  className="flex-1 c-input"
                />
                <div className="w-5 shrink-0" />
              </div>
            )}
            {(it === 'range' || it === 'number') && (
              <div className="flex items-center gap-2">
                <input type="number" value={inp.min} onChange={(e) => updateFrame(frame.id, { min: Number(e.target.value) })} placeholder="Min" className="flex-1 c-input" />
                <input type="number" value={inp.max} onChange={(e) => updateFrame(frame.id, { max: Number(e.target.value) })} placeholder="Max" className="flex-1 c-input" />
                <input type="number" value={inp.step} onChange={(e) => updateFrame(frame.id, { step: Number(e.target.value) })} placeholder="Step" className="flex-1 c-input" />
                <div className="w-5 shrink-0" />
              </div>
            )}
            {it === 'range' && (
              <div className="flex items-center gap-2">
                <input type="number" value={inp.defaultValue} onChange={(e) => updateFrame(frame.id, { defaultValue: Number(e.target.value) })} placeholder="Default" className="flex-1 c-input" />
                <div className="w-5 shrink-0" />
              </div>
            )}
            <div className="flex items-center gap-2">
              {(it === 'checkbox' || it === 'radio') && (
                <Checkbox checked={inp.checked} onChange={(v) => updateFrame(frame.id, { checked: v })} label="Checked" />
              )}
              <Checkbox checked={inp.disabled} onChange={(v) => updateFrame(frame.id, { disabled: v })} label="Disabled" />
              <div className="flex-1" />
              <div className="w-5 shrink-0" />
            </div>
          </>
        )
      })()}

      {/* Textarea */}
      {frame.type === 'textarea' && (() => {
        const ta = frame as TextareaElement
        return (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ta.placeholder}
                onChange={(e) => updateFrame(frame.id, { placeholder: e.target.value })}
                placeholder="Placeholder..."
                className="flex-1 c-input"
              />
              <input
                type="number"
                value={ta.rows}
                onChange={(e) => updateFrame(frame.id, { rows: Math.max(1, Number(e.target.value)) })}
                placeholder="Rows"
                min={1}
                className="w-16 shrink-0 c-input"
              />
              <div className="w-5 shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={ta.disabled} onChange={(v) => updateFrame(frame.id, { disabled: v })} label="Disabled" />
              <div className="flex-1" />
              <div className="w-5 shrink-0" />
            </div>
          </>
        )
      })()}

      {/* Select */}
      {frame.type === 'select' && (() => {
        const sel = frame as SelectElement
        return (
          <>
            {sel.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => updateOption(i, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 c-input min-w-0"
                />
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(i, 'label', e.target.value)}
                  placeholder="label"
                  className="flex-1 c-input min-w-0"
                />
                <button
                  className="c-icon-btn w-5 h-5 shrink-0 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeOption(i)}
                  disabled={sel.options.length <= 1}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Checkbox checked={sel.disabled} onChange={(v) => updateFrame(frame.id, { disabled: v })} label="Disabled" />
              <div className="flex-1" />
              <button className="c-icon-btn w-5 h-5 shrink-0 hover:text-text-primary hover:bg-surface-2" onClick={addOption} title="Add option">
                <Plus size={12} />
              </button>
            </div>
          </>
        )
      })()}

      {/* Attributes (advancedMode) */}
      {advancedMode && !isRoot && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={frame.className}
            onChange={(e) => updateFrame(frame.id, { className: e.target.value })}
            placeholder=".class"
            className="flex-1 c-input text-[11px] min-w-0"
          />
          <input
            type="text"
            value={frame.htmlId}
            onChange={(e) => updateFrame(frame.id, { htmlId: e.target.value })}
            placeholder="#id"
            className="flex-1 c-input text-[11px] min-w-0"
          />
          <div className="w-5 shrink-0" />
        </div>
      )}
    </div>
  )
}
