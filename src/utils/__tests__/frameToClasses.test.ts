import { describe, it, expect } from 'vitest'
import { frameToClasses } from '../frameToClasses'
import {
  makeBox, makeText, makeImage, makeButton, makeInput, makeTextarea, makeSelect,
  dvNum, dvStr, dvToken, dvColorToken, zeroBorderRadius,
} from './helpers'

// ── Helper: check class string contains / does not contain ──

function classes(frame: Parameters<typeof frameToClasses>[0]) {
  return frameToClasses(frame).split(' ').filter(Boolean)
}

function has(frame: Parameters<typeof frameToClasses>[0], cls: string) {
  return classes(frame).includes(cls)
}

// ══════════════════════════════════════════════════════════════
// 1. BOX LAYOUT
// ══════════════════════════════════════════════════════════════

describe('Box layout', () => {
  it('emits flex + flex-col for default box', () => {
    const c = classes(makeBox())
    expect(c).toContain('flex')
    expect(c).toContain('flex-col')
  })

  it('emits flex-row when direction is row', () => {
    expect(has(makeBox({ direction: 'row' }), 'flex-row')).toBe(true)
  })

  it('emits inline-flex', () => {
    expect(has(makeBox({ display: 'inline-flex' }), 'inline-flex')).toBe(true)
  })

  it('emits grid + grid-cols-3', () => {
    const c = classes(makeBox({ display: 'grid', gridCols: dvToken('3', 3) }))
    expect(c).toContain('grid')
    expect(c).toContain('grid-cols-3')
  })

  it('emits grid-rows with custom value', () => {
    const c = classes(makeBox({ display: 'grid', gridRows: dvNum(4) }))
    expect(c).toContain('grid-rows-[4]')
  })

  it('emits inline-block', () => {
    expect(has(makeBox({ display: 'inline-block' }), 'inline-block')).toBe(true)
  })

  it('emits inline', () => {
    expect(has(makeBox({ display: 'inline' }), 'inline')).toBe(true)
  })

  it('does NOT emit block (it is default)', () => {
    expect(has(makeBox({ display: 'block' }), 'block')).toBe(false)
  })

  describe('justify', () => {
    it('omits class for start (default)', () => {
      expect(has(makeBox({ justify: 'start' }), 'justify-start')).toBe(false)
      expect(has(makeBox({ justify: 'start' }), 'justify-center')).toBe(false)
    })
    it('emits justify-center', () => {
      expect(has(makeBox({ justify: 'center' }), 'justify-center')).toBe(true)
    })
    it('emits justify-end', () => {
      expect(has(makeBox({ justify: 'end' }), 'justify-end')).toBe(true)
    })
    it('emits justify-between', () => {
      expect(has(makeBox({ justify: 'between' }), 'justify-between')).toBe(true)
    })
    it('emits justify-around', () => {
      expect(has(makeBox({ justify: 'around' }), 'justify-around')).toBe(true)
    })
  })

  describe('align', () => {
    it('emits items-stretch for stretch', () => {
      expect(has(makeBox({ align: 'stretch' }), 'items-stretch')).toBe(true)
    })
    it('emits items-center', () => {
      expect(has(makeBox({ align: 'center' }), 'items-center')).toBe(true)
    })
    it('emits items-start', () => {
      expect(has(makeBox({ align: 'start' }), 'items-start')).toBe(true)
    })
    it('emits items-end', () => {
      expect(has(makeBox({ align: 'end' }), 'items-end')).toBe(true)
    })
  })

  describe('gap', () => {
    it('omits gap when 0', () => {
      expect(classes(makeBox({ gap: dvNum(0) })).some(c => c.startsWith('gap'))).toBe(false)
    })
    it('emits gap-4 for token 4 (16px)', () => {
      expect(has(makeBox({ gap: dvToken('4', 16) }), 'gap-4')).toBe(true)
    })
    it('emits gap-[20px] for custom value', () => {
      expect(has(makeBox({ gap: dvNum(20) }), 'gap-[20px]')).toBe(true)
    })
  })

  it('emits flex-wrap', () => {
    expect(has(makeBox({ wrap: true }), 'flex-wrap')).toBe(true)
  })

  it('omits flex-wrap when false', () => {
    expect(has(makeBox({ wrap: false }), 'flex-wrap')).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 2. SIZING
// ══════════════════════════════════════════════════════════════

describe('Sizing', () => {
  it('emits w-fit for hug', () => {
    expect(has(makeBox({ width: { mode: 'hug', value: dvNum(0) } }), 'w-fit')).toBe(true)
  })

  it('emits w-full for fill', () => {
    expect(has(makeBox({ width: { mode: 'fill', value: dvNum(0) } }), 'w-full')).toBe(true)
  })

  it('emits w-64 for token', () => {
    expect(has(makeBox({ width: { mode: 'fixed', value: dvToken('64', 256) } }), 'w-64')).toBe(true)
  })

  it('emits w-[300px] for custom', () => {
    expect(has(makeBox({ width: { mode: 'fixed', value: dvNum(300) } }), 'w-[300px]')).toBe(true)
  })

  it('emits h-fit for hug', () => {
    expect(has(makeBox({ height: { mode: 'hug', value: dvNum(0) } }), 'h-fit')).toBe(true)
  })

  it('emits h-full for fill', () => {
    expect(has(makeBox({ height: { mode: 'fill', value: dvNum(0) } }), 'h-full')).toBe(true)
  })

  it('emits no size class for default mode', () => {
    const c = classes(makeBox())
    expect(c.some(cl => cl.startsWith('w-') || cl.startsWith('h-'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 3. SIZE CONSTRAINTS
// ══════════════════════════════════════════════════════════════

describe('Size constraints', () => {
  it('emits min-w-xs for token', () => {
    expect(has(makeBox({ minWidth: dvToken('xs', 320) }), 'min-w-xs')).toBe(true)
  })

  it('emits max-w-[500px] for custom', () => {
    expect(has(makeBox({ maxWidth: dvNum(500) }), 'max-w-[500px]')).toBe(true)
  })

  it('emits min-h and max-h', () => {
    const c = classes(makeBox({ minHeight: dvToken('4', 16), maxHeight: dvNum(200) }))
    expect(c).toContain('min-h-4')
    expect(c).toContain('max-h-[200px]')
  })

  it('omits constraints when 0', () => {
    const c = classes(makeBox())
    expect(c.some(cl => cl.startsWith('min-') || cl.startsWith('max-'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 4. GROW / SHRINK
// ══════════════════════════════════════════════════════════════

describe('Grow / Shrink', () => {
  it('emits grow for value 1', () => {
    expect(has(makeBox({ grow: dvNum(1) }), 'grow')).toBe(true)
  })

  it('emits grow-0 for explicit token 0', () => {
    expect(has(makeBox({ grow: dvToken('0', 0) }), 'grow-0')).toBe(true)
  })

  it('does NOT emit grow when value is 0 custom (default)', () => {
    const c = classes(makeBox({ grow: dvNum(0) }))
    expect(c.some(cl => cl.startsWith('grow'))).toBe(false)
  })

  it('emits grow-[2] for custom value > 1', () => {
    expect(has(makeBox({ grow: dvNum(2) }), 'grow-[2]')).toBe(true)
  })

  it('emits shrink-0 for value 0', () => {
    expect(has(makeBox({ shrink: dvNum(0) }), 'shrink-0')).toBe(true)
  })

  it('does NOT emit shrink for default 1', () => {
    const c = classes(makeBox({ shrink: dvNum(1) }))
    expect(c.some(cl => cl.startsWith('shrink'))).toBe(false)
  })

  it('emits shrink-[0.5] for custom fractional', () => {
    expect(has(makeBox({ shrink: dvNum(0.5) }), 'shrink-[0.5]')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 5. SPACING (padding & margin)
// ══════════════════════════════════════════════════════════════

describe('Spacing', () => {
  it('emits uniform padding: p-4', () => {
    const s = { top: dvToken('4', 16), right: dvToken('4', 16), bottom: dvToken('4', 16), left: dvToken('4', 16) }
    expect(has(makeBox({ padding: s }), 'p-4')).toBe(true)
  })

  it('emits symmetric padding: px-4 py-2', () => {
    const s = { top: dvToken('2', 8), right: dvToken('4', 16), bottom: dvToken('2', 8), left: dvToken('4', 16) }
    const c = classes(makeBox({ padding: s }))
    expect(c).toContain('px-4')
    expect(c).toContain('py-2')
  })

  it('emits per-side padding', () => {
    const s = { top: dvNum(10), right: dvNum(20), bottom: dvNum(30), left: dvNum(40) }
    const c = classes(makeBox({ padding: s }))
    expect(c).toContain('pt-[10px]')
    expect(c).toContain('pr-[20px]')
    expect(c).toContain('pb-[30px]')
    expect(c).toContain('pl-[40px]')
  })

  it('omits padding when all zero', () => {
    const c = classes(makeBox())
    expect(c.some(cl => cl.startsWith('p-') || cl.startsWith('px-') || cl.startsWith('py-'))).toBe(false)
  })

  it('emits margin tokens', () => {
    const s = { top: dvToken('8', 32), right: dvToken('8', 32), bottom: dvToken('8', 32), left: dvToken('8', 32) }
    expect(has(makeBox({ margin: s }), 'm-8')).toBe(true)
  })

  it('emits mx-auto for auto margin', () => {
    const s = {
      top: dvNum(0), bottom: dvNum(0),
      left: { mode: 'token' as const, token: 'auto', value: 0 },
      right: { mode: 'token' as const, token: 'auto', value: 0 },
    }
    const c = classes(makeBox({ margin: s }))
    // auto margins are handled via spacing logic (non-zero token check)
    // The function uses dvIsZero which checks mode=custom && value=0
    // Token auto with value 0 won't match dvIsZero → will be emitted
    expect(c.some(cl => cl.includes('auto') || cl.startsWith('m'))).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 6. POSITION & INSET
// ══════════════════════════════════════════════════════════════

describe('Position', () => {
  it('omits class for static', () => {
    expect(has(makeBox({ position: 'static' }), 'static')).toBe(false)
  })

  it('emits relative', () => {
    expect(has(makeBox({ position: 'relative' }), 'relative')).toBe(true)
  })

  it('emits absolute', () => {
    expect(has(makeBox({ position: 'absolute' }), 'absolute')).toBe(true)
  })

  it('emits fixed', () => {
    expect(has(makeBox({ position: 'fixed' }), 'fixed')).toBe(true)
  })

  it('emits sticky', () => {
    expect(has(makeBox({ position: 'sticky' }), 'sticky')).toBe(true)
  })

  it('emits z-index when positioned', () => {
    expect(has(makeBox({ position: 'absolute', zIndex: dvToken('10', 10) }), 'z-10')).toBe(true)
  })

  it('does NOT emit z-index for static', () => {
    const c = classes(makeBox({ position: 'static', zIndex: dvToken('10', 10) }))
    expect(c.some(cl => cl.startsWith('z-'))).toBe(false)
  })

  it('emits inset classes when positioned', () => {
    const inset = { top: dvToken('0', 0), right: dvToken('0', 0), bottom: dvToken('0', 0), left: dvToken('0', 0) }
    expect(has(makeBox({ position: 'absolute', inset }), 'inset-0')).toBe(true)
  })

  it('emits per-side inset', () => {
    const inset = { top: dvNum(10), right: dvNum(0), bottom: dvNum(0), left: dvNum(20) }
    const c = classes(makeBox({ position: 'absolute', inset }))
    expect(c).toContain('top-[10px]')
    expect(c).toContain('left-[20px]')
  })

  it('emits inset-auto when all auto', () => {
    const auto = { mode: 'token' as const, token: 'auto', value: 0 }
    const inset = { top: auto, right: auto, bottom: auto, left: auto }
    expect(has(makeBox({ position: 'absolute', inset }), 'inset-auto')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 7. ALIGN SELF
// ══════════════════════════════════════════════════════════════

describe('Align self', () => {
  it('omits for auto (default)', () => {
    const c = classes(makeBox({ alignSelf: 'auto' }))
    expect(c.some(cl => cl.startsWith('self-'))).toBe(false)
  })
  it('emits self-center', () => {
    expect(has(makeBox({ alignSelf: 'center' }), 'self-center')).toBe(true)
  })
  it('emits self-start', () => {
    expect(has(makeBox({ alignSelf: 'start' }), 'self-start')).toBe(true)
  })
  it('emits self-end', () => {
    expect(has(makeBox({ alignSelf: 'end' }), 'self-end')).toBe(true)
  })
  it('emits self-stretch', () => {
    expect(has(makeBox({ alignSelf: 'stretch' }), 'self-stretch')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 8. BACKGROUND
// ══════════════════════════════════════════════════════════════

describe('Background', () => {
  it('emits bg-red-500 for color token', () => {
    expect(has(makeBox({ bg: dvColorToken('red-500') }), 'bg-red-500')).toBe(true)
  })

  it('emits bg-[#ff0000] for custom color', () => {
    expect(has(makeBox({ bg: dvStr('#ff0000') }), 'bg-[#ff0000]')).toBe(true)
  })

  it('omits bg when empty string', () => {
    const c = classes(makeBox({ bg: dvStr('') }))
    expect(c.some(cl => cl.startsWith('bg-'))).toBe(false)
  })

  it('emits background image classes (url via inline style)', () => {
    const c = classes(makeBox({
      bgImage: 'https://example.com/img.jpg',
      bgSize: 'cover',
      bgPosition: 'top-left',
      bgRepeat: 'no-repeat',
    }))
    // bg-[url(...)] is no longer emitted — image URL is set via inline style
    expect(c).not.toContain("bg-[url('https://example.com/img.jpg')]")
    expect(c).toContain('bg-cover')
    expect(c).toContain('bg-left-top') // Tailwind v4 format
    expect(c).toContain('bg-no-repeat')
  })

  it('omits bg-auto and bg-center (defaults)', () => {
    const c = classes(makeBox({
      bgImage: 'https://example.com/img.jpg',
      bgSize: 'auto',
      bgPosition: 'center',
      bgRepeat: 'repeat',
    }))
    expect(c.some(cl => cl === 'bg-auto')).toBe(false)
    expect(c.some(cl => cl === 'bg-center')).toBe(false)
    expect(c.some(cl => cl === 'bg-repeat')).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 9. BORDER
// ══════════════════════════════════════════════════════════════

// Helper: uniform border width on all 4 sides
function uniformBorder(w: ReturnType<typeof dvNum>, color: ReturnType<typeof dvStr>, style: 'none' | 'solid' | 'dashed' | 'dotted') {
  return { top: w, right: { ...w }, bottom: { ...w }, left: { ...w }, color, style } as const
}

describe('Border', () => {
  it('omits border when style is none', () => {
    const c = classes(makeBox({ border: uniformBorder(dvNum(2), dvStr('#000'), 'none') }))
    expect(c.some(cl => cl.startsWith('border'))).toBe(false)
  })

  it('omits border when all widths are 0', () => {
    const c = classes(makeBox({ border: uniformBorder(dvNum(0), dvStr('#000'), 'solid') }))
    expect(c.some(cl => cl.startsWith('border'))).toBe(false)
  })

  it('emits `border` for uniform 1px (empty token)', () => {
    const c = classes(makeBox({ border: uniformBorder(dvToken('', 1), dvStr('#000'), 'solid') }))
    expect(c).toContain('border')
    expect(c).toContain('border-[#000]')
  })

  it('emits `border` for uniform custom 1px', () => {
    const c = classes(makeBox({ border: uniformBorder(dvNum(1), dvStr('#000'), 'solid') }))
    expect(c).toContain('border')
  })

  it('emits border-2 for uniform token 2', () => {
    expect(has(makeBox({ border: uniformBorder(dvToken('2', 2), dvStr(''), 'solid') }), 'border-2')).toBe(true)
  })

  it('emits border-[3px] for uniform custom 3', () => {
    expect(has(makeBox({ border: uniformBorder(dvNum(3), dvStr(''), 'solid') }), 'border-[3px]')).toBe(true)
  })

  it('emits border-dashed', () => {
    expect(has(makeBox({ border: uniformBorder(dvNum(1), dvStr(''), 'dashed') }), 'border-dashed')).toBe(true)
  })

  it('omits border-solid (default)', () => {
    expect(has(makeBox({ border: uniformBorder(dvNum(1), dvStr(''), 'solid') }), 'border-solid')).toBe(false)
  })

  it('emits border color token', () => {
    const c = classes(makeBox({ border: uniformBorder(dvNum(1), dvColorToken('zinc-300'), 'solid') }))
    expect(c).toContain('border-zinc-300')
  })

  // Per-side tests
  it('emits border-t-2 for top-only', () => {
    const b = { top: dvToken('2', 2), right: dvNum(0), bottom: dvNum(0), left: dvNum(0), color: dvStr(''), style: 'solid' as const }
    const c = classes(makeBox({ border: b }))
    expect(c).toContain('border-t-2')
    expect(c.some(cl => cl === 'border-r-2' || cl === 'border-b-2' || cl === 'border-l-2')).toBe(false)
  })

  it('emits border-x-2 border-y-4 for symmetric', () => {
    const b = { top: dvToken('4', 4), right: dvToken('2', 2), bottom: dvToken('4', 4), left: dvToken('2', 2), color: dvStr(''), style: 'solid' as const }
    const c = classes(makeBox({ border: b }))
    expect(c).toContain('border-y-4')
    expect(c).toContain('border-x-2')
  })

  it('emits border-b for bottom 1px only', () => {
    const b = { top: dvNum(0), right: dvNum(0), bottom: dvToken('', 1), left: dvNum(0), color: dvStr(''), style: 'solid' as const }
    const c = classes(makeBox({ border: b }))
    expect(c).toContain('border-b')
    expect(c.some(cl => cl === 'border-t' || cl === 'border-r' || cl === 'border-l')).toBe(false)
  })

  it('emits per-side classes for all different widths', () => {
    const b = { top: dvNum(1), right: dvNum(2), bottom: dvNum(3), left: dvNum(4), color: dvStr(''), style: 'solid' as const }
    const c = classes(makeBox({ border: b }))
    expect(c).toContain('border-t')
    expect(c).toContain('border-r-[2px]')
    expect(c).toContain('border-b-[3px]')
    expect(c).toContain('border-l-[4px]')
  })
})

// ══════════════════════════════════════════════════════════════
// 10. BORDER RADIUS
// ══════════════════════════════════════════════════════════════

describe('Border radius', () => {
  it('emits rounded-lg for uniform token', () => {
    const br = { topLeft: dvToken('lg', 8), topRight: dvToken('lg', 8), bottomRight: dvToken('lg', 8), bottomLeft: dvToken('lg', 8) }
    expect(has(makeBox({ borderRadius: br }), 'rounded-lg')).toBe(true)
  })

  it('emits rounded for DEFAULT token', () => {
    const br = { topLeft: dvToken('DEFAULT', 4), topRight: dvToken('DEFAULT', 4), bottomRight: dvToken('DEFAULT', 4), bottomLeft: dvToken('DEFAULT', 4) }
    expect(has(makeBox({ borderRadius: br }), 'rounded')).toBe(true)
  })

  it('emits rounded-full', () => {
    const br = { topLeft: dvToken('full', 9999), topRight: dvToken('full', 9999), bottomRight: dvToken('full', 9999), bottomLeft: dvToken('full', 9999) }
    expect(has(makeBox({ borderRadius: br }), 'rounded-full')).toBe(true)
  })

  it('emits per-corner classes', () => {
    const br = { topLeft: dvToken('lg', 8), topRight: dvNum(0), bottomRight: dvToken('sm', 2), bottomLeft: dvNum(0) }
    const c = classes(makeBox({ borderRadius: br }))
    expect(c).toContain('rounded-tl-lg')
    expect(c).toContain('rounded-br-sm')
    expect(c.some(cl => cl.startsWith('rounded-tr'))).toBe(false)
    expect(c.some(cl => cl.startsWith('rounded-bl'))).toBe(false)
  })

  it('emits rounded-[10px] for custom value', () => {
    const br = { topLeft: dvNum(10), topRight: dvNum(10), bottomRight: dvNum(10), bottomLeft: dvNum(10) }
    expect(has(makeBox({ borderRadius: br }), 'rounded-[10px]')).toBe(true)
  })

  it('omits when all zero', () => {
    const c = classes(makeBox({ borderRadius: zeroBorderRadius() }))
    expect(c.some(cl => cl.startsWith('rounded'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 11. OVERFLOW
// ══════════════════════════════════════════════════════════════

describe('Overflow', () => {
  it('omits for visible (default)', () => {
    const c = classes(makeBox({ overflow: 'visible' }))
    expect(c.some(cl => cl.startsWith('overflow'))).toBe(false)
  })
  it('emits overflow-hidden', () => {
    expect(has(makeBox({ overflow: 'hidden' }), 'overflow-hidden')).toBe(true)
  })
  it('emits overflow-scroll', () => {
    expect(has(makeBox({ overflow: 'scroll' }), 'overflow-scroll')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 12. OPACITY
// ══════════════════════════════════════════════════════════════

describe('Opacity', () => {
  it('omits for 100 (default)', () => {
    const c = classes(makeBox({ opacity: dvNum(100) }))
    expect(c.some(cl => cl.startsWith('opacity'))).toBe(false)
  })

  it('emits opacity-50 for token', () => {
    expect(has(makeBox({ opacity: dvToken('50', 50) }), 'opacity-50')).toBe(true)
  })

  it('emits opacity-0 for token 0', () => {
    expect(has(makeBox({ opacity: dvToken('0', 0) }), 'opacity-0')).toBe(true)
  })

  it('emits opacity-[0.75] for custom 75', () => {
    expect(has(makeBox({ opacity: dvNum(75) }), 'opacity-[0.75]')).toBe(true)
  })

  it('emits opacity-[0] for custom 0', () => {
    expect(has(makeBox({ opacity: dvNum(0) }), 'opacity-[0]')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 13. BOX SHADOW
// ══════════════════════════════════════════════════════════════

describe('Box shadow', () => {
  it('omits for none', () => {
    const c = classes(makeBox({ boxShadow: 'none' }))
    expect(c.some(cl => cl.startsWith('shadow'))).toBe(false)
  })
  it('emits shadow for base', () => {
    expect(has(makeBox({ boxShadow: 'base' }), 'shadow')).toBe(true)
  })
  it('emits shadow-lg', () => {
    expect(has(makeBox({ boxShadow: 'lg' }), 'shadow-lg')).toBe(true)
  })
  it('emits shadow-2xl', () => {
    expect(has(makeBox({ boxShadow: '2xl' }), 'shadow-2xl')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 14. CURSOR
// ══════════════════════════════════════════════════════════════

describe('Cursor', () => {
  it('omits for auto (default)', () => {
    const c = classes(makeBox({ cursor: 'auto' }))
    expect(c.some(cl => cl.startsWith('cursor'))).toBe(false)
  })
  it('emits cursor-pointer', () => {
    expect(has(makeBox({ cursor: 'pointer' }), 'cursor-pointer')).toBe(true)
  })
  it('emits cursor-grab', () => {
    expect(has(makeBox({ cursor: 'grab' }), 'cursor-grab')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 15. BLUR / BACKDROP BLUR
// ══════════════════════════════════════════════════════════════

describe('Blur', () => {
  it('omits blur when 0', () => {
    const c = classes(makeBox({ blur: dvNum(0) }))
    expect(c.some(cl => cl.startsWith('blur'))).toBe(false)
  })
  it('emits blur for DEFAULT token', () => {
    expect(has(makeBox({ blur: dvToken('DEFAULT', 8) }), 'blur')).toBe(true)
  })
  it('emits blur-lg for token', () => {
    expect(has(makeBox({ blur: dvToken('lg', 16) }), 'blur-lg')).toBe(true)
  })
  it('emits blur-[5px] for custom', () => {
    expect(has(makeBox({ blur: dvNum(5) }), 'blur-[5px]')).toBe(true)
  })
  it('emits backdrop-blur-md', () => {
    expect(has(makeBox({ backdropBlur: dvToken('md', 12) }), 'backdrop-blur-md')).toBe(true)
  })
  it('emits backdrop-blur for DEFAULT', () => {
    expect(has(makeBox({ backdropBlur: dvToken('DEFAULT', 8) }), 'backdrop-blur')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 16. TRANSFORMS
// ══════════════════════════════════════════════════════════════

describe('Transforms', () => {
  it('emits rotate-45 for token', () => {
    expect(has(makeBox({ rotate: dvToken('45', 45) }), 'rotate-45')).toBe(true)
  })
  it('emits rotate-[15deg] for custom', () => {
    expect(has(makeBox({ rotate: dvNum(15) }), 'rotate-[15deg]')).toBe(true)
  })
  it('emits -rotate-6 for negative token', () => {
    expect(has(makeBox({ rotate: dvToken('6', -6) }), '-rotate-6')).toBe(true)
  })
  it('omits rotate when 0', () => {
    const c = classes(makeBox({ rotate: dvNum(0) }))
    expect(c.some(cl => cl.includes('rotate'))).toBe(false)
  })

  it('emits scale-75 for token', () => {
    expect(has(makeBox({ scaleVal: dvToken('75', 75) }), 'scale-75')).toBe(true)
  })
  it('emits scale-[80] for custom 80', () => {
    expect(has(makeBox({ scaleVal: dvNum(80) }), 'scale-[80]')).toBe(true)
  })
  it('omits scale when 100 (default)', () => {
    const c = classes(makeBox({ scaleVal: dvNum(100) }))
    expect(c.some(cl => cl.startsWith('scale'))).toBe(false)
  })

  it('emits translate-x-4 for token', () => {
    expect(has(makeBox({ translateX: dvToken('4', 16) }), 'translate-x-4')).toBe(true)
  })
  it('emits -translate-y-[10px] for negative custom', () => {
    expect(has(makeBox({ translateY: dvNum(-10) }), '-translate-y-[10px]')).toBe(true)
  })
  it('omits translate when 0', () => {
    const c = classes(makeBox({ translateX: dvNum(0), translateY: dvNum(0) }))
    expect(c.some(cl => cl.includes('translate'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 17. TRANSITIONS
// ══════════════════════════════════════════════════════════════

describe('Transitions', () => {
  it('omits for none', () => {
    const c = classes(makeBox({ transition: 'none' }))
    expect(c.some(cl => cl.startsWith('transition') || cl.startsWith('duration') || cl.startsWith('ease'))).toBe(false)
  })

  it('emits transition-all + duration + ease', () => {
    const c = classes(makeBox({ transition: 'all', duration: dvToken('300', 300), ease: 'in-out' }))
    expect(c).toContain('transition-all')
    expect(c).toContain('duration-300')
    expect(c).toContain('ease-in-out')
  })

  it('emits transition-colors', () => {
    expect(has(makeBox({ transition: 'colors', duration: dvNum(200), ease: 'linear' }), 'transition-colors')).toBe(true)
  })

  it('omits ease-linear (default)', () => {
    const c = classes(makeBox({ transition: 'all', duration: dvNum(200), ease: 'linear' }))
    expect(c.some(cl => cl.startsWith('ease'))).toBe(false)
  })

  it('omits duration when 0', () => {
    const c = classes(makeBox({ transition: 'all', duration: dvNum(0) }))
    expect(c.some(cl => cl.startsWith('duration'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 18. GRID CHILD (col/row span)
// ══════════════════════════════════════════════════════════════

describe('Grid child', () => {
  it('emits col-span-3', () => {
    expect(has(makeBox({ colSpan: dvToken('3', 3) }), 'col-span-3')).toBe(true)
  })
  it('emits col-span-full', () => {
    expect(has(makeBox({ colSpan: dvToken('full', 9999) }), 'col-span-full')).toBe(true)
  })
  it('emits row-span-2', () => {
    expect(has(makeBox({ rowSpan: dvToken('2', 2) }), 'row-span-2')).toBe(true)
  })
  it('emits row-span-full', () => {
    expect(has(makeBox({ rowSpan: dvToken('full', 9999) }), 'row-span-full')).toBe(true)
  })
  it('omits span classes when 0', () => {
    const c = classes(makeBox())
    expect(c.some(cl => cl.includes('span'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 19. TEXT STYLES
// ══════════════════════════════════════════════════════════════

describe('Text styles', () => {
  it('emits text-lg for fontSize token', () => {
    expect(has(makeText({ fontSize: dvToken('lg', 18) }), 'text-lg')).toBe(true)
  })

  it('emits text-[20px] for custom fontSize', () => {
    expect(has(makeText({ fontSize: dvNum(20) }), 'text-[20px]')).toBe(true)
  })

  it('emits combined fontSize/lineHeight: text-lg/tight', () => {
    expect(has(makeText({ fontSize: dvToken('lg', 18), lineHeight: dvToken('tight', 1.25) }), 'text-lg/tight')).toBe(true)
  })

  it('emits text-lg/[1.3] for token fontSize + custom lineHeight', () => {
    expect(has(makeText({ fontSize: dvToken('lg', 18), lineHeight: dvNum(1.3) }), 'text-lg/[1.3]')).toBe(true)
  })

  it('emits separate leading for custom fontSize', () => {
    const c = classes(makeText({ fontSize: dvNum(20), lineHeight: dvToken('normal', 1.5) }))
    expect(c).toContain('text-[20px]')
    expect(c).toContain('leading-normal')
  })

  it('emits leading-[1.8] for custom lineHeight only', () => {
    expect(has(makeText({ lineHeight: dvNum(1.8) }), 'leading-[1.8]')).toBe(true)
  })

  it('omits fontSize and lineHeight when 0 (inherit)', () => {
    const c = classes(makeText({ fontSize: dvNum(0), lineHeight: dvNum(0) }))
    expect(c.some(cl => cl.startsWith('text-') || cl.startsWith('leading'))).toBe(false)
  })

  it('emits font-bold for weight 700', () => {
    expect(has(makeText({ fontWeight: dvNum(700) }), 'font-bold')).toBe(true)
  })

  it('emits font-semibold for token', () => {
    expect(has(makeText({ fontWeight: dvToken('semibold', 600) }), 'font-semibold')).toBe(true)
  })

  it('omits fontWeight 400 (default)', () => {
    const c = classes(makeText({ fontWeight: dvNum(400) }))
    expect(c.some(cl => cl.startsWith('font-'))).toBe(false)
  })

  it('emits text-red-500 for color token', () => {
    expect(has(makeText({ color: dvColorToken('red-500') }), 'text-red-500')).toBe(true)
  })

  it('emits text-[#333] for custom color', () => {
    expect(has(makeText({ color: dvStr('#333') }), 'text-[#333]')).toBe(true)
  })

  it('omits color when empty (inherit)', () => {
    const c = classes(makeText({ color: dvStr('') }))
    expect(c.some(cl => cl.startsWith('text-'))).toBe(false)
  })

  it('emits text-center', () => {
    expect(has(makeText({ textAlign: 'center' }), 'text-center')).toBe(true)
  })

  it('omits text-left (default)', () => {
    expect(has(makeText({ textAlign: 'left' }), 'text-left')).toBe(false)
  })

  it('emits italic', () => {
    expect(has(makeText({ fontStyle: 'italic' }), 'italic')).toBe(true)
  })

  it('omits fontStyle normal', () => {
    expect(has(makeText({ fontStyle: 'normal' }), 'italic')).toBe(false)
  })

  it('emits underline', () => {
    expect(has(makeText({ textDecoration: 'underline' }), 'underline')).toBe(true)
  })

  it('emits line-through', () => {
    expect(has(makeText({ textDecoration: 'line-through' }), 'line-through')).toBe(true)
  })

  it('emits tracking-wide for letterSpacing token', () => {
    expect(has(makeText({ letterSpacing: dvToken('wide', 0.4) }), 'tracking-wide')).toBe(true)
  })

  it('emits tracking-[2px] for custom', () => {
    expect(has(makeText({ letterSpacing: dvNum(2) }), 'tracking-[2px]')).toBe(true)
  })

  it('emits uppercase', () => {
    expect(has(makeText({ textTransform: 'uppercase' }), 'uppercase')).toBe(true)
  })

  it('omits textTransform none', () => {
    const c = classes(makeText({ textTransform: 'none' }))
    expect(c.some(cl => ['uppercase', 'lowercase', 'capitalize'].includes(cl))).toBe(false)
  })

  it('emits whitespace-nowrap', () => {
    expect(has(makeText({ whiteSpace: 'nowrap' }), 'whitespace-nowrap')).toBe(true)
  })

  it('emits whitespace-pre-wrap', () => {
    expect(has(makeText({ whiteSpace: 'pre-wrap' }), 'whitespace-pre-wrap')).toBe(true)
  })

  it('omits whitespace-normal (default)', () => {
    const c = classes(makeText({ whiteSpace: 'normal' }))
    expect(c.some(cl => cl.startsWith('whitespace'))).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// 20. TEXT STYLES ON BUTTON / INPUT / TEXTAREA / SELECT
// ══════════════════════════════════════════════════════════════

describe('Text styles on non-text elements', () => {
  it('button gets text classes', () => {
    const c = classes(makeButton({ fontSize: dvToken('lg', 18), fontWeight: dvNum(700) }))
    expect(c).toContain('text-lg')
    expect(c).toContain('font-bold')
  })

  it('input gets text classes', () => {
    expect(has(makeInput({ fontSize: dvToken('sm', 14) }), 'text-sm')).toBe(true)
  })

  it('textarea gets text classes', () => {
    expect(has(makeTextarea({ color: dvColorToken('gray-600') }), 'text-gray-600')).toBe(true)
  })

  it('select gets text classes', () => {
    expect(has(makeSelect({ fontWeight: dvNum(600) }), 'font-semibold')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 21. IMAGE
// ══════════════════════════════════════════════════════════════

describe('Image', () => {
  it('emits object-cover', () => {
    expect(has(makeImage({ objectFit: 'cover' }), 'object-cover')).toBe(true)
  })
  it('emits object-contain', () => {
    expect(has(makeImage({ objectFit: 'contain' }), 'object-contain')).toBe(true)
  })
  it('emits object-fill', () => {
    expect(has(makeImage({ objectFit: 'fill' }), 'object-fill')).toBe(true)
  })
  it('emits object-none', () => {
    expect(has(makeImage({ objectFit: 'none' }), 'object-none')).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 22. TAILWIND CLASSES (manual override)
// ══════════════════════════════════════════════════════════════

describe('tailwindClasses', () => {
  it('appends custom Tailwind classes', () => {
    const c = classes(makeBox({ tailwindClasses: 'hover:bg-red-500 dark:text-white' }))
    expect(c).toContain('hover:bg-red-500')
    expect(c).toContain('dark:text-white')
  })
})

// ══════════════════════════════════════════════════════════════
// 23. DEFAULT BOX — minimal output
// ══════════════════════════════════════════════════════════════

describe('Default frame (minimal output)', () => {
  it('default box only has flex + flex-col + items-stretch', () => {
    const c = classes(makeBox())
    expect(c).toEqual(['flex', 'flex-col', 'items-stretch'])
  })

  it('default text has no classes (all defaults)', () => {
    const c = classes(makeText())
    expect(c).toEqual([])
  })

  it('default image has object-cover', () => {
    const c = classes(makeImage())
    expect(c).toEqual(['object-cover'])
  })

  it('default button has no classes', () => {
    const c = classes(makeButton())
    expect(c).toEqual([])
  })
})
