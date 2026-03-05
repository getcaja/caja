import { useState } from 'react'
import { ImageIcon, Upload, X } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { importLocalAsset, isLocalAssetPath, getAssetDisplayName } from '../../lib/assetOps'
import { Section } from '../ui/Section'
import { ColorInput } from '../ui/ColorInput'
import { Select } from '../ui/Select'
import { ToggleGroup } from '../ui/ToggleGroup'

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

export function FillSection({ frame, hasOverrides, onResetOverrides }: { frame: Frame; hasOverrides?: boolean; onResetOverrides?: () => void }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const filePath = useFrameStore((s) => s.filePath)
  const [mode, setMode] = useState<FillMode>(frame.bgImage ? 'image' : 'solid')

  return (
    <Section title="Fill" hasOverrides={hasOverrides} onResetOverrides={onResetOverrides}>
      <div className="flex flex-col gap-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={mode}
            options={[
              { value: 'solid', label: 'Solid', tooltip: 'Solid Color' },
              { value: 'image', label: 'Image', tooltip: 'Background Image' },
            ]}
            onChange={(v) => setMode(v as FillMode)}
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
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                {frame.bgImage && isLocalAssetPath(frame.bgImage) ? (
                  /* Read-only display for local assets — show filename only */
                  <div className="c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden relative">
                    <span className="w-4 shrink-0 flex items-center justify-center fg-muted">
                      <ImageIcon size={12} />
                    </span>
                    <span className="flex-1 min-w-[20px] text-[12px] fg-muted truncate select-none">
                      {getAssetDisplayName(frame.bgImage)}
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => updateFrame(frame.id, { bgImage: '' })}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-subtle hover:text-destructive hover:bg-inset"
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
                    <span className={`w-4 shrink-0 flex items-center justify-center ${frame.bgImage ? 'fg-muted' : 'fg-subtle'}`}>
                      <ImageIcon size={12} />
                    </span>
                    <input
                      type="text"
                      value={frame.bgImage}
                      onChange={(e) => updateFrame(frame.id, { bgImage: e.target.value })}
                      placeholder="None"
                      className="flex-1 min-w-[20px] text-[12px] fg-default"
                    />
                    {frame.bgImage ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => updateFrame(frame.id, { bgImage: '' })}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-subtle hover:text-destructive hover:bg-inset"
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
                            if (result) updateFrame(frame.id, { bgImage: result.localPath })
                          } catch (err) {
                            console.error('Import asset failed:', err)
                          }
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-subtle hover:fg-muted hover:bg-inset"
                      >
                        <Upload size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="w-5 shrink-0" />
            </div>
            {frame.bgImage && (
              <>
                <div className="flex items-center gap-2">
                  <Select
                    value={frame.bgSize}
                    options={BG_SIZE_OPTIONS}
                    onChange={(v) => updateFrame(frame.id, { bgSize: v as Frame['bgSize'] })}
                    className="flex-1"
                    inlineLabel={lbl('Sz')}
                    initialValue="auto"
                    tooltip="Background Size"
                  />
                  <Select
                    value={frame.bgPosition}
                    options={BG_POSITION_OPTIONS}
                    onChange={(v) => updateFrame(frame.id, { bgPosition: v as Frame['bgPosition'] })}
                    className="flex-1"
                    inlineLabel={lbl('Ps')}
                    initialValue="center"
                    tooltip="Background Position"
                  />
                  <div className="w-5 shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={frame.bgRepeat}
                    options={BG_REPEAT_OPTIONS}
                    onChange={(v) => updateFrame(frame.id, { bgRepeat: v as Frame['bgRepeat'] })}
                    className="flex-1"
                    inlineLabel={lbl('Rp')}
                    initialValue="repeat"
                    tooltip="Background Repeat"
                  />
                  <div className="w-5 shrink-0" />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Section>
  )
}
