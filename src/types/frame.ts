// Design token system — a value can be a raw custom value or a reference to a named token
export type DesignValue<T> =
  | { mode: 'custom'; value: T }
  | { mode: 'token'; token: string; value: T }

export interface SizeValue {
  mode: 'default' | 'hug' | 'fill' | 'fixed'
  value: DesignValue<number> // only used when mode is 'fixed', in px
}

export interface Spacing {
  top: DesignValue<number>
  right: DesignValue<number>
  bottom: DesignValue<number>
  left: DesignValue<number>
}

export interface Border {
  width: DesignValue<number>
  color: DesignValue<string>
  style: 'none' | 'solid' | 'dashed' | 'dotted'
}

export interface BorderRadius {
  topLeft: DesignValue<number>
  topRight: DesignValue<number>
  bottomRight: DesignValue<number>
  bottomLeft: DesignValue<number>
}

export type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select'

// Shared properties for all elements
interface BaseElement {
  id: string
  type: ElementType
  name: string
  hidden: boolean

  // HTML export attributes
  className: string // user-defined CSS class(es) for export
  htmlId: string    // user-defined id attribute for export

  // Sizing
  width: SizeValue
  height: SizeValue
  grow: DesignValue<number>
  shrink: DesignValue<number>

  // Spacing
  padding: Spacing
  margin: Spacing

  // Size constraints
  minWidth: DesignValue<number>
  maxWidth: DesignValue<number>
  minHeight: DesignValue<number>
  maxHeight: DesignValue<number>

  // Flex child
  alignSelf: 'auto' | 'start' | 'center' | 'end' | 'stretch'

  // Visuals
  bg: DesignValue<string>
  border: Border
  borderRadius: BorderRadius
  overflow: 'visible' | 'hidden' | 'scroll'
  opacity: DesignValue<number> // 0–100
  boxShadow: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl'
  cursor: 'auto' | 'default' | 'pointer' | 'text' | 'not-allowed' | 'grab'

  // Advanced
  tailwindClasses: string
}

export type BoxTag = 'body' | 'div' | 'section' | 'nav' | 'header' | 'footer' | 'main' | 'article' | 'aside' | 'ul' | 'ol' | 'li' | 'form'

export type BoxDisplay = 'flex' | 'inline-flex' | 'block' | 'inline-block' | 'inline'

export interface BoxElement extends BaseElement {
  type: 'box'

  // Semantic tag
  tag: BoxTag

  // Display mode
  display: BoxDisplay

  // Layout (only applies when display is flex or inline-flex)
  direction: 'row' | 'column'
  justify: 'start' | 'center' | 'end' | 'between' | 'around'
  align: 'start' | 'center' | 'end' | 'stretch'
  gap: DesignValue<number>
  wrap: boolean

  // Structure
  children: Frame[]
}

// Shared text styling — used by text, button, input, textarea, select
export interface TextStyles {
  fontSize: DesignValue<number>
  fontWeight: DesignValue<number>
  lineHeight: DesignValue<number> // multiplier, e.g. 1.5
  color: DesignValue<string>
  textAlign: 'left' | 'center' | 'right'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  letterSpacing: DesignValue<number>
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  whiteSpace: 'normal' | 'nowrap' | 'pre-wrap'
  // [Experimental] Google Fonts — set via MCP, no UI yet
  fontFamily: string
}

export type TextTag = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'a' | 'label'

export interface TextElement extends BaseElement, TextStyles {
  type: 'text'

  content: string

  // Semantic tag
  tag: TextTag
  href: string // used when tag is 'a'
}

export interface ImageElement extends BaseElement {
  type: 'image'

  src: string // URL or data URI
  alt: string
  objectFit: 'cover' | 'contain' | 'fill' | 'none'
}

export interface ButtonElement extends BaseElement, TextStyles {
  type: 'button'

  content: string
}

export type InputType = 'text' | 'email' | 'password' | 'number'

export interface InputElement extends BaseElement, TextStyles {
  type: 'input'

  placeholder: string
  inputType: InputType
  disabled: boolean
}

export interface TextareaElement extends BaseElement, TextStyles {
  type: 'textarea'

  placeholder: string
  rows: number
  disabled: boolean
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectElement extends BaseElement, TextStyles {
  type: 'select'

  options: SelectOption[]
  disabled: boolean
}

// Union type
export type Frame = BoxElement | TextElement | ImageElement | ButtonElement | InputElement | TextareaElement | SelectElement
