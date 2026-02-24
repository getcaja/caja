import type { Frame } from './frame'

export interface Pattern {
  id: string
  name: string
  tags: string[]
  frame: Frame
  meta: {
    author?: string
    library?: string    // which library this pattern belongs to
    version?: string
    description?: string
  }
  createdAt: string // ISO date
}

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
