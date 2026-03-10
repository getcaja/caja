import { useState } from 'react'
import { ImageIcon, Upload, X, Contrast } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { importLocalAsset, isLocalAssetPath, getAssetDisplayName } from '../../lib/assetOps'
import { Section } from '../ui/Section'
import { ColorInput } from '../ui/ColorInput'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
import { ToggleGroup } from '../ui/ToggleGroup'
import { OPACITY_SCALE } from '../../data/scales'

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

export function FillSection({ frame, hasOverrides, onResetOverrides, onReset, overrideKeys }: { frame: Frame; hasOverrides?: boolean; onResetOverrides?: () => void; onReset?: () => void; overrideKeys?: Set<string> }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const filePath = useFrameStore((s) => s.filePath)
  const [mode, setMode] = useState<FillMode>(frame.bgImage ? 'image' : 'solid')
  const ov = (...keys: string[]) => keys.some(k => overrideKeys?.has(k)) ? ' c-overridden' : ''

  return (
    <Section title="Fill" hasOverrides={hasOverrides} onResetOverrides={onResetOverrides} onReset={onReset}>
      <div className="flex flex-col gap-2">
        {/* Element Opacity */}
        <div className={`flex items-center gap-2${ov('opacity')}`}>
          <TokenInput
            scale={OPACITY_SCALE}
            value={frame.opacity}
            onChange={(v) => updateFrame(frame.id, { opacity: v })}
            min={0}
            max={100}
            unit="%"
            classPrefix="opacity"
            defaultValue={100}
            placeholder="100"
            inlineLabel={<Contrast size={12} />}
            tooltip="Opacity"
          />
          <div className="c-slot-spacer" />
        </div>

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
          <div className="c-slot-spacer" />
        </div>

        {/* Solid mode */}
        {mode === 'solid' && (
          <div className={`flex items-center gap-2${ov('bg', 'bgAlpha')}`}>
            <ColorInput
              value={frame.bg}
              onChange={(v) => updateFrame(frame.id, { bg: v })}
              label="Color"
              classPrefix="bg"
              tooltip="Background Color"
              alpha={frame.bgAlpha}
              onAlphaChange={(v) => updateFrame(frame.id, { bgAlpha: v })}
            />
            <div className="c-slot-spacer" />
          </div>
        )}

        {/* Image mode */}
        {mode === 'image' && (
          <>
            <div className={`flex items-center gap-2${ov('bgImage')}`}>
              <div className="flex-1 min-w-0">
                {frame.bgImage && isLocalAssetPath(frame.bgImage) ? (
                  /* Read-only display for local assets — show filename only */
                  <div className="c-scale-input flex items-center pr-6 overflow-hidden relative">
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
                    <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${frame.bgImage ? 'is-active' : ''}`}>
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
                            if (result) updateFrame(frame.id, { bgImage: result.localPath })
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
            {frame.bgImage && (
              <>
                <div className="flex items-center gap-2">
                  <div className={`contents${ov('bgSize')}`}>
                    <Select
                      value={frame.bgSize}
                      options={BG_SIZE_OPTIONS}
                      onChange={(v) => updateFrame(frame.id, { bgSize: v as Frame['bgSize'] })}
                      className="flex-1"
                      inlineLabel={lbl('Sz')}
                      initialValue="auto"
                      tooltip="Background Size"
                    />
                  </div>
                  <div className={`contents${ov('bgPosition')}`}>
                    <Select
                      value={frame.bgPosition}
                      options={BG_POSITION_OPTIONS}
                      onChange={(v) => updateFrame(frame.id, { bgPosition: v as Frame['bgPosition'] })}
                      className="flex-1"
                      inlineLabel={lbl('Ps')}
                      initialValue="center"
                      tooltip="Background Position"
                    />
                  </div>
                  <div className="c-slot-spacer" />
                </div>
                <div className={`flex items-center gap-2${ov('bgRepeat')}`}>
                  <Select
                    value={frame.bgRepeat}
                    options={BG_REPEAT_OPTIONS}
                    onChange={(v) => updateFrame(frame.id, { bgRepeat: v as Frame['bgRepeat'] })}
                    className="flex-1"
                    inlineLabel={lbl('Rp')}
                    initialValue="repeat"
                    tooltip="Background Repeat"
                  />
                  <div className="c-slot-spacer" />
                </div>
              </>
            )}
          </>
        )}

      </div>
    </Section>
  )
}
