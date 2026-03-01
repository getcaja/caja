import { useState } from 'react'
import { Ellipsis, Link2, Upload } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ColorInput } from '../ui/ColorInput'
import { TokenInput } from '../ui/TokenInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Popover } from '../ui/Popover'

const lbl = (text: string) => <span className="text-[12px]">{text}</span>

const BG_SIZE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
]

const BG_POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
]

const BG_REPEAT_OPTIONS = [
  { value: 'repeat', label: 'Repeat' },
  { value: 'no-repeat', label: 'No Repeat' },
  { value: 'repeat-x', label: 'Repeat X' },
  { value: 'repeat-y', label: 'Repeat Y' },
]

type FillMode = 'solid' | 'image'

export function FillSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const [mode, setMode] = useState<FillMode>(frame.bgImage ? 'image' : 'solid')

  const imagePropsActive = frame.bgSize !== 'auto'
    || frame.bgPosition !== 'center'
    || frame.bgRepeat !== 'repeat'

  return (
    <Section title="Fill">
      <div className="flex flex-col gap-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={mode}
            options={[
              { value: 'solid', label: 'Solid', tooltip: 'Solid Color' },
              { value: 'image', label: 'Image', tooltip: 'Background Image' },
            ]}
            onChange={(v) => {
              setMode(v as FillMode)
              if (v === 'solid') updateFrame(frame.id, { bgImage: '' })
            }}
            className="flex-1"
          />
          <div className="w-5 shrink-0" />
        </div>

        {/* Solid mode */}
        {mode === 'solid' && (
          <div className="flex items-center gap-2">
            <ColorInput
              value={frame.bg}
              onChange={(v) => updateFrame(frame.id, { bg: v })}
              label="Color"
              classPrefix="bg"
              tooltip="Background Color"
            />
            <div className="w-5 shrink-0" />
          </div>
        )}

        {/* Image mode */}
        {mode === 'image' && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div
                className="c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
                onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus() }}
              >
                <span className="w-4 shrink-0 flex items-center justify-center text-text-muted">
                  <Link2 size={12} />
                </span>
                <input
                  type="text"
                  value={frame.bgImage}
                  onChange={(e) => updateFrame(frame.id, { bgImage: e.target.value })}
                  placeholder="https://"
                  className="flex-1 min-w-[20px] text-[12px] text-text-primary"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2"
                >
                  <Upload size={12} />
                </button>
              </div>
            </div>
            <Popover
              trigger={
                <button
                  type="button"
                  title="Image Properties"
                  className={`w-5 h-5 shrink-0 flex items-center justify-center rounded ${
                    imagePropsActive
                      ? 'text-blue-400 bg-blue-400/10'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Ellipsis size={12} />
                </button>
              }
              align="end"
            >
              <div className="flex flex-col gap-2 p-2 w-[200px]">
                <TokenInput
                  value={frame.bgSize}
                  options={BG_SIZE_OPTIONS}
                  onChange={(v) => updateFrame(frame.id, { bgSize: v as Frame['bgSize'] })}
                  classPrefix="bg"
                  initialValue="auto"
                  inlineLabel={lbl('Sz')}
                  tooltip="Background Size"
                />
                <TokenInput
                  value={frame.bgPosition}
                  options={BG_POSITION_OPTIONS}
                  onChange={(v) => updateFrame(frame.id, { bgPosition: v as Frame['bgPosition'] })}
                  classPrefix="bg"
                  initialValue="center"
                  inlineLabel={lbl('Ps')}
                  tooltip="Background Position"
                />
                <TokenInput
                  value={frame.bgRepeat}
                  options={BG_REPEAT_OPTIONS}
                  onChange={(v) => updateFrame(frame.id, { bgRepeat: v as Frame['bgRepeat'] })}
                  classPrefix="bg"
                  initialValue="repeat"
                  inlineLabel={lbl('Rp')}
                  tooltip="Background Repeat"
                />
              </div>
            </Popover>
          </div>
        )}
      </div>
    </Section>
  )
}
