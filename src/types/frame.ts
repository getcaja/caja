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

export type ElementType = 'box' | 'text' | 'image' | 'button' | 'input'

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

  // Visuals
  bg: string
  border: Border
  borderRadius: number
  overflow: 'visible' | 'hidden' | 'scroll'
  opacity: number // 0–100

  // Advanced
  tailwindClasses: string
}

export interface BoxElement extends BaseElement {
  type: 'box'

  // Layout (box is a flex container)
  direction: 'row' | 'column'
  justify: 'start' | 'center' | 'end' | 'between' | 'around'
  align: 'start' | 'center' | 'end' | 'stretch'
  gap: number
  wrap: boolean

  // Structure
  children: Frame[]
}

export type TextTag = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'a'

export interface TextElement extends BaseElement {
  type: 'text'

  // Text content
  content: string
  fontSize: number
  fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  lineHeight: number // multiplier, e.g. 1.5
  color: string
  textAlign: 'left' | 'center' | 'right'

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

// Union type
export type Frame = BoxElement | TextElement | ImageElement | ButtonElement | InputElement
