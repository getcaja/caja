export interface SizeValue {
  mode: 'default' | 'hug' | 'fill' | 'fixed'
  value: number // only used when mode is 'fixed', in px
}

export interface Spacing {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Border {
  width: number
  color: string
  style: 'none' | 'solid' | 'dashed' | 'dotted'
}

export interface BorderRadius {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select'

// Shared properties for all elements
interface BaseElement {
  id: string
  type: ElementType
  name: string

  // Sizing
  width: SizeValue
  height: SizeValue
  grow: number
  shrink: number

  // Spacing
  padding: Spacing
  margin: Spacing

  // Size constraints
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number

  // Flex child
  alignSelf: 'auto' | 'start' | 'center' | 'end' | 'stretch'

  // Visuals
  bg: string
  border: Border
  borderRadius: BorderRadius
  overflow: 'visible' | 'hidden' | 'scroll'
  opacity: number // 0–100
  boxShadow: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl'
  cursor: 'auto' | 'default' | 'pointer' | 'text' | 'not-allowed' | 'grab'

  // Advanced
  tailwindClasses: string
}

export type BoxTag = 'div' | 'section' | 'nav' | 'header' | 'footer' | 'main' | 'article' | 'aside' | 'ul' | 'ol' | 'li' | 'form'

export interface BoxElement extends BaseElement {
  type: 'box'

  // Semantic tag
  tag: BoxTag

  // Layout (box is a flex container)
  direction: 'row' | 'column'
  justify: 'start' | 'center' | 'end' | 'between' | 'around'
  align: 'start' | 'center' | 'end' | 'stretch'
  gap: number
  wrap: boolean

  // Structure
  children: Frame[]
}

export type TextTag = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'a' | 'label'

export interface TextElement extends BaseElement {
  type: 'text'

  // Text content
  content: string
  fontSize: number
  fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  lineHeight: number // multiplier, e.g. 1.5
  color: string
  textAlign: 'left' | 'center' | 'right'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  letterSpacing: number
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  whiteSpace: 'normal' | 'nowrap' | 'pre-wrap'

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

export type ButtonVariant = 'filled' | 'outline' | 'ghost'

export interface ButtonElement extends BaseElement {
  type: 'button'

  label: string
  variant: ButtonVariant
}

export type InputType = 'text' | 'email' | 'password' | 'number'

export interface InputElement extends BaseElement {
  type: 'input'

  placeholder: string
  inputType: InputType
  disabled: boolean
}

export interface TextareaElement extends BaseElement {
  type: 'textarea'

  placeholder: string
  rows: number
  disabled: boolean
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectElement extends BaseElement {
  type: 'select'

  options: SelectOption[]
  disabled: boolean
}

// Union type
export type Frame = BoxElement | TextElement | ImageElement | ButtonElement | InputElement | TextareaElement | SelectElement
