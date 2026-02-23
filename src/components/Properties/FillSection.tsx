import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { FillInput } from '../ui/FillInput'
import { Select } from '../ui/Select'
import { TokenInput } from '../ui/TokenInput'

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

export function FillSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Fill">
      <div className="flex flex-col gap-2.5">
        <FillInput
          color={frame.bg}
          opacity={frame.opacity}
          onColorChange={(v) => updateFrame(frame.id, { bg: v })}
          onOpacityChange={(v) => updateFrame(frame.id, { opacity: v })}
          label="Fill"
          colorClassPrefix="bg"
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="c-label">Bg Image</span>
            <input
              type="text"
              value={frame.bgImage}
              onChange={(e) => updateFrame(frame.id, { bgImage: e.target.value })}
              placeholder="URL..."
              className="flex-1 c-input"
            />
          </div>
          {frame.bgImage && (
            <>
              <TokenInput
                value={frame.bgSize}
                options={BG_SIZE_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { bgSize: v as Frame['bgSize'] })}
                label="Bg Size"
                classPrefix="bg"
                initialValue="auto"
              />
              <div className="flex items-center gap-1.5">
                <span className="c-label">Bg Pos</span>
                <Select
                  value={frame.bgPosition}
                  options={BG_POSITION_OPTIONS}
                  onChange={(v) => updateFrame(frame.id, { bgPosition: v as Frame['bgPosition'] })}
                  className="flex-1"
                />
              </div>
              <TokenInput
                value={frame.bgRepeat}
                options={BG_REPEAT_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { bgRepeat: v as Frame['bgRepeat'] })}
                label="Bg Repeat"
                classPrefix="bg"
                initialValue="repeat"
              />
            </>
          )}
        </div>
      </div>
    </Section>
  )
}
