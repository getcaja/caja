import { useState } from 'react'
import { Plus, X, Check, Link, ImageIcon, Upload, MessageSquareQuote, Scaling, Component, Pencil, RotateCcw, Unlink, Hash, Braces, Code, CircleDot, TextCursorInput, Rows3 } from 'lucide-react'
import type { Frame, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, SelectOption } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Select } from '../ui/Select'
import { Popover } from '../ui/Popover'
import { Section } from '../ui/Section'
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

function LabelInput({ value, onChange, label, icon, type = 'text', className }: { value: string | number; onChange: (v: string) => void; label?: string; icon?: React.ReactNode; type?: string; className?: string }) {
  const active = value !== '' && value !== 0
  return (
    <div className={`min-w-0 c-scale-input flex items-center overflow-hidden cursor-text ${className ?? 'flex-1'}`} onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}>
      {icon ? (
        <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${active ? 'is-active' : ''}`}>{icon}</span>
      ) : label ? (
        <span className={`shrink-0 text-[12px] pl-0.5 c-dimmed ${active ? 'is-active' : ''}`}>{label}</span>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-[20px] text-[12px] fg-default"
      />
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      <span className={`c-checkbox ${checked ? 'is-checked' : ''}`}>
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      <span className={`text-[12px] c-dimmed ${checked ? 'is-active' : ''}`}>{label}</span>
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
    ...pages.filter(p => !p.isComponentPage).map(p => ({ value: p.route, label: p.name, hint: p.route })),
    { value: '__custom__', label: 'URL' },
  ]

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={selectValue}
          options={options}
          onChange={(v) => {
            if (v === '__none__') onChange('')
            else if (v === '__custom__') onChange('https://')
            else onChange(v)
          }}
          className="flex-1"
          inlineLabel={<Link size={12} />}
          initialValue="__none__"
          tooltip="Link"
        />
        <div className="c-slot-spacer" />
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
          <div className="c-slot-spacer" />
        </div>
      )}
    </>
  )
}

function ComponentButton({ frame, isRoot, isMaster }: { frame: Frame; isRoot: boolean; isMaster: boolean }) {
  const [open, setOpen] = useState(false)
  const isInstance = !!frame._componentId

  // Root → no button, just the 20px slot
  if (isRoot) return <div className="c-slot-spacer" />

  // Master → dimmed icon, no action
  if (isMaster) {
    return (
      <div className="c-slot text-accent opacity-50">
        <Component size={12} />
      </div>
    )
  }

  // Regular frame → click to create component
  if (!isInstance) {
    return (
      <button
        onClick={() => useFrameStore.getState().createComponent(frame.id)}
        className="c-slot"
        title="Create Component"
      >
        <Component size={12} />
      </button>
    )
  }

  // Instance → accent icon, popover with actions
  const menuItem = 'flex items-center gap-2 w-full px-3 py-1.5 text-[12px] fg-muted hover:bg-emphasis cursor-default first:rounded-t-lg last:rounded-b-lg'

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          className="c-slot is-active"
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
    <Section title="Properties">
      <div className="flex flex-col gap-2">
      {/* Badge + name + visibility + component action */}
      <div className="flex items-center gap-2">
        <span className={TYPE_BADGE_STYLES[key]}>
          {TYPE_BADGE_LABELS[key]}
        </span>
        <input
          type="text"
          value={isRoot ? 'Body' : frame.name}
          onChange={isRoot ? undefined : (e) => renameFrame(frame.id, e.target.value)}
          disabled={isRoot}
          className={`flex-1 c-input min-w-0${isRoot ? ' fg-muted' : ''}`}
        />
        <ComponentButton frame={frame} isRoot={isRoot} isMaster={isMaster} />
      </div>

      {/* Tag selector */}
      {!isRoot && tagOptions && (
        <div className="flex items-center gap-2">
          <Select
            value={currentTag}
            options={tagOptions}
            onChange={(v) => updateFrame(frame.id, { tag: v } as Partial<Frame>)}
            className="flex-1"
            inlineLabel={<Code size={12} />}
            initialValue={getTagDefault(frame.type)}
            tooltip="HTML Tag"
          />
          <div className="c-slot-spacer" />
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
                placeholder="Content"
                rows={Math.min(6, Math.max(3, (t.content.match(/\n/g) || []).length + 1))}
                className="flex-1 min-w-0 c-textarea resize-none"
              />
              <div className="c-slot-spacer" />
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
                  <div className="c-scale-input flex items-center pr-6 overflow-hidden relative">
                    <span className="w-4 shrink-0 flex items-center justify-center c-dimmed is-active">
                      <ImageIcon size={12} />
                    </span>
                    <span className="flex-1 min-w-[20px] text-[12px] fg-muted truncate select-none">
                      {getAssetDisplayName(img.src)}
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => updateFrame(frame.id, { src: '' })}
                      className="c-input-btn hover:!text-destructive"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  /* Editable input for URLs or empty state */
                  <div
                    className="c-scale-input flex items-center pr-6 overflow-hidden cursor-text relative"
                    onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}
                  >
                    <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${img.src ? 'is-active' : ''}`}>
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
                        className="c-input-btn hover:!text-destructive"
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
                        className="c-input-btn"
                      >
                        <Upload size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="c-slot-spacer" />
            </div>
            {/* Alt + Object fit — only when image is set */}
            {img.src && (
              <div className="flex items-center gap-2">
                <Select
                  value={img.objectFit}
                  options={[
                    { value: 'cover', label: 'Cover' },
                    { value: 'contain', label: 'Contain' },
                    { value: 'fill', label: 'Fill' },
                    { value: 'none', label: 'None' },
                  ]}
                  onChange={(v) => updateFrame(frame.id, { objectFit: v as ImageElement['objectFit'] })}
                  className="flex-1"
                  inlineLabel={<Scaling size={12} />}
                  initialValue="cover"
                  tooltip="Object Fit"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="c-scale-input flex items-center overflow-hidden cursor-text"
                    onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}
                  >
                    <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${img.alt ? 'is-active' : ''}`}><MessageSquareQuote size={12} /></span>
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => updateFrame(frame.id, { alt: e.target.value })}
                      placeholder=""
                      className="flex-1 min-w-[20px] text-[12px] fg-default"
                    />
                  </div>
                </div>
                <div className="c-slot-spacer" />
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
            <div className="flex items-start gap-2">
              <textarea
                value={btn.content}
                onChange={(e) => updateFrame(frame.id, { content: e.target.value })}
                placeholder="Content"
                rows={Math.min(6, Math.max(3, (btn.content.match(/\n/g) || []).length + 1))}
                className="flex-1 min-w-0 c-textarea resize-none"
              />
              <div className="c-slot-spacer" />
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
              <Select
                value={it}
                options={INPUT_TYPE_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { inputType: v as InputElement['inputType'] })}
                className="flex-1"
                inlineLabel={<Code size={12} />}
                initialValue="text"
                tooltip="Input Type"
              />
              <div className="c-slot-spacer" />
            </div>
            {TEXT_LIKE.has(it) && (
              <div className="flex items-center gap-2">
                <LabelInput icon={<TextCursorInput size={12} />} value={inp.placeholder} onChange={(v) => updateFrame(frame.id, { placeholder: v })} />
                <div className="c-slot-spacer" />
              </div>
            )}
            {it === 'radio' && (
              <div className="flex items-center gap-2">
                <LabelInput label="Name" value={inp.inputName} onChange={(v) => updateFrame(frame.id, { inputName: v })} />
                <LabelInput label="Value" value={inp.inputValue} onChange={(v) => updateFrame(frame.id, { inputValue: v })} />
                <div className="c-slot-spacer" />
              </div>
            )}
            {(it === 'range' || it === 'number') && (
              <div className="flex items-center gap-2">
                <LabelInput label="Min" type="number" value={inp.min} onChange={(v) => updateFrame(frame.id, { min: Number(v) })} />
                <LabelInput label="Max" type="number" value={inp.max} onChange={(v) => updateFrame(frame.id, { max: Number(v) })} />
                <LabelInput label="Step" type="number" value={inp.step} onChange={(v) => updateFrame(frame.id, { step: Number(v) })} />
                <div className="c-slot-spacer" />
              </div>
            )}
            {it === 'range' && (
              <div className="flex items-center gap-2">
                <LabelInput label="Default" type="number" value={inp.defaultValue} onChange={(v) => updateFrame(frame.id, { defaultValue: Number(v) })} />
                <div className="c-slot-spacer" />
              </div>
            )}
            <div className="flex items-center gap-2">
              {(it === 'checkbox' || it === 'radio') && (
                <Checkbox checked={inp.checked} onChange={(v) => updateFrame(frame.id, { checked: v })} label="Checked" />
              )}
              <Checkbox checked={inp.disabled} onChange={(v) => updateFrame(frame.id, { disabled: v })} label="Disabled" />
              <div className="flex-1" />
              <div className="c-slot-spacer" />
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
              <LabelInput icon={<TextCursorInput size={12} />} value={ta.placeholder} onChange={(v) => updateFrame(frame.id, { placeholder: v })} />
              <LabelInput icon={<Rows3 size={12} />} type="number" value={ta.rows} onChange={(v) => updateFrame(frame.id, { rows: Math.max(1, Number(v)) })} className="w-20 shrink-0" />
              <div className="c-slot-spacer" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={ta.disabled} onChange={(v) => updateFrame(frame.id, { disabled: v })} label="Disabled" />
              <div className="flex-1" />
              <div className="c-slot-spacer" />
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
                <LabelInput icon={<CircleDot size={12} />} value={opt.value} onChange={(v) => updateOption(i, 'value', v)} />
                <LabelInput icon={<Pencil size={12} />} value={opt.label} onChange={(v) => updateOption(i, 'label', v)} />
                <button
                  className="c-slot hover:text-destructive hover:!bg-destructive/10"
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
              <button className="c-slot" onClick={addOption} title="Add option">
                <Plus size={12} />
              </button>
            </div>
          </>
        )
      })()}

      {/* Attributes */}
      {/* Attributes */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 c-scale-input flex items-center overflow-hidden cursor-text" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}>
          <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${frame.className ? 'is-active' : ''}`}><Braces size={12} /></span>
          <input
            type="text"
            value={frame.className}
            onChange={(e) => updateFrame(frame.id, { className: e.target.value })}
            placeholder="Class"
            className="flex-1 min-w-[20px] text-[12px] fg-default"
          />
        </div>
        <div className="flex-1 min-w-0 c-scale-input flex items-center overflow-hidden cursor-text" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}>
          <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${frame.htmlId ? 'is-active' : ''}`}><Hash size={12} /></span>
          <input
            type="text"
            value={frame.htmlId}
            onChange={(e) => updateFrame(frame.id, { htmlId: e.target.value })}
            placeholder="ID"
            className="flex-1 min-w-[20px] text-[12px] fg-default"
          />
        </div>
        <div className="c-slot-spacer" />
      </div>
      </div>
    </Section>
  )
}
