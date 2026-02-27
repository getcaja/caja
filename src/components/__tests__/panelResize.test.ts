/**
 * Panel resize logic tests — verifies width clamping, drag direction,
 * and the overlay pattern for iframe event interception.
 */
import { describe, it, expect } from 'vitest'

const LEFT_MIN = 150
const LEFT_MAX = 400
const LEFT_DEFAULT = 224
const RIGHT_MIN = 180
const RIGHT_MAX = 400
const RIGHT_DEFAULT = 240

function clampLeft(startWidth: number, delta: number): number {
  return Math.min(LEFT_MAX, Math.max(LEFT_MIN, startWidth + delta))
}

function clampRight(startWidth: number, delta: number): number {
  return Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidth - delta))
}

describe('Panel resize clamping', () => {
  // Left panel: width = startWidth + delta (drag right = wider)
  describe('left panel', () => {
    it('increases width when dragging right', () => {
      expect(clampLeft(LEFT_DEFAULT, 50)).toBe(274)
    })

    it('decreases width when dragging left', () => {
      expect(clampLeft(LEFT_DEFAULT, -50)).toBe(174)
    })

    it('clamps to LEFT_MIN', () => {
      expect(clampLeft(LEFT_DEFAULT, -200)).toBe(LEFT_MIN)
    })

    it('clamps to LEFT_MAX', () => {
      expect(clampLeft(LEFT_DEFAULT, 300)).toBe(LEFT_MAX)
    })

    it('stays at current width with zero delta', () => {
      expect(clampLeft(LEFT_DEFAULT, 0)).toBe(LEFT_DEFAULT)
    })

    it('clamps correctly when starting at minimum', () => {
      expect(clampLeft(LEFT_MIN, -10)).toBe(LEFT_MIN)
      expect(clampLeft(LEFT_MIN, 10)).toBe(160)
    })

    it('clamps correctly when starting at maximum', () => {
      expect(clampLeft(LEFT_MAX, 10)).toBe(LEFT_MAX)
      expect(clampLeft(LEFT_MAX, -10)).toBe(390)
    })
  })

  // Right panel: width = startWidth - delta (drag left = wider)
  describe('right panel', () => {
    it('increases width when dragging left (negative delta)', () => {
      expect(clampRight(RIGHT_DEFAULT, -50)).toBe(290)
    })

    it('decreases width when dragging right (positive delta)', () => {
      expect(clampRight(RIGHT_DEFAULT, 50)).toBe(190)
    })

    it('clamps to RIGHT_MIN', () => {
      expect(clampRight(RIGHT_DEFAULT, 200)).toBe(RIGHT_MIN)
    })

    it('clamps to RIGHT_MAX', () => {
      expect(clampRight(RIGHT_DEFAULT, -300)).toBe(RIGHT_MAX)
    })

    it('stays at current width with zero delta', () => {
      expect(clampRight(RIGHT_DEFAULT, 0)).toBe(RIGHT_DEFAULT)
    })
  })
})

describe('Panel resize state machine', () => {
  // Simulates the resize lifecycle without DOM
  type ResizeState = {
    isResizing: boolean
    dragging: 'left' | 'right' | null
    leftWidth: number
    rightWidth: number
  }

  function createState(): ResizeState {
    return { isResizing: false, dragging: null, leftWidth: LEFT_DEFAULT, rightWidth: RIGHT_DEFAULT }
  }

  function startDrag(state: ResizeState, side: 'left' | 'right', startX: number): {
    state: ResizeState
    startX: number
    startWidth: number
  } {
    return {
      state: { ...state, isResizing: true, dragging: side },
      startX,
      startWidth: side === 'left' ? state.leftWidth : state.rightWidth,
    }
  }

  function moveDrag(
    state: ResizeState,
    startX: number,
    startWidth: number,
    currentX: number,
  ): ResizeState {
    const delta = currentX - startX
    if (state.dragging === 'left') {
      return { ...state, leftWidth: clampLeft(startWidth, delta) }
    } else if (state.dragging === 'right') {
      return { ...state, rightWidth: clampRight(startWidth, delta) }
    }
    return state
  }

  function endDrag(state: ResizeState): ResizeState {
    return { ...state, isResizing: false, dragging: null }
  }

  it('full lifecycle: start → move → end', () => {
    let state = createState()
    expect(state.isResizing).toBe(false)

    // Start dragging left panel at x=224
    const drag = startDrag(state, 'left', 224)
    state = drag.state
    expect(state.isResizing).toBe(true)
    expect(state.dragging).toBe('left')

    // Move to x=274 (delta +50)
    state = moveDrag(state, drag.startX, drag.startWidth, 274)
    expect(state.leftWidth).toBe(274)

    // Release
    state = endDrag(state)
    expect(state.isResizing).toBe(false)
    expect(state.dragging).toBeNull()
    expect(state.leftWidth).toBe(274) // width preserved after end
  })

  it('overlay is shown only during resize', () => {
    let state = createState()
    expect(state.isResizing).toBe(false) // no overlay

    const drag = startDrag(state, 'right', 500)
    state = drag.state
    expect(state.isResizing).toBe(true)  // overlay shown

    state = endDrag(state)
    expect(state.isResizing).toBe(false) // overlay removed
  })

  it('rapid drag does not overshoot bounds', () => {
    let state = createState()
    const drag = startDrag(state, 'left', 200)
    state = drag.state

    // Huge positive delta
    state = moveDrag(state, drag.startX, drag.startWidth, 2000)
    expect(state.leftWidth).toBe(LEFT_MAX)

    // Huge negative delta
    state = moveDrag(state, drag.startX, drag.startWidth, -2000)
    expect(state.leftWidth).toBe(LEFT_MIN)
  })

  it('right panel drag direction is inverted', () => {
    let state = createState()
    const drag = startDrag(state, 'right', 800)
    state = drag.state

    // Drag left (negative delta) → panel gets wider
    state = moveDrag(state, drag.startX, drag.startWidth, 750)
    expect(state.rightWidth).toBeGreaterThan(RIGHT_DEFAULT)

    // Drag right (positive delta) → panel gets narrower
    state = moveDrag(state, drag.startX, drag.startWidth, 850)
    expect(state.rightWidth).toBeLessThan(RIGHT_DEFAULT)
  })
})
