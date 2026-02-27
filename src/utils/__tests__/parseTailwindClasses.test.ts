import { describe, it, expect } from 'vitest'
import { parseTailwindClasses } from '../parseTailwindClasses'

// Shorthand helpers for DesignValue assertions
const dvToken = (token: string, value: number) => ({ mode: 'token', token, value })
const dvCustom = (value: number) => ({ mode: 'custom', value })
const dvColorToken = (token: string, value: string) => ({ mode: 'token', token, value })
const dvColorCustom = (value: string) => ({ mode: 'custom', value })
const zero = dvCustom(0)

describe('parseTailwindClasses', () => {

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  describe('Layout', () => {
    it('flex → display flex, direction row', () => {
      const { properties: props, tailwindClasses } = parseTailwindClasses('flex')
      expect(props.display).toBe('flex')
      expect(props.direction).toBe('row')
      expect(tailwindClasses).toBe('')
    })

    it('inline-flex → display inline-flex, direction row', () => {
      const { properties: props } = parseTailwindClasses('inline-flex')
      expect(props.display).toBe('inline-flex')
      expect(props.direction).toBe('row')
    })

    it('grid → display grid', () => {
      const { properties: props } = parseTailwindClasses('grid')
      expect(props.display).toBe('grid')
    })

    it('block → display block', () => {
      const { properties: props } = parseTailwindClasses('block')
      expect(props.display).toBe('block')
    })

    it('inline-block → display inline-block', () => {
      const { properties: props } = parseTailwindClasses('inline-block')
      expect(props.display).toBe('inline-block')
    })

    it('inline → display inline', () => {
      const { properties: props } = parseTailwindClasses('inline')
      expect(props.display).toBe('inline')
    })

    it('flex-col → direction column', () => {
      const { properties: props } = parseTailwindClasses('flex-col')
      expect(props.direction).toBe('column')
    })

    it('flex-row → direction row', () => {
      const { properties: props } = parseTailwindClasses('flex-row')
      expect(props.direction).toBe('row')
    })

    it('flex-wrap → wrap true', () => {
      const { properties: props } = parseTailwindClasses('flex-wrap')
      expect(props.wrap).toBe(true)
    })

    it('flex-nowrap → wrap false', () => {
      const { properties: props } = parseTailwindClasses('flex-nowrap')
      expect(props.wrap).toBe(false)
    })

    it('justify-center items-end → justify center, align end', () => {
      const { properties: props } = parseTailwindClasses('justify-center items-end')
      expect(props.justify).toBe('center')
      expect(props.align).toBe('end')
    })

    it('gap-4 → gap token 4, value 16', () => {
      const { properties: props } = parseTailwindClasses('gap-4')
      expect(props.gap).toEqual(dvToken('4', 16))
    })
  })

  // ---------------------------------------------------------------------------
  // Spacing
  // ---------------------------------------------------------------------------

  describe('Spacing', () => {
    it('p-4 → padding all sides token 4 (value 16)', () => {
      const { properties: props } = parseTailwindClasses('p-4')
      expect(props.padding).toEqual({
        top: dvToken('4', 16),
        right: dvToken('4', 16),
        bottom: dvToken('4', 16),
        left: dvToken('4', 16),
      })
    })

    it('px-4 py-2 → padding x=token 4, y=token 2', () => {
      const { properties: props } = parseTailwindClasses('px-4 py-2')
      expect(props.padding).toEqual({
        top: dvToken('2', 8),
        right: dvToken('4', 16),
        bottom: dvToken('2', 8),
        left: dvToken('4', 16),
      })
    })

    it('pt-2 → padding top only, rest zero', () => {
      const { properties: props } = parseTailwindClasses('pt-2')
      expect(props.padding).toEqual({
        top: dvToken('2', 8),
        right: zero,
        bottom: zero,
        left: zero,
      })
    })

    it('pr-4 → padding right only', () => {
      const { properties: props } = parseTailwindClasses('pr-4')
      expect(props.padding).toEqual({
        top: zero,
        right: dvToken('4', 16),
        bottom: zero,
        left: zero,
      })
    })

    it('pb-8 → padding bottom only', () => {
      const { properties: props } = parseTailwindClasses('pb-8')
      expect(props.padding).toEqual({
        top: zero,
        right: zero,
        bottom: dvToken('8', 32),
        left: zero,
      })
    })

    it('pl-6 → padding left only', () => {
      const { properties: props } = parseTailwindClasses('pl-6')
      expect(props.padding).toEqual({
        top: zero,
        right: zero,
        bottom: zero,
        left: dvToken('6', 24),
      })
    })

    it('p-[32px] → padding all sides custom 32', () => {
      const { properties: props } = parseTailwindClasses('p-[32px]')
      expect(props.padding).toEqual({
        top: dvCustom(32),
        right: dvCustom(32),
        bottom: dvCustom(32),
        left: dvCustom(32),
      })
    })

    it('m-4 → margin all sides token 4 (value 16)', () => {
      const { properties: props } = parseTailwindClasses('m-4')
      expect(props.margin).toEqual({
        top: dvToken('4', 16),
        right: dvToken('4', 16),
        bottom: dvToken('4', 16),
        left: dvToken('4', 16),
      })
    })

    it('mx-auto → margin left/right auto token', () => {
      const { properties: props } = parseTailwindClasses('mx-auto')
      expect(props.margin).toEqual({
        top: zero,
        right: dvToken('auto', 0),
        bottom: zero,
        left: dvToken('auto', 0),
      })
    })

    it('my-2 → margin top/bottom token 2 (value 8)', () => {
      const { properties: props } = parseTailwindClasses('my-2')
      expect(props.margin).toEqual({
        top: dvToken('2', 8),
        right: zero,
        bottom: dvToken('2', 8),
        left: zero,
      })
    })

    it('mt-4 → margin top only', () => {
      const { properties: props } = parseTailwindClasses('mt-4')
      expect(props.margin).toEqual({
        top: dvToken('4', 16),
        right: zero,
        bottom: zero,
        left: zero,
      })
    })

    it('mr-2 → margin right only', () => {
      const { properties: props } = parseTailwindClasses('mr-2')
      expect(props.margin).toEqual({
        top: zero,
        right: dvToken('2', 8),
        bottom: zero,
        left: zero,
      })
    })

    it('mb-6 → margin bottom only', () => {
      const { properties: props } = parseTailwindClasses('mb-6')
      expect(props.margin).toEqual({
        top: zero,
        right: zero,
        bottom: dvToken('6', 24),
        left: zero,
      })
    })

    it('ml-8 → margin left only', () => {
      const { properties: props } = parseTailwindClasses('ml-8')
      expect(props.margin).toEqual({
        top: zero,
        right: zero,
        bottom: zero,
        left: dvToken('8', 32),
      })
    })

    it('m-[20px] → margin all sides custom 20', () => {
      const { properties: props } = parseTailwindClasses('m-[20px]')
      expect(props.margin).toEqual({
        top: dvCustom(20),
        right: dvCustom(20),
        bottom: dvCustom(20),
        left: dvCustom(20),
      })
    })

    it('mx-4 my-2 → margin symmetric x=16 y=8', () => {
      const { properties: props } = parseTailwindClasses('mx-4 my-2')
      expect(props.margin).toEqual({
        top: dvToken('2', 8),
        right: dvToken('4', 16),
        bottom: dvToken('2', 8),
        left: dvToken('4', 16),
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Sizing
  // ---------------------------------------------------------------------------

  describe('Sizing', () => {
    it('w-full → width fill mode', () => {
      const { properties: props } = parseTailwindClasses('w-full')
      expect((props.width as any).mode).toBe('fill')
    })

    it('w-fit → width hug mode', () => {
      const { properties: props } = parseTailwindClasses('w-fit')
      expect((props.width as any).mode).toBe('hug')
    })

    it('w-[500px] → width fixed, custom 500', () => {
      const { properties: props } = parseTailwindClasses('w-[500px]')
      expect(props.width).toEqual({ mode: 'fixed', value: dvCustom(500) })
    })

    it('h-full → height fill mode', () => {
      const { properties: props } = parseTailwindClasses('h-full')
      expect((props.height as any).mode).toBe('fill')
    })

    it('h-fit → height hug mode', () => {
      const { properties: props } = parseTailwindClasses('h-fit')
      expect((props.height as any).mode).toBe('hug')
    })

    it('h-[300px] → height fixed, custom 300', () => {
      const { properties: props } = parseTailwindClasses('h-[300px]')
      expect(props.height).toEqual({ mode: 'fixed', value: dvCustom(300) })
    })

    it('min-w-[200px] → minWidth custom 200', () => {
      const { properties: props } = parseTailwindClasses('min-w-[200px]')
      expect(props.minWidth).toEqual(dvCustom(200))
    })

    it('max-w-[800px] → maxWidth custom 800', () => {
      const { properties: props } = parseTailwindClasses('max-w-[800px]')
      expect(props.maxWidth).toEqual(dvCustom(800))
    })

    it('min-h-[100px] → minHeight custom 100', () => {
      const { properties: props } = parseTailwindClasses('min-h-[100px]')
      expect(props.minHeight).toEqual(dvCustom(100))
    })

    it('max-h-[600px] → maxHeight custom 600', () => {
      const { properties: props } = parseTailwindClasses('max-h-[600px]')
      expect(props.maxHeight).toEqual(dvCustom(600))
    })

    it('grow → grow token DEFAULT, value 1', () => {
      const { properties: props } = parseTailwindClasses('grow')
      expect(props.grow).toEqual(dvToken('DEFAULT', 1))
    })

    it('grow-0 → grow token 0, value 0', () => {
      const { properties: props } = parseTailwindClasses('grow-0')
      expect(props.grow).toEqual(dvToken('0', 0))
    })

    it('shrink → shrink token DEFAULT, value 1', () => {
      const { properties: props } = parseTailwindClasses('shrink')
      expect(props.shrink).toEqual(dvToken('DEFAULT', 1))
    })

    it('shrink-0 → shrink token 0, value 0', () => {
      const { properties: props } = parseTailwindClasses('shrink-0')
      expect(props.shrink).toEqual(dvToken('0', 0))
    })
  })

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------

  describe('Text', () => {
    it('text-sm → fontSize token sm (value 14) + default lineHeight normal', () => {
      const { properties: props } = parseTailwindClasses('text-sm')
      expect(props.fontSize).toEqual(dvToken('sm', 14))
      // sm default leading is 'normal' (value 1.5)
      expect(props.lineHeight).toEqual(dvToken('normal', 1.5))
    })

    it('text-[20px] → fontSize custom 20', () => {
      const { properties: props } = parseTailwindClasses('text-[20px]')
      expect(props.fontSize).toEqual(dvCustom(20))
    })

    it('font-bold → fontWeight token bold, value 700', () => {
      const { properties: props } = parseTailwindClasses('font-bold')
      expect(props.fontWeight).toEqual(dvToken('bold', 700))
    })

    it('font-[700] → fontWeight custom 700', () => {
      const { properties: props } = parseTailwindClasses('font-[700]')
      expect(props.fontWeight).toEqual(dvCustom(700))
    })

    it('leading-relaxed → lineHeight token relaxed (value 1.625)', () => {
      const { properties: props } = parseTailwindClasses('leading-relaxed')
      expect(props.lineHeight).toEqual(dvToken('relaxed', 1.625))
    })

    it('leading-[1.5] → lineHeight custom 1.5', () => {
      const { properties: props } = parseTailwindClasses('leading-[1.5]')
      expect(props.lineHeight).toEqual(dvCustom(1.5))
    })

    it('tracking-tight → letterSpacing token tight (value -0.4)', () => {
      const { properties: props } = parseTailwindClasses('tracking-tight')
      expect(props.letterSpacing).toEqual(dvToken('tight', -0.4))
    })

    it('text-left → textAlign left', () => {
      const { properties: props } = parseTailwindClasses('text-left')
      expect(props.textAlign).toBe('left')
    })

    it('text-center → textAlign center', () => {
      const { properties: props } = parseTailwindClasses('text-center')
      expect(props.textAlign).toBe('center')
    })

    it('text-right → textAlign right', () => {
      const { properties: props } = parseTailwindClasses('text-right')
      expect(props.textAlign).toBe('right')
    })

    it('italic → fontStyle italic', () => {
      const { properties: props } = parseTailwindClasses('italic')
      expect(props.fontStyle).toBe('italic')
    })

    it('underline → textDecoration underline', () => {
      const { properties: props } = parseTailwindClasses('underline')
      expect(props.textDecoration).toBe('underline')
    })

    it('uppercase → textTransform uppercase', () => {
      const { properties: props } = parseTailwindClasses('uppercase')
      expect(props.textTransform).toBe('uppercase')
    })

    it('whitespace-nowrap → whiteSpace nowrap', () => {
      const { properties: props } = parseTailwindClasses('whitespace-nowrap')
      expect(props.whiteSpace).toBe('nowrap')
    })
  })

  // ---------------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------------

  describe('Colors', () => {
    it('bg-red-500 → bg token red-500 (hex #ef4444)', () => {
      const { properties: props } = parseTailwindClasses('bg-red-500')
      expect(props.bg).toEqual(dvColorToken('red-500', '#ef4444'))
    })

    it('bg-[#fe0000] → bg custom #fe0000', () => {
      const { properties: props } = parseTailwindClasses('bg-[#fe0000]')
      expect(props.bg).toEqual(dvColorCustom('#fe0000'))
    })

    it('text-blue-300 → color token blue-300 (hex #93c5fd)', () => {
      const { properties: props } = parseTailwindClasses('text-blue-300')
      expect(props.color).toEqual(dvColorToken('blue-300', '#93c5fd'))
    })

    it('text-[rgb(0,0,0)] → color custom rgb(0,0,0)', () => {
      const { properties: props } = parseTailwindClasses('text-[rgb(0,0,0)]')
      expect(props.color).toEqual(dvColorCustom('rgb(0,0,0)'))
    })

    it('bg-white → bg token white (#ffffff)', () => {
      const { properties: props } = parseTailwindClasses('bg-white')
      expect(props.bg).toEqual(dvColorToken('white', '#ffffff'))
    })

    it('bg-black → bg token black (#000000)', () => {
      const { properties: props } = parseTailwindClasses('bg-black')
      expect(props.bg).toEqual(dvColorToken('black', '#000000'))
    })

    it('bg-transparent → unrecognized (passes through to tailwindClasses)', () => {
      // transparent is not in COLOR_TOKEN_MAP (SPECIAL_COLORS or COLOR_GRID)
      const { properties: props, tailwindClasses } = parseTailwindClasses('bg-transparent')
      expect(props.bg).toBeUndefined()
      expect(tailwindClasses).toBe('bg-transparent')
    })

    it('text-[#ff0000] → color custom #ff0000', () => {
      const { properties: props } = parseTailwindClasses('text-[#ff0000]')
      expect(props.color).toEqual(dvColorCustom('#ff0000'))
    })

    it('bg-[#3b82f6] → bg custom #3b82f6 (not auto-matched to token)', () => {
      // Arbitrary values stay as custom — no reverse color lookup in parseTailwindClasses
      const { properties: props } = parseTailwindClasses('bg-[#3b82f6]')
      expect(props.bg).toEqual(dvColorCustom('#3b82f6'))
    })

    it('border-red-500 → border color token red-500', () => {
      const { properties: props } = parseTailwindClasses('border-red-500')
      const border = props.border as any
      expect(border.color).toEqual(dvColorToken('red-500', '#ef4444'))
    })
  })

  // ---------------------------------------------------------------------------
  // Visual
  // ---------------------------------------------------------------------------

  describe('Visual', () => {
    it('rounded → borderRadius uniform token DEFAULT (value 4)', () => {
      const { properties: props } = parseTailwindClasses('rounded')
      expect(props.borderRadius).toEqual({
        topLeft: dvToken('DEFAULT', 4),
        topRight: dvToken('DEFAULT', 4),
        bottomRight: dvToken('DEFAULT', 4),
        bottomLeft: dvToken('DEFAULT', 4),
      })
    })

    it('rounded-lg → borderRadius uniform token lg (value 8)', () => {
      const { properties: props } = parseTailwindClasses('rounded-lg')
      expect(props.borderRadius).toEqual({
        topLeft: dvToken('lg', 8),
        topRight: dvToken('lg', 8),
        bottomRight: dvToken('lg', 8),
        bottomLeft: dvToken('lg', 8),
      })
    })

    it('rounded-[12px] → borderRadius custom 12', () => {
      const { properties: props } = parseTailwindClasses('rounded-[12px]')
      expect(props.borderRadius).toEqual({
        topLeft: dvCustom(12),
        topRight: dvCustom(12),
        bottomRight: dvCustom(12),
        bottomLeft: dvCustom(12),
      })
    })

    it('rounded-tl-lg → topLeft corner only, rest zero', () => {
      const { properties: props } = parseTailwindClasses('rounded-tl-lg')
      expect(props.borderRadius).toEqual({
        topLeft: dvToken('lg', 8),
        topRight: dvCustom(0),
        bottomRight: dvCustom(0),
        bottomLeft: dvCustom(0),
      })
    })

    it('border → border all sides 1px solid', () => {
      const { properties: props } = parseTailwindClasses('border')
      const border = props.border as any
      expect(border.top).toEqual(dvToken('', 1))
      expect(border.right).toEqual(dvToken('', 1))
      expect(border.bottom).toEqual(dvToken('', 1))
      expect(border.left).toEqual(dvToken('', 1))
      expect(border.style).toBe('solid')
    })

    it('border-2 → border all sides token 2 (value 2)', () => {
      const { properties: props } = parseTailwindClasses('border-2')
      const border = props.border as any
      expect(border.top).toEqual(dvToken('2', 2))
      expect(border.right).toEqual(dvToken('2', 2))
      expect(border.bottom).toEqual(dvToken('2', 2))
      expect(border.left).toEqual(dvToken('2', 2))
      expect(border.style).toBe('solid')
    })

    it('border-dashed → border style dashed, no widths set', () => {
      const { properties: props } = parseTailwindClasses('border-dashed')
      const border = props.border as any
      expect(border.style).toBe('dashed')
      // No widths provided — assembled to zero
      expect(border.top).toEqual(zero)
      expect(border.right).toEqual(zero)
      expect(border.bottom).toEqual(zero)
      expect(border.left).toEqual(zero)
    })

    it('overflow-hidden → overflow hidden', () => {
      const { properties: props } = parseTailwindClasses('overflow-hidden')
      expect(props.overflow).toBe('hidden')
    })

    it('opacity-50 → opacity token 50 (value 50)', () => {
      const { properties: props } = parseTailwindClasses('opacity-50')
      expect(props.opacity).toEqual(dvToken('50', 50))
    })

    it('shadow-lg → boxShadow lg', () => {
      const { properties: props } = parseTailwindClasses('shadow-lg')
      expect(props.boxShadow).toBe('lg')
    })
  })

  // ---------------------------------------------------------------------------
  // Position
  // ---------------------------------------------------------------------------

  describe('Position', () => {
    it('relative → position relative', () => {
      const { properties: props } = parseTailwindClasses('relative')
      expect(props.position).toBe('relative')
    })

    it('absolute → position absolute', () => {
      const { properties: props } = parseTailwindClasses('absolute')
      expect(props.position).toBe('absolute')
    })

    it('fixed → position fixed', () => {
      const { properties: props } = parseTailwindClasses('fixed')
      expect(props.position).toBe('fixed')
    })

    it('sticky → position sticky', () => {
      const { properties: props } = parseTailwindClasses('sticky')
      expect(props.position).toBe('sticky')
    })

    it('z-10 → zIndex token 10 (value 10)', () => {
      const { properties: props } = parseTailwindClasses('z-10')
      expect(props.zIndex).toEqual(dvToken('10', 10))
    })

    it('z-[50] → zIndex custom 50', () => {
      const { properties: props } = parseTailwindClasses('z-[50]')
      expect(props.zIndex).toEqual(dvCustom(50))
    })

    it('inset-0 → inset all sides token 0 (value 0)', () => {
      const { properties: props } = parseTailwindClasses('inset-0')
      expect(props.inset).toEqual({
        top: dvToken('0', 0),
        right: dvToken('0', 0),
        bottom: dvToken('0', 0),
        left: dvToken('0', 0),
      })
    })

    it('top-4 right-0 → inset top=token 4 (16), right=token 0, rest zero', () => {
      const { properties: props } = parseTailwindClasses('top-4 right-0')
      const inset = props.inset as any
      expect(inset.top).toEqual(dvToken('4', 16))
      expect(inset.right).toEqual(dvToken('0', 0))
      expect(inset.bottom).toEqual(zero)
      expect(inset.left).toEqual(zero)
    })
  })

  // ---------------------------------------------------------------------------
  // Transform
  // ---------------------------------------------------------------------------

  describe('Transform', () => {
    it('rotate-45 → rotate token 45 (value 45)', () => {
      const { properties: props } = parseTailwindClasses('rotate-45')
      expect(props.rotate).toEqual(dvToken('45', 45))
    })

    it('scale-150 → scaleVal token 150 (value 150)', () => {
      const { properties: props } = parseTailwindClasses('scale-150')
      expect(props.scaleVal).toEqual(dvToken('150', 150))
    })

    it('translate-x-4 → translateX token 4 (value 16)', () => {
      const { properties: props } = parseTailwindClasses('translate-x-4')
      expect(props.translateX).toEqual(dvToken('4', 16))
    })

    it('translate-y-[20px] → translateY custom 20', () => {
      const { properties: props } = parseTailwindClasses('translate-y-[20px]')
      expect(props.translateY).toEqual(dvCustom(20))
    })

    it('-rotate-90 → rotate token 90 with value negated to -90', () => {
      const { properties: props } = parseTailwindClasses('-rotate-90')
      expect(props.rotate).toEqual(dvToken('90', -90))
    })

    it('-translate-x-4 → translateX token 4 with value negated to -16', () => {
      const { properties: props } = parseTailwindClasses('-translate-x-4')
      expect(props.translateX).toEqual(dvToken('4', -16))
    })
  })

  // ---------------------------------------------------------------------------
  // Transition
  // ---------------------------------------------------------------------------

  describe('Transition', () => {
    it('transition → transition all', () => {
      const { properties: props } = parseTailwindClasses('transition')
      expect(props.transition).toBe('all')
    })

    it('transition-colors → transition colors', () => {
      const { properties: props } = parseTailwindClasses('transition-colors')
      expect(props.transition).toBe('colors')
    })

    it('duration-300 → duration token 300 (value 300)', () => {
      const { properties: props } = parseTailwindClasses('duration-300')
      expect(props.duration).toEqual(dvToken('300', 300))
    })

    it('ease-in-out → ease in-out', () => {
      const { properties: props } = parseTailwindClasses('ease-in-out')
      expect(props.ease).toBe('in-out')
    })
  })

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------

  describe('Filter', () => {
    it('blur → blur token DEFAULT (value 8)', () => {
      const { properties: props } = parseTailwindClasses('blur')
      expect(props.blur).toEqual(dvToken('DEFAULT', 8))
    })

    it('blur-sm → blur token sm (value 4)', () => {
      const { properties: props } = parseTailwindClasses('blur-sm')
      expect(props.blur).toEqual(dvToken('sm', 4))
    })

    it('blur-[10px] → blur custom 10', () => {
      const { properties: props } = parseTailwindClasses('blur-[10px]')
      expect(props.blur).toEqual(dvCustom(10))
    })

    it('backdrop-blur-md → backdropBlur token md (value 12)', () => {
      const { properties: props } = parseTailwindClasses('backdrop-blur-md')
      expect(props.backdropBlur).toEqual(dvToken('md', 12))
    })
  })

  // ---------------------------------------------------------------------------
  // Grid
  // ---------------------------------------------------------------------------

  describe('Grid', () => {
    it('grid-cols-3 → gridCols token 3 (value 3)', () => {
      const { properties: props } = parseTailwindClasses('grid-cols-3')
      expect(props.gridCols).toEqual(dvToken('3', 3))
    })

    it('grid-rows-2 → gridRows token 2 (value 2)', () => {
      const { properties: props } = parseTailwindClasses('grid-rows-2')
      expect(props.gridRows).toEqual(dvToken('2', 2))
    })

    it('col-span-2 → colSpan token 2 (value 2)', () => {
      const { properties: props } = parseTailwindClasses('col-span-2')
      expect(props.colSpan).toEqual(dvToken('2', 2))
    })

    it('row-span-3 → rowSpan token 3 (value 3)', () => {
      const { properties: props } = parseTailwindClasses('row-span-3')
      expect(props.rowSpan).toEqual(dvToken('3', 3))
    })

    it('col-span-full → colSpan token full (value 9999)', () => {
      const { properties: props } = parseTailwindClasses('col-span-full')
      expect(props.colSpan).toEqual(dvToken('full', 9999))
    })

    it('row-span-full → rowSpan token full (value 9999)', () => {
      const { properties: props } = parseTailwindClasses('row-span-full')
      expect(props.rowSpan).toEqual(dvToken('full', 9999))
    })
  })

  // ---------------------------------------------------------------------------
  // Misc / Edge Cases
  // ---------------------------------------------------------------------------

  describe('Misc / Edge Cases', () => {
    it('unknown class passes through to tailwindClasses', () => {
      const { properties: props, tailwindClasses } = parseTailwindClasses('my-custom-class')
      expect(tailwindClasses).toBe('my-custom-class')
      expect(Object.keys(props)).toHaveLength(0)
    })

    it('empty string → empty properties, empty tailwindClasses', () => {
      const { properties: props, tailwindClasses } = parseTailwindClasses('')
      expect(props).toEqual({})
      expect(tailwindClasses).toBe('')
    })

    it('multiple spaces between classes are handled correctly', () => {
      const { properties: props } = parseTailwindClasses('flex   flex-col   gap-4')
      expect(props.display).toBe('flex')
      expect(props.direction).toBe('column')
      expect(props.gap).toEqual(dvToken('4', 16))
    })

    it('bg-cover → bgSize cover', () => {
      const { properties: props } = parseTailwindClasses('bg-cover')
      expect(props.bgSize).toBe('cover')
    })

    it('bg-center → bgPosition center', () => {
      const { properties: props } = parseTailwindClasses('bg-center')
      expect(props.bgPosition).toBe('center')
    })

    it('cursor-pointer → cursor pointer', () => {
      const { properties: props } = parseTailwindClasses('cursor-pointer')
      expect(props.cursor).toBe('pointer')
    })

    it('responsive prefix sm:flex passes through to tailwindClasses', () => {
      const { properties: props, tailwindClasses } = parseTailwindClasses('sm:flex')
      expect(props.display).toBeUndefined()
      expect(tailwindClasses).toBe('sm:flex')
    })

    it('combined flex flex-col gap-4 p-8 bg-blue-500 rounded-lg → all properties set', () => {
      const { properties: props, tailwindClasses } = parseTailwindClasses(
        'flex flex-col gap-4 p-8 bg-blue-500 rounded-lg',
      )
      expect(props.display).toBe('flex')
      expect(props.direction).toBe('column')
      expect(props.gap).toEqual(dvToken('4', 16))
      expect(props.padding).toEqual({
        top: dvToken('8', 32),
        right: dvToken('8', 32),
        bottom: dvToken('8', 32),
        left: dvToken('8', 32),
      })
      expect(props.bg).toEqual(dvColorToken('blue-500', '#3b82f6'))
      expect(props.borderRadius).toEqual({
        topLeft: dvToken('lg', 8),
        topRight: dvToken('lg', 8),
        bottomRight: dvToken('lg', 8),
        bottomLeft: dvToken('lg', 8),
      })
      expect(tailwindClasses).toBe('')
    })
  })

  // ---------------------------------------------------------------------------
  // Combined fontSize + lineHeight syntax
  // ---------------------------------------------------------------------------

  describe('Combined fontSize/lineHeight', () => {
    it('text-xl/relaxed → fontSize xl (20) + lineHeight relaxed (1.625)', () => {
      const { properties: props } = parseTailwindClasses('text-xl/relaxed')
      expect(props.fontSize).toEqual(dvToken('xl', 20))
      expect(props.lineHeight).toEqual(dvToken('relaxed', 1.625))
    })

    it('text-xl/[1.1] → fontSize xl (20) + lineHeight custom 1.1', () => {
      const { properties: props } = parseTailwindClasses('text-xl/[1.1]')
      expect(props.fontSize).toEqual(dvToken('xl', 20))
      expect(props.lineHeight).toEqual(dvCustom(1.1))
    })

    it('text-sm → fontSize sm (14) + default lineHeight normal (1.5)', () => {
      const { properties: props } = parseTailwindClasses('text-sm')
      expect(props.fontSize).toEqual(dvToken('sm', 14))
      expect(props.lineHeight).toEqual(dvToken('normal', 1.5))
    })

    it('text-3xl → fontSize 3xl (30) + default lineHeight tight (1.25)', () => {
      const { properties: props } = parseTailwindClasses('text-3xl')
      expect(props.fontSize).toEqual(dvToken('3xl', 30))
      // 3xl default leading is 'tight' (value 1.25)
      expect(props.lineHeight).toEqual(dvToken('tight', 1.25))
    })
  })
})
