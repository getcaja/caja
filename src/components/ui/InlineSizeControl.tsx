import type { SizeValue, DesignValue } from '../../types/frame'
import { ToggleGroup } from './ToggleGroup'
import { TokenInput } from './TokenInput'
import { SPACING_SCALE } from '../../data/scales'

export function InlineSizeControl({
  value,
  onChange,
  label,
  classPrefix,
}: {
  value: SizeValue
  onChange: (v: Partial<SizeValue>) => void
  label: string
  classPrefix?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="c-label">{label}</span>
      <ToggleGroup
        value={value.mode}
        options={[
          { value: 'default', label: 'Auto' },
          { value: 'hug', label: 'Hug' },
          { value: 'fill', label: 'Fill' },
          { value: 'fixed', label: 'Fixed' },
        ]}
        onChange={(mode) => onChange({ mode: mode as SizeValue['mode'] })}
        className="flex-1"
      />
      {value.mode === 'fixed' && (
        <div className="w-20 min-w-0">
          <TokenInput
            scale={SPACING_SCALE}
            value={value.value}
            onChange={(v) => onChange({ value: v })}
            min={0}
            classPrefix={classPrefix}
          />
        </div>
      )}
    </div>
  )
}
