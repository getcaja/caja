import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { Select } from '../ui/Select'
import { TokenInput } from '../ui/TokenInput'
import { SPACING_SCALE, Z_INDEX_SCALE } from '../../data/scales'
import { PanelTop, PanelRight, PanelBottom, PanelLeft, Layers } from 'lucide-react'

const POSITION_OPTIONS = [
  { value: 'static', label: 'Static' },
  { value: 'relative', label: 'Relative' },
  { value: 'absolute', label: 'Absolute' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'sticky', label: 'Sticky' },
]

function AnchorBox({ frame }: { frame: Frame }) {
  const updateSpacing = useFrameStore((s) => s.updateSpacing)

  const topActive = frame.inset.top.value !== 0 || frame.inset.top.mode === 'token'
  const rightActive = frame.inset.right.value !== 0 || frame.inset.right.mode === 'token'
  const bottomActive = frame.inset.bottom.value !== 0 || frame.inset.bottom.mode === 'token'
  const leftActive = frame.inset.left.value !== 0 || frame.inset.left.mode === 'token'

  const toggleEdge = (edge: 'top' | 'right' | 'bottom' | 'left', active: boolean) => {
    updateSpacing(frame.id, 'inset', {
      [edge]: active
        ? { mode: 'custom', value: 0 }   // deactivate: reset to zero, no class
        : { mode: 'token', token: '0', value: 0 }, // activate: pin with top-0 / left-0 etc.
    })
  }

  const pinCls = (active: boolean) =>
    active
      ? 'bg-accent hover:bg-accent-hover cursor-pointer'
      : 'bg-emphasis hover:bg-text-muted cursor-pointer'

  return (
    <div className="rounded-lg bg-inset relative w-full h-full">
      {/* Inner rectangle */}
      <div className="absolute inset-[30%] rounded border border-surface-3/50" />
      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[9px] h-px bg-subtle" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[9px] bg-subtle" />

      {/* Top pin — vertical */}
      <button
        type="button"
        className={`absolute top-[3px] left-1/2 -translate-x-1/2 w-[3px] h-[12px] rounded-full ${pinCls(topActive)}`}
        onClick={() => toggleEdge('top', topActive)}
      />
      {/* Bottom pin — vertical */}
      <button
        type="button"
        className={`absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[3px] h-[12px] rounded-full ${pinCls(bottomActive)}`}
        onClick={() => toggleEdge('bottom', bottomActive)}
      />
      {/* Left pin — horizontal */}
      <button
        type="button"
        className={`absolute left-[3px] top-1/2 -translate-y-1/2 h-[3px] w-[12px] rounded-full ${pinCls(leftActive)}`}
        onClick={() => toggleEdge('left', leftActive)}
      />
      {/* Right pin — horizontal */}
      <button
        type="button"
        className={`absolute right-[3px] top-1/2 -translate-y-1/2 h-[3px] w-[12px] rounded-full ${pinCls(rightActive)}`}
        onClick={() => toggleEdge('right', rightActive)}
      />
    </div>
  )
}

export function PositionSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateSpacing = useFrameStore((s) => s.updateSpacing)
  const isPositioned = frame.position !== 'static' && frame.position !== 'relative'

  return (
    <Section title="Position" defaultCollapsed>
      <div className="flex flex-col gap-2">
        {/* Row: Select + action slot */}
        <div className="flex items-center gap-2">
          <Select
            value={frame.position}
            options={POSITION_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { position: v as Frame['position'] })}
            className="flex-1"
            tooltip="Position"
          />
          <div className="w-5 shrink-0" />
        </div>

        {isPositioned && (
          <>
            {/* Row: AnchorBox | Top+Bottom | Right+Left | action slot */}
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0 self-stretch">
                <AnchorBox frame={frame} />
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <TokenInput
                  scale={SPACING_SCALE}
                  value={frame.inset.top}
                  onChange={(v) => updateSpacing(frame.id, 'inset', { top: v })}
                  min={0}
                  classPrefix="top"
                  inlineLabel={<PanelTop size={12} />}
                  tooltip="Top"
                />
                <TokenInput
                  scale={SPACING_SCALE}
                  value={frame.inset.bottom}
                  onChange={(v) => updateSpacing(frame.id, 'inset', { bottom: v })}
                  min={0}
                  classPrefix="bottom"
                  inlineLabel={<PanelBottom size={12} />}
                  tooltip="Bottom"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <TokenInput
                  scale={SPACING_SCALE}
                  value={frame.inset.right}
                  onChange={(v) => updateSpacing(frame.id, 'inset', { right: v })}
                  min={0}
                  classPrefix="right"
                  inlineLabel={<PanelRight size={12} />}
                  tooltip="Right"
                />
                <TokenInput
                  scale={SPACING_SCALE}
                  value={frame.inset.left}
                  onChange={(v) => updateSpacing(frame.id, 'inset', { left: v })}
                  min={0}
                  classPrefix="left"
                  inlineLabel={<PanelLeft size={12} />}
                  tooltip="Left"
                />
              </div>
              <div className="w-5 shrink-0" />
            </div>

            <div className="flex items-center gap-2">
              <TokenInput
                scale={Z_INDEX_SCALE}
                value={frame.zIndex}
                onChange={(v) => updateFrame(frame.id, { zIndex: v })}
                min={0}
                inlineLabel={<Layers size={12} />}
                classPrefix="z"
                defaultValue={0}
                tooltip="Z-Index"
                autoOption={{
                  label: 'Auto',
                  active: frame.zIndex.mode === 'custom' && frame.zIndex.value === 0,
                  onToggle: () => updateFrame(frame.id, { zIndex: { mode: 'custom', value: 0 } }),
                }}
              />
              <div className="w-5 shrink-0" />
            </div>
          </>
        )}
      </div>
    </Section>
  )
}
