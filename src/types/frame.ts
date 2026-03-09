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

// Same shape as Spacing — 'auto' represented as { mode: 'token', token: 'auto', value: 0 }
export type Inset = Spacing

export interface Border {
  top: DesignValue<number>     // border-t width
  right: DesignValue<number>   // border-r width
  bottom: DesignValue<number>  // border-b width
  left: DesignValue<number>    // border-l width
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

  // Position
  position: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
  zIndex: DesignValue<number>
  inset: Inset

  // Visuals
  bg: DesignValue<string>
  bgImage: string
  bgSize: 'auto' | 'cover' | 'contain'
  bgPosition: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  bgRepeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y'
  border: Border
  borderRadius: BorderRadius
  overflow: 'visible' | 'hidden' | 'scroll'
  opacity: DesignValue<number> // 0–100
  bgAlpha: DesignValue<number>    // 0–100 — per-color opacity for bg (Tailwind /N modifier)
  boxShadow: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl'
  cursor: 'auto' | 'default' | 'pointer' | 'text' | 'not-allowed' | 'grab'
  blur: DesignValue<number>
  backdropBlur: DesignValue<number>

  // Transforms
  rotate: DesignValue<number>      // degrees
  scaleVal: DesignValue<number>    // percentage (100 = normal)
  translateX: DesignValue<number>  // px
  translateY: DesignValue<number>  // px
  skewX: DesignValue<number>       // degrees
  skewY: DesignValue<number>       // degrees
  transformOrigin: string          // center, top, top-right, etc.

  // Transitions
  transition: 'none' | 'all' | 'colors' | 'opacity' | 'shadow' | 'transform'
  duration: DesignValue<number>  // ms
  ease: 'linear' | 'in' | 'out' | 'in-out'

  // Grid child
  colSpan: DesignValue<number>
  rowSpan: DesignValue<number>

  // Advanced
  tailwindClasses: string

  // Responsive overrides — sparse per-breakpoint property patches (desktop-first)
  responsive?: Partial<Record<'md' | 'sm', ResponsiveOverrides>>

  // Origin tracking — populated when inserting from a component source (passive, informational)
  _origin?: { libraryId?: string; componentId?: string }

  // Component system — when set, this frame is an instance of a master component
  _componentId?: string                                          // ID of the master frame in the Components page
  _overrides?: Record<string, Record<string, unknown>>           // keyed by child frame ID → partial props to override
}

export type BoxTag = 'body' | 'div' | 'section' | 'nav' | 'header' | 'footer' | 'main' | 'article' | 'aside' | 'ul' | 'ol' | 'li' | 'form'

export type BoxDisplay = 'flex' | 'inline-flex' | 'grid'

export interface BoxElement extends BaseElement {
  type: 'box'

  // Semantic tag
  tag: BoxTag

  // Display mode
  display: BoxDisplay

  // Layout (only applies when display is flex or inline-flex)
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justify: 'start' | 'center' | 'end' | 'between' | 'around'
  align: 'start' | 'center' | 'end' | 'stretch'
  gap: DesignValue<number>
  wrap: boolean

  // Grid (only applies when display is grid)
  gridCols: DesignValue<number>
  gridRows: DesignValue<number>

  // Structure
  children: Frame[]
}

// Shared text styling — used by text, button, input, textarea, select
export interface TextStyles {
  color: DesignValue<string>        // text color
  colorAlpha: DesignValue<number>   // 0–100 — per-color opacity for text color
  fontSize: DesignValue<number>
  fontWeight: DesignValue<number>
  lineHeight: DesignValue<number> // multiplier, e.g. 1.5
  textAlign: 'left' | 'center' | 'right'
  textAlignVertical: 'start' | 'center' | 'end'
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
  href: string // when set, renders as <a> instead of <button>
}

export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'date' | 'time' | 'checkbox' | 'radio' | 'range'

export interface InputElement extends BaseElement, TextStyles {
  type: 'input'

  placeholder: string
  inputType: InputType
  disabled: boolean

  // Checkbox/radio state
  checked: boolean

  // Radio: HTML name (groups radios) and value (distinguishes options)
  inputName: string
  inputValue: string

  // Range/number constraints
  min: number
  max: number
  step: number
  defaultValue: number
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

// Multi-page support
export interface Page {
  id: string
  name: string
  route: string
  root: BoxElement
  isComponentPage?: boolean  // hidden page that stores component masters
}

// Responsive breakpoints — desktop-first: base = desktop, md ≤768px, sm ≤640px
export type Breakpoint = 'base' | 'md' | 'sm'

// Sparse partial overrides — only properties that differ from base
export type ResponsiveOverrides = Partial<
  Pick<BaseElement,
    | 'width' | 'height' | 'padding' | 'margin'
    | 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'
    | 'grow' | 'shrink' | 'alignSelf'
    | 'bg' | 'opacity' | 'hidden'
  > &
  Pick<BoxElement,
    | 'display' | 'direction' | 'justify' | 'align' | 'gap' | 'wrap'
    | 'gridCols' | 'gridRows'
  > &
  Pick<TextStyles,
    | 'fontSize' | 'fontWeight' | 'lineHeight' | 'textAlign'
  >
>

// Union type
export type Frame = BoxElement | TextElement | ImageElement | ButtonElement | InputElement | TextareaElement | SelectElement
