/**
 * Section reset — defines default values per section and dirty detection.
 * A single updateFrame call resets all properties → one Cmd+Z to undo.
 */
import type { Frame, TextStyles, Spacing, SizeValue, BorderRadius, DesignValue } from '../../types/frame'
import { dvNum, dvStr, zeroSpacing, zeroBorderRadius, defaultBorder, defaultTextStyles } from '../../store/frameFactories'

// --- Comparison helpers ---

function dvNumEq(dv: DesignValue<number> | undefined, defaultVal: number): boolean {
  if (!dv) return defaultVal === 0
  return dv.value === defaultVal
}

function dvStrEq(dv: DesignValue<string> | undefined, defaultVal: string): boolean {
  if (!dv) return defaultVal === ''
  return dv.value === defaultVal
}

function spacingIsZero(s: Spacing | undefined): boolean {
  if (!s) return true
  return dvNumEq(s.top, 0) && dvNumEq(s.right, 0) && dvNumEq(s.bottom, 0) && dvNumEq(s.left, 0)
}

function sizeIsDefault(sv: SizeValue | undefined): boolean {
  if (!sv) return true
  return sv.mode === 'default'
}

function borderRadiusIsZero(br: BorderRadius | undefined): boolean {
  if (!br) return true
  return dvNumEq(br.topLeft, 0) && dvNumEq(br.topRight, 0) && dvNumEq(br.bottomRight, 0) && dvNumEq(br.bottomLeft, 0)
}

// --- Section dirty detection ---

export function isTypographyDirty(frame: Frame): boolean {
  if (!('fontSize' in frame)) return false
  const f = frame as Frame & TextStyles
  return !dvNumEq(f.fontSize, 0) || !dvNumEq(f.fontWeight, 0) || !dvNumEq(f.lineHeight, 0)
    || f.textAlign !== 'left' || f.textAlignVertical !== 'start'
    || f.fontStyle !== 'normal' || f.textDecoration !== 'none'
    || !dvNumEq(f.letterSpacing, 0) || f.textTransform !== 'none'
    || f.whiteSpace !== 'normal' || f.fontFamily !== ''
    || !dvStrEq(f.color, '') || !dvNumEq(f.colorAlpha, 100)
}

export function isLayoutDirty(frame: Frame): boolean {
  if (frame.type === 'box') {
    const f = frame
    // Only check values that differ from createBox defaults
    if (f.display !== 'flex' || f.direction !== 'column' || f.justify !== 'start' || f.align !== 'stretch') return true
    if (!dvNumEq(f.gap, 0) || f.wrap !== false) return true
    if (!dvNumEq(f.gridCols, 0) || !dvNumEq(f.gridRows, 0)) return true
  }
  if (!spacingIsZero(frame.padding) || !spacingIsZero(frame.margin)) return true
  if (!sizeIsDefault(frame.width) || !sizeIsDefault(frame.height)) return true
  if (!dvNumEq(frame.minWidth, 0) || !dvNumEq(frame.maxWidth, 0)) return true
  if (!dvNumEq(frame.minHeight, 0) || !dvNumEq(frame.maxHeight, 0)) return true
  if (!dvNumEq(frame.grow, 0) || !dvNumEq(frame.shrink, 1)) return true
  if (frame.alignSelf !== 'auto') return true
  if (frame.overflow !== 'visible') return true
  if (frame.hidden) return true
  return false
}

export function isFillDirty(frame: Frame): boolean {
  const hasBg = !dvStrEq(frame.bg, '') || !dvNumEq(frame.bgAlpha, 100)
  const hasImage = frame.bgImage !== ''
  // bgSize/bgPosition/bgRepeat only matter when there's a bg color or image
  if (!hasBg && !hasImage) return false
  if (hasImage) {
    return true // bgImage set = always dirty (sub-fields are visible)
  }
  return hasBg
}

export function isAppearanceDirty(frame: Frame): boolean {
  return !dvNumEq(frame.opacity, 100)
    || frame.boxShadow !== 'none' || frame.cursor !== 'auto'
}

export function isBorderDirty(frame: Frame): boolean {
  // borderRadius is independent; border sub-fields (width/color) only matter when style !== 'none'
  if (!borderRadiusIsZero(frame.borderRadius)) return true
  return frame.border?.style !== 'none'
}

export function isEffectsDirty(frame: Frame): boolean {
  return !dvNumEq(frame.blur, 0) || !dvNumEq(frame.backdropBlur, 0)
}

export function isPositionDirty(frame: Frame): boolean {
  if (frame.position === 'static') return false // zIndex/inset have no CSS effect when static
  return true
}

export function isTransformDirty(frame: Frame): boolean {
  return !dvNumEq(frame.rotate, 0) || !dvNumEq(frame.scaleVal, 100)
    || !dvNumEq(frame.translateX, 0) || !dvNumEq(frame.translateY, 0)
    || !dvNumEq(frame.skewX, 0) || !dvNumEq(frame.skewY, 0)
    || frame.transformOrigin !== 'center'
}

export function isTransitionDirty(frame: Frame): boolean {
  if (frame.transition === 'none') return false // duration/ease have no effect without transition property
  return true
}

// --- Section reset values (passed to updateFrame) ---

export function typographyResetValues(): Partial<Frame> {
  return {
    ...defaultTextStyles(),
    color: dvStr(''),
    colorAlpha: dvNum(100),
  } as Partial<Frame>
}

export function layoutResetValues(frame: Frame): Partial<Frame> {
  const base: Partial<Frame> = {
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    grow: dvNum(0),
    shrink: dvNum(1),
    alignSelf: 'auto',
    overflow: 'visible',
    hidden: false,
  }
  if (frame.type === 'box') {
    return {
      ...base,
      display: 'flex',
      direction: 'column',
      justify: 'start',
      align: 'stretch',
      gap: dvNum(0),
      wrap: false,
      gridCols: dvNum(0),
      gridRows: dvNum(0),
    } as Partial<Frame>
  }
  return base
}

export function fillResetValues(): Partial<Frame> {
  return {
    bg: dvStr(''),
    bgAlpha: dvNum(100),
    bgImage: '',
    bgSize: 'auto',
    bgPosition: 'center',
    bgRepeat: 'repeat',
  }
}

export function appearanceResetValues(): Partial<Frame> {
  return {
    opacity: dvNum(100),
    boxShadow: 'none',
    cursor: 'auto',
  }
}

export function borderResetValues(): Partial<Frame> {
  return {
    border: defaultBorder(),
    borderRadius: zeroBorderRadius(),
  }
}

export function effectsResetValues(): Partial<Frame> {
  return {
    blur: dvNum(0),
    backdropBlur: dvNum(0),
  }
}

export function positionResetValues(): Partial<Frame> {
  return {
    position: 'static',
    zIndex: dvNum(0),
    inset: zeroSpacing(),
  }
}

export function transformResetValues(): Partial<Frame> {
  return {
    rotate: dvNum(0),
    scaleVal: dvNum(100),
    translateX: dvNum(0),
    translateY: dvNum(0),
    skewX: dvNum(0),
    skewY: dvNum(0),
    transformOrigin: 'center',
  }
}

export function transitionResetValues(): Partial<Frame> {
  return {
    transition: 'none',
    duration: dvNum(0),
    ease: 'linear',
  }
}
