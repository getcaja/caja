import type { Frame } from './frame'

export interface Snippet {
  id: string
  name: string
  tags: string[]
  frame: Frame
  meta: {
    author?: string
    pack?: string
    version?: string
  }
  createdAt: string // ISO date
}
