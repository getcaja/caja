/**
 * Test helpers — factory functions for Frame objects.
 * Mirrors the store's create functions but without store dependency.
 */
import type {
  Frame, BoxElement, TextElement, ImageElement, ButtonElement,
  InputElement, TextareaElement, SelectElement, TextStyles,
  Spacing, Inset, SizeValue, BorderRadius, Border, DesignValue,
} from '../../types/frame'

// --- DesignValue helpers ---

export function dvNum(v: number): DesignValue<number> {
  return { mode: 'custom', value: v }
}

export function dvStr(v: string): DesignValue<string> {
  return { mode: 'custom', value: v }
}

export function dvToken(token: string, value: number): DesignValue<number> {
  return { mode: 'token', token, value }
}

export function dvColorToken(token: string, value = '#000000'): DesignValue<string> {
  return { mode: 'token', token, value }
}

export function zeroSpacing(): Spacing {
  return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0) }
}

export function zeroInset(): Inset {
  return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0) }
}

export function zeroBorderRadius(): BorderRadius {
  return { topLeft: dvNum(0), topRight: dvNum(0), bottomRight: dvNum(0), bottomLeft: dvNum(0) }
}

export const defaultBorder: Border = { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0), color: dvStr(''), style: 'none' }

function defaultSize(): SizeValue {
  return { mode: 'default', value: dvNum(0) }
}

function newFeatureDefaults() {
  return {
    position: 'static' as const,
    zIndex: dvNum(0),
    inset: zeroInset(),
    bgImage: '',
    bgSize: 'auto' as const,
    bgPosition: 'center' as const,
    bgRepeat: 'repeat' as const,
    blur: dvNum(0),
    backdropBlur: dvNum(0),
    rotate: dvNum(0),
    scaleVal: dvNum(100),
    translateX: dvNum(0),
    translateY: dvNum(0),
    transition: 'none' as const,
    duration: dvNum(0),
    ease: 'linear' as const,
    colSpan: dvNum(0),
    rowSpan: dvNum(0),
    skewX: dvNum(0),
    skewY: dvNum(0),
    transformOrigin: 'center',
  }
}

function defaultTextStyles(): TextStyles {
  return {
    fontSize: dvNum(0),
    fontWeight: dvNum(400),
    lineHeight: dvNum(0),
    textAlign: 'left',
    fontStyle: 'normal',
    textDecoration: 'none',
    letterSpacing: dvNum(0),
    textTransform: 'none',
    whiteSpace: 'normal',
    fontFamily: '',
  }
}

const baseDefaults = {
  hidden: false,
  className: '',
  htmlId: '',
  width: defaultSize(),
  height: defaultSize(),
  grow: dvNum(0),
  shrink: dvNum(1),
  padding: zeroSpacing(),
  margin: zeroSpacing(),
  minWidth: dvNum(0),
  maxWidth: dvNum(0),
  minHeight: dvNum(0),
  maxHeight: dvNum(0),
  alignSelf: 'auto' as const,
  color: dvStr(''),
  bg: dvStr(''),
  border: { ...defaultBorder },
  borderRadius: zeroBorderRadius(),
  overflow: 'visible' as const,
  opacity: dvNum(100),
  boxShadow: 'none' as const,
  cursor: 'auto' as const,
  tailwindClasses: '',
  ...newFeatureDefaults(),
}

/** Create a box element with sensible defaults */
export function makeBox(overrides: Partial<BoxElement> = {}): BoxElement {
  return {
    id: overrides.id || 'test-box',
    type: 'box',
    name: overrides.name || 'Box',
    ...baseDefaults,
    ...defaultTextStyles(),
    tag: 'div',
    display: 'flex',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: dvNum(0),
    wrap: false,
    gridCols: dvNum(0),
    gridRows: dvNum(0),
    children: [],
    ...overrides,
  } as BoxElement
}

/** Create a text element with sensible defaults */
export function makeText(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: overrides.id || 'test-text',
    type: 'text',
    name: overrides.name || 'Text',
    ...baseDefaults,
    ...defaultTextStyles(),
    content: 'Hello',
    tag: 'p',
    href: '',
    ...overrides,
  } as TextElement
}

/** Create an image element with sensible defaults */
export function makeImage(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: overrides.id || 'test-image',
    type: 'image',
    name: overrides.name || 'Image',
    ...baseDefaults,
    src: '',
    alt: '',
    objectFit: 'cover',
    ...overrides,
  } as ImageElement
}

/** Create a button element with sensible defaults */
export function makeButton(overrides: Partial<ButtonElement> = {}): ButtonElement {
  return {
    id: overrides.id || 'test-button',
    type: 'button',
    name: overrides.name || 'Button',
    ...baseDefaults,
    ...defaultTextStyles(),
    content: 'Click me',
    ...overrides,
  } as ButtonElement
}

/** Create an input element with sensible defaults */
export function makeInput(overrides: Partial<InputElement> = {}): InputElement {
  return {
    id: overrides.id || 'test-input',
    type: 'input',
    name: overrides.name || 'Input',
    ...baseDefaults,
    ...defaultTextStyles(),
    placeholder: '',
    inputType: 'text',
    disabled: false,
    checked: false,
    inputName: '',
    inputValue: '',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    ...overrides,
  } as InputElement
}

/** Create a textarea element with sensible defaults */
export function makeTextarea(overrides: Partial<TextareaElement> = {}): TextareaElement {
  return {
    id: overrides.id || 'test-textarea',
    type: 'textarea',
    name: overrides.name || 'Textarea',
    ...baseDefaults,
    ...defaultTextStyles(),
    placeholder: '',
    rows: 3,
    disabled: false,
    ...overrides,
  } as TextareaElement
}

/** Create a select element with sensible defaults */
export function makeSelect(overrides: Partial<SelectElement> = {}): SelectElement {
  return {
    id: overrides.id || 'test-select',
    type: 'select',
    name: overrides.name || 'Select',
    ...baseDefaults,
    ...defaultTextStyles(),
    options: [{ value: 'a', label: 'Option A' }],
    disabled: false,
    ...overrides,
  } as SelectElement
}
