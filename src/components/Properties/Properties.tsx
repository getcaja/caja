import { useFrameStore } from '../../store/frameStore'
import type { Frame, BoxElement, TextElement, ImageElement, ButtonElement, InputElement, Spacing, SizeValue } from '../../types/frame'
import { HexColorPicker } from 'react-colorful'
import { useState, useEffect, useRef } from 'react'
import { Scan, X, AlignLeft, AlignCenter, AlignRight, Copy, Check } from 'lucide-react'
import { frameToClasses } from '../../utils/frameToClasses'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { Popover } from '../ui/Popover'

// --- Shared label style ---
const LABEL = 'text-text-muted text-[12px] w-14 shrink-0'
const LABEL_COMPACT = 'text-text-muted text-[12px] w-5 shrink-0'

// --- Primitives ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/60 pb-3 mb-3">
      <div className="mb-2">
        <span className="text-text-muted text-[12px] font-semibold">{title}</span>
      </div>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  label,
  compact,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
  compact?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value))
      return
    }
    const clamped = max !== undefined ? Math.min(max, Math.max(min, n)) : Math.max(min, n)
    onChange(clamped)
    setDraft(String(clamped))
  }

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className={compact ? LABEL_COMPACT : LABEL}>{label}</span>}
      <input
        type="text"
        inputMode="numeric"
        value={focused ? draft : String(value)}
        onFocus={() => { setFocused(true); setDraft(String(value)) }}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'ArrowUp') { e.preventDefault(); const v = Math.max(min, value + 1); onChange(v); setDraft(String(v)) }
          if (e.key === 'ArrowDown') { e.preventDefault(); const v = Math.max(min, value - 1); onChange(v); setDraft(String(v)) }
        }}
        className="w-full bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
      />
      {!compact && <div className="w-5 shrink-0" />}
    </div>
  )
}

function InlineSizeControl({
  value,
  onChange,
  label,
}: {
  value: SizeValue
  onChange: (v: Partial<SizeValue>) => void
  label: string
}) {
  const [draft, setDraft] = useState(String(value.value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value.value))
  }, [value.value, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value.value))
      return
    }
    const clamped = Math.max(0, n)
    onChange({ value: clamped })
    setDraft(String(clamped))
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={LABEL}>{label}</span>
      <ToggleGroup
        value={value.mode}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'hug', label: 'Hug' },
          { value: 'fill', label: 'Fill' },
          { value: 'fixed', label: 'Fixed' },
        ]}
        onChange={(mode) => onChange({ mode: mode as SizeValue['mode'] })}
        className="flex-1"
      />
      {value.mode === 'fixed' && (
        <input
          type="text"
          inputMode="numeric"
          value={focused ? draft : String(value.value)}
          onFocus={() => { setFocused(true); setDraft(String(value.value)) }}
          onBlur={commit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'ArrowUp') { e.preventDefault(); const v = value.value + 1; onChange({ value: v }); setDraft(String(v)) }
            if (e.key === 'ArrowDown') { e.preventDefault(); const v = Math.max(0, value.value - 1); onChange({ value: v }); setDraft(String(v)) }
          }}
          className="w-14 bg-surface-0 border border-border/60 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
        />
      )}
    </div>
  )
}

