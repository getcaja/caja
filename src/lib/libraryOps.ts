import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists, mkdir, remove, readDir } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import type { ComponentData } from '../store/catalogStore'
import type { LibraryMeta } from '../types/component'

const LIBRARIES_DIR = 'libraries'
const INDEX_FILE = 'library-index.json'

/** .cjl file format — Caja Library */
export interface CjlFileData {
  version: 1
  name: string
  author?: string
  description?: string
  libraryVersion?: string
  patterns: ComponentData
}

// --- Path helpers ---

async function getLibrariesDir(): Promise<string> {
  const base = await appDataDir()
  return join(base, LIBRARIES_DIR)
}

async function getIndexPath(): Promise<string> {
  const base = await appDataDir()
  return join(base, INDEX_FILE)
}

export async function ensureLibrariesDir(): Promise<string> {
  const dir = await getLibrariesDir()
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

// --- Library index persistence ---

export async function loadLibraryIndex(): Promise<LibraryMeta[]> {
  try {
    const indexPath = await getIndexPath()
    if (!(await exists(indexPath))) return []
    const raw = await readTextFile(indexPath)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('Failed to load library index:', err)
    return []
  }
}

export async function saveLibraryIndex(index: LibraryMeta[]): Promise<void> {
  const indexPath = await getIndexPath()
  await writeTextFile(indexPath, JSON.stringify(index, null, 2))
}

// --- Library file operations ---

/** Open file dialog to import a .cjl library. Returns meta + data, or null if cancelled. */
export async function importLibrary(): Promise<{ meta: LibraryMeta; data: ComponentData } | null> {
  const path = await open({
    filters: [{ name: 'Caja Library', extensions: ['cjl'] }],
    multiple: false,
    directory: false,
  })
  if (!path) return null

  const content = await readTextFile(path)
  const parsed = JSON.parse(content) as CjlFileData

  if (!parsed.patterns || !parsed.name) {
    throw new Error('Invalid .cjl file: missing name or patterns')
  }

  const id = crypto.randomUUID()
  const fileName = `${id}.cjl`

  // Copy to app data dir
  const dir = await ensureLibrariesDir()
  const destPath = await join(dir, fileName)
  await writeTextFile(destPath, content)

  const meta: LibraryMeta = {
    id,
    name: parsed.name,
    author: parsed.author,
    version: parsed.libraryVersion,
    description: parsed.description,
    importedAt: new Date().toISOString(),
    filePath: fileName,
  }

  return { meta, data: parsed.patterns }
}

/** Export internal patterns as a .cjl library file. Returns the save path or null if cancelled. */
export async function exportLibrary(
  data: ComponentData,
  meta: { name: string; author?: string; description?: string; version?: string }
): Promise<string | null> {
  const path = await save({
    filters: [{ name: 'Caja Library', extensions: ['cjl'] }],
    defaultPath: `${meta.name.toLowerCase().replace(/\s+/g, '-')}.cjl`,
  })
  if (!path) return null

  const cjl: CjlFileData = {
    version: 1,
    name: meta.name,
    author: meta.author,
    description: meta.description,
    libraryVersion: meta.version,
    patterns: data,
  }

  await writeTextFile(path, JSON.stringify(cjl, null, 2))
  return path
}

/** Save (overwrite) a .cjl library file to a known path — no file dialog. */
export async function saveLibrary(
  data: ComponentData,
  meta: { name: string; author?: string; description?: string; version?: string },
  path: string
): Promise<void> {
  const cjl: CjlFileData = {
    version: 1,
    name: meta.name,
    author: meta.author,
    description: meta.description,
    libraryVersion: meta.version,
    patterns: data,
  }
  await writeTextFile(path, JSON.stringify(cjl, null, 2))
}

/** Load library data from app data dir by meta. */
export async function loadLibraryData(meta: LibraryMeta): Promise<ComponentData> {
  const dir = await getLibrariesDir()
  const filePath = await join(dir, meta.filePath)
  const content = await readTextFile(filePath)
  const parsed = JSON.parse(content) as CjlFileData
  return parsed.patterns
}

/** Remove a library file from app data dir. */
export async function removeLibraryFile(meta: LibraryMeta): Promise<void> {
  try {
    const dir = await getLibrariesDir()
    const filePath = await join(dir, meta.filePath)
    if (await exists(filePath)) {
      await remove(filePath)
    }
  } catch (err) {
    console.warn('Failed to remove library file:', err)
  }
}

/** List .cjl files in the libraries directory (for debugging/recovery). */
export async function listLibraryFiles(): Promise<string[]> {
  try {
    const dir = await getLibrariesDir()
    if (!(await exists(dir))) return []
    const entries = await readDir(dir)
    return entries
      .filter((e) => e.name?.endsWith('.cjl'))
      .map((e) => e.name!)
  } catch (err) {
    console.warn('Failed to list library files:', err)
    return []
  }
}

/** Rebuild library index from .cjl files on disk — recovery for empty/corrupt index. */
export async function rebuildLibraryIndex(): Promise<LibraryMeta[]> {
  const files = await listLibraryFiles()
  if (files.length === 0) return []

  const dir = await getLibrariesDir()
  const byName = new Map<string, LibraryMeta>()

  for (const fileName of files) {
    try {
      const filePath = await join(dir, fileName)
      const content = await readTextFile(filePath)
      const parsed = JSON.parse(content) as CjlFileData
      if (!parsed.name || !parsed.patterns) continue

      const id = fileName.replace('.cjl', '')
      const meta: LibraryMeta = {
        id,
        name: parsed.name,
        author: parsed.author,
        version: parsed.libraryVersion,
        description: parsed.description,
        importedAt: new Date().toISOString(),
        filePath: fileName,
      }
      // Dedupe by name — keep last
      byName.set(parsed.name, meta)
    } catch (err) {
      console.warn(`Skipping corrupt library file ${fileName}:`, err)
    }
  }

  return Array.from(byName.values())
}
