import { useState } from 'react'
import { Plus, X, Check, Code, Link, ImageIcon, Upload, MessageSquareQuote, Scaling, Component, Pencil, RotateCcw, Unlink, Hash, Tag } from 'lucide-react'
import type { Frame, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, SelectOption } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
import { Popover } from '../ui/Popover'
import { TYPE_BADGE_STYLES, TYPE_BADGE_LABELS, getBadgeKey, BOX_TAG_OPTIONS, TEXT_TAG_OPTIONS, INPUT_TYPE_OPTIONS } from './constants'

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
import { isExternalUrl, isLocalAssetPath, downloadAsset, importLocalAsset, getAssetDisplayName } from '../../lib/assetOps'

const TEXT_LIKE = new Set(['text', 'email', 'password', 'number', 'search', 'tel', 'url'])

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 cursor-pointer select-none"
    >
      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
        checked ? 'bg-accent border-accent text-white' : 'border-border-accent bg-inset'
      }`}>
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      <span className={`text-[12px] ${checked ? 'fg-default' : 'fg-subtle'}`}>{label}</span>
    </button>
  )
}

function HrefPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const pages = useFrameStore((s) => s.pages)

  const matchedPage = value ? pages.find(p => p.route === value) : null
  const isCustom = !!value && !matchedPage
  const selectValue = !value ? '__none__' : matchedPage ? value : '__custom__'

  const options = [
    { value: '__none__', label: 'None' },
    ...pages.map(p => ({ value: p.route, label: `${p.name} (${p.route})` })),
    { value: '__custom__', label: 'URL' },
  ]

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="fg-disabled shrink-0"><Link size={12} /></span>
        <Select
          value={selectValue}
          options={options}
          onChange={(v) => {
            if (v === '__none__') onChange('')
            else if (v === '__custom__') onChange(value || 'https://')
            else onChange(v)
          }}
          className="flex-1"
        />
        <div className="w-5 shrink-0" />
      </div>
      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="flex-1 c-input"
          />
          <div className="w-5 shrink-0" />
        </div>
      )}
    </>
  )
}

function ComponentButton({ frame, isRoot, isMaster }: { frame: Frame; isRoot: boolean; isMaster: boolean }) {
  const [open, setOpen] = useState(false)
  const isInstance = !!frame._componentId

  // Root → no button, just the 20px slot
  if (isRoot) return <div className="w-5 shrink-0" />

  // Master → dimmed icon, no action
  if (isMaster) {
    return (
      <div className="w-5 shrink-0 flex items-center justify-center text-purple-400 opacity-50">
        <Component size={12} />
      </div>
    )
  }

  // Regular frame → click to create component
  if (!isInstance) {
    return (
      <button
        onClick={() => useFrameStore.getState().createComponent(frame.id)}
        className="w-5 h-5 flex items-center justify-center shrink-0 rounded fg-icon-subtle hover:fg-icon-muted"
        title="Create Component"
      >
        <Component size={12} />
      </button>
    )
  }

  // Instance → purple icon, popover with actions
  const menuItem = 'flex items-center gap-2 w-full px-3 py-1.5 text-[12px] fg-muted hover:bg-emphasis cursor-default first:rounded-t-lg last:rounded-b-lg'

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          className="w-5 h-5 flex items-center justify-center shrink-0 rounded bg-purple-500 text-white hover:bg-purple-400"
          title="Component instance"
        >
          <Component size={12} />
        </button>
      }
      align="end"
    >
      <div className="py-1 min-w-[160px]">
        <button className={menuItem} onClick={() => {
          const cid = frame._componentId
          if (cid) useFrameStore.getState().enterComponentEditMode(cid)
          setOpen(false)
        }}>
          <Pencil size={12} /> Edit Master
        </button>
        <button className={menuItem} onClick={() => {
          useFrameStore.getState().resetInstance(frame.id)
          setOpen(false)
        }}>
          <RotateCcw size={12} /> Reset
        </button>
        <button className={menuItem} onClick={() => {
          useFrameStore.getState().detachInstance(frame.id)
          setOpen(false)
        }}>
          <Unlink size={12} /> Detach
        </button>
      </div>
    </Popover>
  )
}

export function ElementSection({ frame, isRoot }: { frame: Frame; isRoot: boolean }) {
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const filePath = useFrameStore((s) => s.filePath)
  const [downloading, setDownloading] = useState(false)

  const frameTag = 'tag' in frame ? (frame as { tag?: string }).tag : undefined
  const isOnComponentPage = useFrameStore((s) => s.pages.find((p) => p.id === s.activePageId)?.isComponentPage ?? false)
  const isMaster = isOnComponentPage && !isRoot
  const key = getBadgeKey(frame.type, isRoot, frameTag, { isMaster })
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
    <div className="px-4 py-3 border-b border-border flex flex-col gap-2">
      {/* Header: badge + name + component action */}
      <div className="flex items-center gap-2">
        <span className={`text-[12px] px-1.5 py-0.5 rounded-md font-medium ${TYPE_BADGE_STYLES[key]}`}>
          {TYPE_BADGE_LABELS[key]}
        </span>
        {!isRoot ? (
          <input
            type="text"
            value={frame.name}
            onChange={(e) => renameFrame(frame.id, e.target.value)}
            className="flex-1 c-input min-w-0"
          />
        ) : (
          <div className="flex-1" />
        )}
        <ComponentButton frame={frame} isRoot={isRoot} isMaster={isMaster} />
      </div>

      {/* Tag selector */}
      {!isRoot && tagOptions && (
        <div className="flex items-center gap-2">
          <TokenInput
            value={currentTag}
            options={tagOptions}
            onChange={(v) => updateFrame(frame.id, { tag: v } as Partial<Frame>)}
            inlineLabel={<Code size={12} />}
            classPrefix="tag"
            tooltip="HTML Tag"
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
              <HrefPicker value={t.href || ''} onChange={(v) => updateFrame(frame.id, { href: v })} />
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
        const isLocal = img.src && isLocalAssetPath(img.src)
        return (
          <>
            {/* Image source */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                {isLocal ? (
                  /* Read-only display for local assets — show filename only */
                  <div className="c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden relative">
                    <span className="w-4 shrink-0 flex items-center justify-center fg-icon-muted">
                      <ImageIcon size={12} />
                    </span>
                    <span className="flex-1 min-w-[20px] text-[12px] fg-muted truncate select-none">
                      {getAssetDisplayName(img.src)}
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => updateFrame(frame.id, { src: '' })}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:text-destructive hover:bg-inset"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  /* Editable input for URLs or empty state */
                  <div
                    className="c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
                    onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}
                  >
                    <span className={`w-4 shrink-0 flex items-center justify-center ${img.src ? 'fg-icon-muted' : 'fg-icon-subtle'}`}>
                      <ImageIcon size={12} />
                    </span>
                    <input
                      type="text"
                      value={img.src}
                      onChange={(e) => updateFrame(frame.id, { src: e.target.value })}
                      onBlur={handleImageSrcBlur}
                      placeholder="None"
                      className="flex-1 min-w-[20px] text-[12px] fg-default"
                    />
                    {downloading ? (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] fg-subtle animate-pulse">
                        ...
                      </span>
                    ) : img.src ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => updateFrame(frame.id, { src: '' })}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:text-destructive hover:bg-inset"
                      >
                        <X size={12} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={async () => {
                          try {
                            const result = await importLocalAsset(filePath)
                            if (result) updateFrame(frame.id, { src: result.localPath })
                          } catch (err) {
                            console.error('Import asset failed:', err)
                          }
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset"
                      >
                        <Upload size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="w-5 shrink-0" />
            </div>
            {/* Alt + Object fit — only when image is set */}
            {img.src && (
              <div className="flex items-center gap-2">
                <TokenInput
                  value={img.objectFit}
                  options={[
                    { value: 'cover', label: 'Cover' },
                    { value: 'contain', label: 'Contain' },
                    { value: 'fill', label: 'Fill' },
                    { value: 'none', label: 'None' },
                  ]}
                  onChange={(v) => updateFrame(frame.id, { objectFit: v as ImageElement['objectFit'] })}
                  classPrefix="object"
                  inlineLabel={<Scaling size={12} />}
                  tooltip="Object Fit"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="c-scale-input flex items-center gap-0.5 overflow-hidden cursor-text"
                    onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}
                  >
                    <span className={`w-4 shrink-0 flex items-center justify-center ${img.alt ? 'fg-icon-muted' : 'fg-icon-subtle'}`}><MessageSquareQuote size={12} /></span>
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => updateFrame(frame.id, { alt: e.target.value })}
                      placeholder=""
                      className="flex-1 min-w-[20px] text-[12px] fg-default"
                    />
                  </div>
                </div>
                <div className="w-5 shrink-0" />
              </div>
            )}
          </>
        )
      })()}

      {/* Button */}
      {frame.type === 'button' && (() => {
        const btn = frame as ButtonElement
        return (
          <>
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
            <HrefPicker value={btn.href || ''} onChange={(v) => updateFrame(frame.id, { href: v })} />
          </>
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
                tooltip="Input Type"
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
              <button className="c-icon-btn w-5 h-5 shrink-0 hover:fg-default hover:bg-inset" onClick={addOption} title="Add option">
                <Plus size={12} />
              </button>
            </div>
          </>
        )
      })()}

      {/* Attributes */}
      {!isRoot && (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 c-scale-input flex items-center gap-0.5 overflow-hidden cursor-text" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}>
            <span className={`w-4 shrink-0 flex items-center justify-center ${frame.className ? 'fg-icon-muted' : 'fg-icon-subtle'}`}><Tag size={12} /></span>
            <input
              type="text"
              value={frame.className}
              onChange={(e) => updateFrame(frame.id, { className: e.target.value })}
              placeholder="Class"
              className="flex-1 min-w-[20px] text-[12px] fg-default"
            />
          </div>
          <div className="flex-1 min-w-0 c-scale-input flex items-center gap-0.5 overflow-hidden cursor-text" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}>
            <span className={`w-4 shrink-0 flex items-center justify-center ${frame.htmlId ? 'fg-icon-muted' : 'fg-icon-subtle'}`}><Hash size={12} /></span>
            <input
              type="text"
              value={frame.htmlId}
              onChange={(e) => updateFrame(frame.id, { htmlId: e.target.value })}
              placeholder="ID"
              className="flex-1 min-w-[20px] text-[12px] fg-default"
            />
          </div>
          <div className="w-5 shrink-0" />
        </div>
      )}

    </div>
  )
}
