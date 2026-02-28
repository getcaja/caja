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

/** Backward-compatible alias — Pattern is the same shape as Component */
export type Pattern = Component

/** Lightweight metadata for an installed library (persisted in library-index.json) */
export interface LibraryMeta {
  id: string
  name: string
  author?: string
  version?: string
  description?: string
  importedAt: string   // ISO date
  filePath: string     // path within app data dir
}

export interface ComponentData {
  items: Component[]
  order: string[]
  categories: string[]
}

/** Backward-compatible alias */
export type PatternData = ComponentData
