import { describe, it, expect } from 'vitest'
import { frameToClasses } from '../frameToClasses'
import { toContainerQueries } from '../responsiveClasses'
import { makeText, dvToken, dvColorToken } from './helpers'

describe('responsive container query classes', () => {
  it('generates responsive fontSize classes for text frame with color', () => {
    const frame = makeText({
      fontSize: dvToken('3xl', 30),
      fontWeight: dvToken('semibold', 600),
      color: dvColorToken('indigo-600', '#4f46e5'),
      responsive: {
        md: { fontSize: dvToken('2xl', 24) },
        xl: { fontSize: dvToken('base', 16) },
      },
    })
    const raw = frameToClasses(frame)
    const cq = toContainerQueries(raw)

    // Raw classes should have viewport-style responsive prefixes with !important
    expect(raw).toContain('max-md:!text-2xl')
    expect(raw).toContain('xl:!text-base')

    // Container queries should use pixel breakpoints with !important
    expect(cq).toContain('@max-[768px]:!text-2xl')
    expect(cq).toContain('@min-[1280px]:!text-base')
  })

  it('generates responsive hidden with !important', () => {
    const frame = makeText({
      responsive: {
        md: { hidden: true },
      },
    })
    const raw = frameToClasses(frame)
    expect(raw).toContain('max-md:!hidden')
  })
})