function SpacingControl({
  value,
  onChange,
  label,
}: {
  value: Spacing
  onChange: (v: Partial<Spacing>) => void
  label: string
}) {
  const isUniform = value.top === value.right && value.right === value.bottom && value.bottom === value.left
  const [uniform, setUniform] = useState(isUniform)

  const [draft, setDraft] = useState(String(value.top))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value.top))
  }, [value.top, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value.top))
      return
    }
    const clamped = Math.max(0, n)
    onChange({ top: clamped, right: clamped, bottom: clamped, left: clamped })
    setDraft(String(clamped))
  }

  if (uniform) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={LABEL}>{label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={focused ? draft : String(value.top)}
          onFocus={() => { setFocused(true); setDraft(String(value.top)) }}
          onBlur={commit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const v = value.top + 1
              onChange({ top: v, right: v, bottom: v, left: v })
              setDraft(String(v))
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              const v = Math.max(0, value.top - 1)
              onChange({ top: v, right: v, bottom: v, left: v })
              setDraft(String(v))
            }
          }}
          className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
        />
        <button
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all shrink-0"
          onClick={() => setUniform(false)}
          title="Per side"
        >
          <Scan size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-[12px]">{label}</span>
        <button
          className="text-[12px] text-text-muted hover:text-accent transition-colors"
          onClick={() => {
            setUniform(true)
            onChange({ top: value.top, right: value.top, bottom: value.top, left: value.top })
          }}
        >
          Uniform
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput value={value.top} onChange={(v) => onChange({ top: v })} min={0} label="T" compact />
        <NumberInput value={value.right} onChange={(v) => onChange({ right: v })} min={0} label="R" compact />
        <NumberInput value={value.bottom} onChange={(v) => onChange({ bottom: v })} min={0} label="B" compact />
        <NumberInput value={value.left} onChange={(v) => onChange({ left: v })} min={0} label="L" compact />
      </div>
    </div>
  )
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div>
      <div className="flex gap-1.5 items-center">
        <div className="w-14 shrink-0 flex items-center gap-1.5">
          <span className="text-text-muted text-[12px]">{label}</span>
          <Popover
            open={showPicker}
            onOpenChange={setShowPicker}
            trigger={
              <button
                className="w-4 h-4 rounded border border-border/60 shrink-0 transition-all hover:border-border-accent"
                style={{ backgroundColor: value || 'transparent' }}
              />
            }
          >
            <div className="p-2 rounded-lg overflow-hidden">
              <HexColorPicker
                color={value || '#000000'}
                onChange={onChange}
                style={{ width: 200, height: 140 }}
              />
            </div>
          </Popover>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000"
          className="flex-1 bg-surface-0 border border-border/60 rounded-md px-1.5 py-1 text-[12px] text-text-primary font-mono outline-none focus:border-accent transition-colors"
        />
        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
          {value && (
            <button
              className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-destructive rounded hover:bg-destructive/10 transition-all"
              onClick={() => onChange('')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Layout section (Box only) ---

function LayoutSection({ frame }: { frame: BoxElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  const isRow = frame.direction === 'row'
  const isSpaceBetween = frame.justify === 'between' || frame.justify === 'around'
  const justifyValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end']
  const alignValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end']
  const currentJ = isSpaceBetween ? 'center' : (frame.justify as 'start' | 'center' | 'end')
  const currentA = frame.align === 'stretch' ? 'start' : (frame.align as 'start' | 'center' | 'end')

  return (
    <Section title="Layout">
      <div className="flex flex-col gap-2.5">
        <ToggleGroup
          value={frame.direction}
          options={[
            { value: 'row', label: 'Horizontal' },
            { value: 'column', label: 'Vertical' },
          ]}
          onChange={(v) => updateFrame(frame.id, { direction: v })}
        />

        <div className="flex items-start gap-3">
          <div
            className="grid gap-[3px] bg-surface-0 rounded-md p-1.5 shrink-0"
            style={{
              gridTemplateColumns: 'repeat(3, 14px)',
              gridTemplateRows: 'repeat(3, 14px)',
            }}
          >
            {(isRow ? alignValues : justifyValues).map((rowVal, ri) =>
              (isRow ? justifyValues : alignValues).map((colVal, ci) => {
                const j = isRow ? colVal : rowVal
                const a = isRow ? rowVal : colVal
                const isActive = !isSpaceBetween && currentJ === j && currentA === a
                return (
                  <button
                    key={`${ri}-${ci}`}
                    className={`w-[14px] h-[14px] rounded-sm transition-all ${
                      isActive ? 'bg-accent' : 'bg-surface-3 hover:bg-border-accent'
                    }`}
                    onClick={() => updateFrame(frame.id, { justify: j, align: a })}
                  />
                )
              })
            )}
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <ToggleGroup
              value={isSpaceBetween ? frame.justify : 'default'}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'between', label: 'Between' },
                { value: 'around', label: 'Around' },
              ]}
              onChange={(v) => {
                if (v === 'default') updateFrame(frame.id, { justify: currentJ })
                else updateFrame(frame.id, { justify: v as BoxElement['justify'] })
              }}
            />
            <button
              className={`px-2 py-1 text-[12px] rounded-md transition-all ${
                frame.align === 'stretch'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'bg-surface-0 text-text-muted hover:text-text-secondary'
              }`}
              onClick={() =>
                updateFrame(frame.id, { align: frame.align === 'stretch' ? 'start' : 'stretch' })
              }
            >
              Stretch
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <NumberInput value={frame.gap} onChange={(v) => updateFrame(frame.id, { gap: v })} min={0} label="Gap" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[12px]">Wrap</span>
            <Switch checked={frame.wrap} onCheckedChange={(v) => updateFrame(frame.id, { wrap: v })} />
          </div>
        </div>
      </div>
    </Section>
  )
}

// --- Content section (Text only) ---

const TEXT_TAG_OPTIONS = [
  { value: 'p', label: 'p — Paragraph' },
  { value: 'h1', label: 'h1 — Heading 1' },
  { value: 'h2', label: 'h2 — Heading 2' },
  { value: 'h3', label: 'h3 — Heading 3' },
  { value: 'h4', label: 'h4 — Heading 4' },
  { value: 'h5', label: 'h5 — Heading 5' },
  { value: 'h6', label: 'h6 — Heading 6' },
  { value: 'span', label: 'span — Inline' },
  { value: 'a', label: 'a — Link' },
]

const FONT_WEIGHT_OPTIONS = [
  { value: '100', label: '100 — Thin' },
  { value: '200', label: '200 — Extra Light' },
  { value: '300', label: '300 — Light' },
  { value: '400', label: '400 — Normal' },
  { value: '500', label: '500 — Medium' },
  { value: '600', label: '600 — Semi Bold' },
  { value: '700', label: '700 — Bold' },
  { value: '800', label: '800 — Extra Bold' },
  { value: '900', label: '900 — Black' },
]

function ContentSection({ frame }: { frame: TextElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Content">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Tag</span>
          <Select
            value={frame.tag || 'p'}
            options={TEXT_TAG_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { tag: v as TextElement['tag'] })}
            className="flex-1"
          />
        </div>

        {(frame.tag === 'a') && (
          <div className="flex items-center gap-1.5">
            <span className={LABEL}>Href</span>
            <input
              type="text"
              value={frame.href || ''}
              onChange={(e) => updateFrame(frame.id, { href: e.target.value })}
              placeholder="https://..."
              className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
            />
          </div>
        )}

        <textarea
          value={frame.content}
          onChange={(e) => updateFrame(frame.id, { content: e.target.value })}
          className="w-full h-14 bg-surface-0 border border-border/60 rounded-md px-2 py-1.5 text-[12px] text-text-primary outline-none focus:border-accent resize-none transition-colors"
          placeholder="Text content..."
        />

        <div className="flex gap-2">
          <NumberInput
            value={frame.fontSize}
            onChange={(v) => updateFrame(frame.id, { fontSize: v })}
            min={1}
            label="Font"
          />
          <NumberInput
            value={frame.lineHeight}
            onChange={(v) => updateFrame(frame.id, { lineHeight: v })}
            min={0.5}
            label="Leading"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Weight</span>
          <Select
            value={String(frame.fontWeight)}
            options={FONT_WEIGHT_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { fontWeight: Number(v) as TextElement['fontWeight'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Align</span>
          <ToggleGroup
            value={frame.textAlign}
            options={[
              { value: 'left', label: <AlignLeft size={12} /> },
              { value: 'center', label: <AlignCenter size={12} /> },
              { value: 'right', label: <AlignRight size={12} /> },
            ]}
            onChange={(v) => updateFrame(frame.id, { textAlign: v as TextElement['textAlign'] })}
          />
        </div>
      </div>
    </Section>
  )
}

// --- Image section (Image only) ---

function ImageSection({ frame }: { frame: ImageElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Image">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Src</span>
          <input
            type="text"
            value={frame.src}
            onChange={(e) => updateFrame(frame.id, { src: e.target.value })}
            placeholder="https://..."
            className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Alt</span>
          <input
            type="text"
            value={frame.alt}
            onChange={(e) => updateFrame(frame.id, { alt: e.target.value })}
            placeholder="Description..."
            className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Fit</span>
          <ToggleGroup
            value={frame.objectFit}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'fill', label: 'Fill' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => updateFrame(frame.id, { objectFit: v as ImageElement['objectFit'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}

// --- Button section (Button only) ---

function ButtonSection({ frame }: { frame: ButtonElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Button">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Label</span>
          <input
            type="text"
            value={frame.label}
            onChange={(e) => updateFrame(frame.id, { label: e.target.value })}
            placeholder="Button"
            className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Variant</span>
          <ToggleGroup
            value={frame.variant}
            options={[
              { value: 'filled', label: 'Filled' },
              { value: 'outline', label: 'Outline' },
              { value: 'ghost', label: 'Ghost' },
            ]}
            onChange={(v) => updateFrame(frame.id, { variant: v as ButtonElement['variant'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}

// --- Input section (Input only) ---

const INPUT_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'number', label: 'Number' },
]

function InputSection({ frame }: { frame: InputElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Input">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Placeholder</span>
          <input
            type="text"
            value={frame.placeholder}
            onChange={(e) => updateFrame(frame.id, { placeholder: e.target.value })}
            placeholder="Placeholder..."
            className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Type</span>
          <Select
            value={frame.inputType}
            options={INPUT_TYPE_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { inputType: v as InputElement['inputType'] })}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Disabled</span>
          <Switch
            checked={frame.disabled}
            onCheckedChange={(v) => updateFrame(frame.id, { disabled: v })}
          />
        </div>
      </div>
    </Section>
  )
}

// --- Size section (shared) ---

function SizeSection({ frame }: { frame: Frame }) {
  const updateSize = useFrameStore((s) => s.updateSize)

  return (
    <Section title="Size">
      <div className="flex flex-col gap-2">
        <InlineSizeControl
          value={frame.width}
          onChange={(v) => updateSize(frame.id, 'width', v)}
          label="Width"
        />
        <InlineSizeControl
          value={frame.height}
          onChange={(v) => updateSize(frame.id, 'height', v)}
          label="Height"
        />
      </div>
    </Section>
  )
}

// --- Spacing section (margin + padding only) ---

function SpacingSection({ frame }: { frame: Frame }) {
  const updateSpacing = useFrameStore((s) => s.updateSpacing)

  return (
    <Section title="Spacing">
      <div className="flex flex-col gap-2.5">
        <SpacingControl
          value={frame.margin}
          onChange={(v) => updateSpacing(frame.id, 'margin', v)}
          label="Margin"
        />
        <SpacingControl
          value={frame.padding}
          onChange={(v) => updateSpacing(frame.id, 'padding', v)}
          label="Padding"
        />
      </div>
    </Section>
  )
}

// --- Style section (border, background, clip, text color) ---

function StyleSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Style">
      <div className="flex flex-col gap-2.5">
        <ColorInput
          value={frame.bg}
          onChange={(v) => updateFrame(frame.id, { bg: v })}
          label="Fill"
        />

        {frame.type === 'text' && (
          <ColorInput
            value={frame.color}
            onChange={(v) => updateFrame(frame.id, { color: v })}
            label="Color"
          />
        )}

        <div className="flex flex-col gap-1.5">
          <ToggleGroup
            value={frame.border.style}
            options={[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            onChange={(style) =>
              updateFrame(frame.id, {
                border: { ...frame.border, style, width: style === 'none' ? 0 : Math.max(frame.border.width, 1) },
              })
            }
          />
          {frame.border.style !== 'none' && (
            <>
              <NumberInput
                value={frame.border.width}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, width: v } })}
                min={0}
                label="Width"
              />
              <ColorInput
                value={frame.border.color}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, color: v } })}
                label="Color"
              />
            </>
          )}
          <NumberInput
            value={frame.borderRadius}
            onChange={(v) => updateFrame(frame.id, { borderRadius: v })}
            min={0}
            label="Radius"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className={LABEL}>Clip</span>
          <Switch
            checked={frame.overflow === 'hidden'}
            onCheckedChange={(v) => updateFrame(frame.id, { overflow: v ? 'hidden' : 'visible' })}
          />
          <div className="flex-1" />
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </Section>
  )
}

// --- Advanced section with computed Tailwind classes ---

function ClassPill({
  label,
  computed,
  onRemove,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  label: string
  computed?: boolean
  onRemove?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragOver?: boolean
}) {
  return (
    <span
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono leading-none select-none ${
        computed
          ? 'bg-surface-2 text-text-muted'
          : 'bg-accent/15 text-accent'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragOver ? 'ring-1 ring-accent' : ''
      }`}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive text-current opacity-70 hover:opacity-100 transition-all"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

function AdvancedSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const computedClasses = frameToClasses(frame).split(' ').filter(Boolean)
  const manualClasses = frame.tailwindClasses.split(' ').filter(Boolean)
  const allText = [...computedClasses, ...manualClasses].join(' ')

  const copyAll = () => {
    navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const addClasses = (raw: string) => {
    const newCls = raw.split(/\s+/).filter(Boolean)
    if (newCls.length === 0) return
    const existing = new Set(manualClasses)
    const toAdd = newCls.filter((c) => !existing.has(c))
    if (toAdd.length === 0) return
    updateFrame(frame.id, { tailwindClasses: [...manualClasses, ...toAdd].join(' ') })
  }

  const removeClass = (cls: string) => {
    updateFrame(frame.id, { tailwindClasses: manualClasses.filter((c) => c !== cls).join(' ') })
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const arr = [...manualClasses]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    updateFrame(frame.id, { tailwindClasses: arr.join(' ') })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addClasses(draft)
      setDraft('')
    }
    if (e.key === 'Backspace' && draft === '' && manualClasses.length > 0) {
      removeClass(manualClasses[manualClasses.length - 1])
    }
  }

  return (
    <Section title="Classes">
      <div className="flex flex-col gap-2">
        <div
          className="bg-surface-0 border border-border/60 rounded-md px-1.5 py-1.5 flex flex-wrap gap-1 min-h-[32px] cursor-text"
          onClick={() => inputRef.current?.focus()}
          onDragOver={(e) => e.preventDefault()}
        >
          {computedClasses.map((cls, i) => (
            <ClassPill key={`c-${i}`} label={cls} computed />
          ))}
          {manualClasses.map((cls, i) => (
            <ClassPill
              key={`m-${i}-${cls}`}
              label={cls}
              onRemove={() => removeClass(cls)}
              draggable
              isDragOver={overIdx === i && dragIdx !== i}
              onDragStart={(e) => {
                setDragIdx(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOverIdx(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (dragIdx !== null) reorder(dragIdx, i)
                setDragIdx(null)
                setOverIdx(null)
              }}
            />
          ))}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (draft.trim()) { addClasses(draft); setDraft('') }
            }}
            placeholder={manualClasses.length === 0 && computedClasses.length === 0 ? 'Add classes...' : ''}
            className="flex-1 min-w-[60px] bg-transparent text-[11px] font-mono text-text-primary placeholder:text-text-muted outline-none py-0.5"
          />
        </div>

        {allText && (
          <button
            onClick={copyAll}
            className="self-start flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-text-muted hover:text-text-primary rounded hover:bg-surface-2 transition-all"
          >
            {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy all</>}
          </button>
        )}
      </div>
    </Section>
  )
}

// --- Main Properties panel ---

export function Properties() {
  const selectedId = useFrameStore((s) => s.selectedId)
  const root = useFrameStore((s) => s.root)
  const rootId = useFrameStore((s) => s.getRootId)()
  const renameFrame = useFrameStore((s) => s.renameFrame)

  function find(frame: Frame, id: string): Frame | null {
    if (frame.id === id) return frame
    if (frame.type === 'box') {
      for (const child of frame.children) {
        const f = find(child, id)
        if (f) return f
      }
    }
    return null
  }

  const selected = selectedId ? find(root, selectedId) : null

  if (!selected) {
    return (
      <div className="h-full bg-surface-1 p-4 flex items-center justify-center">
        <span className="text-text-muted text-[12px]">Select an element</span>
      </div>
    )
  }

  const isRoot = selected.id === rootId

  return (
    <div key={selected.id} className="h-full bg-surface-1 p-3 overflow-y-auto">
      {/* Name */}
      <div className="border-b border-border/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[12px] px-1.5 py-0.5 rounded-md font-medium ${
            isRoot
              ? 'bg-blue-900/30 text-blue-400'
              : selected.type === 'text' ? 'bg-emerald-900/30 text-emerald-400'
              : selected.type === 'image' ? 'bg-violet-900/30 text-violet-400'
              : selected.type === 'button' ? 'bg-amber-900/30 text-amber-400'
              : selected.type === 'input' ? 'bg-sky-900/30 text-sky-400'
              : 'bg-accent/15 text-accent'
          }`}>
            {isRoot ? 'Body'
              : selected.type === 'text' ? 'Text'
              : selected.type === 'image' ? 'Image'
              : selected.type === 'button' ? 'Button'
              : selected.type === 'input' ? 'Input'
              : 'Frame'}
          </span>
          {!isRoot && (
            <input
              type="text"
              value={selected.name}
              onChange={(e) => renameFrame(selected.id, e.target.value)}
              className="flex-1 bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors min-w-0"
            />
          )}
        </div>
      </div>

      {selected.type === 'box' && <LayoutSection frame={selected} />}
      {selected.type === 'text' && <ContentSection frame={selected} />}
      {selected.type === 'image' && <ImageSection frame={selected} />}
      {selected.type === 'button' && <ButtonSection frame={selected} />}
      {selected.type === 'input' && <InputSection frame={selected} />}
      <SizeSection frame={selected} />
      <SpacingSection frame={selected} />
      <StyleSection frame={selected} />
      <AdvancedSection frame={selected} />
    </div>
  )
}
