import type { Frame } from './frame'

export interface Component {
  id: string
  name: string
  tags: string[]
  frame: Frame
  meta: {
    author?: string
    library?: string    // which library this component belongs to
    version?: string
    description?: string
  }
  createdAt: string // ISO date
}

export interface ComponentData {
  items: Component[]
  order: string[]
  categories: string[]
}
