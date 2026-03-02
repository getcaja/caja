// Local asset storage — downloads external images to a local `assets/` directory
// next to the .caja file, using hash-based filenames for dedup.
//
// Persistence: frame.src stores the absolute localPath (survives app restarts).
// Rendering: resolveRenderSrc() maps localPath → blob URL at render time.
// Export: resolveAssetSrc() maps localPath → ./assets/filename.ext for HTML/JSX.

import { writeFile, readFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { join, dirname, appDataDir } from '@tauri-apps/api/path'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

// --- Helpers ---

/** SHA-256 hash of an ArrayBuffer, truncated to 16 hex chars */
async function hashArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/** MIME type from extension */
function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
  }
  return map[ext] || 'image/png'
}

/** Extract file extension from a MIME type */
function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'image/avif': 'avif', 'image/bmp': 'bmp',
    'image/ico': 'ico', 'image/x-icon': 'ico',
  }
  return map[mime] || 'png'
}

/** Extract file extension from a URL path */
function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase()
    if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext
    }
  } catch { /* expected: invalid URL → fallback to empty ext */ }
  return ''
}

// --- Blob URL cache (localPath → blobUrl) ---
// Prevents creating duplicate blob URLs for the same file.
const blobCache = new Map<string, string>()

// --- Asset version (for React re-render on cache changes) ---
// Components call useSyncExternalStore(subscribeAssets, getAssetSnapshot)
// to re-render when blob cache is populated (e.g. after restoreAllAssets).
let assetVersion = 0
const assetListeners = new Set<() => void>()

function bumpAssetVersion() {
  assetVersion++
  assetListeners.forEach(cb => cb())
}

export function subscribeAssets(cb: () => void) {
  assetListeners.add(cb)
  return () => { assetListeners.delete(cb) }
}

export function getAssetSnapshot() {
  return assetVersion
}

/** Create a blob URL from a Uint8Array, revoking any previous blob for the same key */
function createBlobUrl(data: Uint8Array, ext: string, cacheKey?: string): string {
  // Revoke previous blob URL for this key to prevent memory leak
  if (cacheKey) {
    const prev = blobCache.get(cacheKey)
    if (prev) URL.revokeObjectURL(prev)
  }
  const blob = new Blob([data], { type: mimeFromExt(ext) })
  return URL.createObjectURL(blob)
}

/** Revoke all cached blob URLs (e.g. on File > New) */
export function revokeAllBlobUrls(): void {
  for (const url of blobCache.values()) {
    URL.revokeObjectURL(url)
  }
  blobCache.clear()
  bumpAssetVersion()
}

// --- Public API ---

/** Get the assets directory path for a project file */
export function getAssetsDir(projectPath: string): Promise<string> {
  const dir = dirname(projectPath)
  return join(dir, 'assets')
}

/** Get a temporary assets directory (before project is saved) */
export async function getTempAssetsDir(): Promise<string> {
  const appData = await appDataDir()
  return join(appData, 'temp-assets')
}

/** Ensure the assets directory exists, creating it if needed */
export async function ensureAssetsDir(assetsDir: string): Promise<void> {
  if (!(await exists(assetsDir))) {
    await mkdir(assetsDir, { recursive: true })
  }
}

export interface DownloadResult {
  /** Absolute filesystem path to the downloaded file */
  localPath: string
  /** blob: URL for canvas rendering (works in iframes, no CORS) */
  assetUrl: string
}

/**
 * Download an external image URL to the local assets directory.
 * Returns the local path and a blob URL for canvas rendering.
 * If the file already exists (same hash), skips the write (dedup).
 */
export async function downloadAsset(url: string, projectPath: string | null): Promise<DownloadResult> {
  // Determine assets directory
  const assetsDir = projectPath
    ? await getAssetsDir(projectPath)
    : await getTempAssetsDir()

  await ensureAssetsDir(assetsDir)

  // Fetch via Tauri's HTTP plugin (Rust backend — bypasses CORS)
  const response = await tauriFetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  const data = new Uint8Array(buffer)
  const hash = await hashArrayBuffer(buffer)

  // Determine extension from Content-Type or URL
  const contentType = response.headers.get('content-type') || ''
  const ext = extensionFromMime(contentType) || extensionFromUrl(url) || 'png'

  const filename = `${hash}.${ext}`
  const localPath = await join(assetsDir, filename)

  // Write only if not already present (dedup)
  if (!(await exists(localPath))) {
    await writeFile(localPath, data)
  }

  // Create blob URL for canvas (reuse cached if available)
  let assetUrl = blobCache.get(localPath)
  if (!assetUrl) {
    assetUrl = createBlobUrl(data, ext, localPath)
    blobCache.set(localPath, assetUrl)
    bumpAssetVersion()
  }

  return { localPath, assetUrl }
}

/**
 * Restore a blob URL from a local asset path (e.g. after loading a .caja file).
 * Returns the blob URL, or null if the file doesn't exist.
 */
export async function restoreAssetUrl(localPath: string): Promise<string | null> {
  // Check cache first
  const cached = blobCache.get(localPath)
  if (cached) return cached

  try {
    if (!(await exists(localPath))) return null
    const data = await readFile(localPath)
    const ext = localPath.split('.').pop() || 'png'
    const blobUrl = createBlobUrl(data, ext, localPath)
    blobCache.set(localPath, blobUrl)
    bumpAssetVersion()
    return blobUrl
  } catch { /* expected: file missing or unreadable → caller handles null */
    return null
  }
}

/**
 * Check if a URL is an external (http/https) URL that should be downloaded.
 * Returns false for data: URIs, blob: URLs, relative paths, etc.
 */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * Check if a src is a local filesystem path (our managed asset).
 * Matches absolute paths containing /assets/ or /temp-assets/.
 */
export function isLocalAssetPath(src: string): boolean {
  return (src.includes('/assets/') || src.includes('/temp-assets/')) && !src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:')
}

/**
 * Resolve a src for rendering: local filesystem paths → blob URLs.
 * Everything else (http, blob, data, empty) passes through unchanged.
 */
export function resolveRenderSrc(src: string): string {
  if (!src) return src
  if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) return src
  // Local filesystem path — resolve through blob cache
  return blobCache.get(src) || src
}

/**
 * Walk frame trees and restore blob URLs from local asset files into the cache.
 * Called once on app load after loadFromStorage/loadFromFile.
 * Frames with local paths in src will be renderable after this completes.
 */
export async function restoreAllAssets(pages: { root: { type: string; src?: string; children?: any[] } }[]): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) return

  const paths = new Set<string>()
  function walk(frame: { type: string; src?: string; bgImage?: string; children?: any[] }) {
    if (frame.type === 'image' && frame.src && isLocalAssetPath(frame.src)) {
      paths.add(frame.src)
    }
    if (frame.bgImage && isLocalAssetPath(frame.bgImage)) {
      paths.add(frame.bgImage)
    }
    if ('children' in frame && Array.isArray(frame.children)) {
      for (const child of frame.children) walk(child)
    }
  }
  for (const page of pages) walk(page.root)

  // Restore blob URLs from disk in parallel
  await Promise.all([...paths].map(p => restoreAssetUrl(p)))
}

/**
 * Resolve a local asset path to a relative path for export.
 * Handles: absolute filesystem paths, blob URLs (reverse-lookup), asset:// URLs.
 * Falls back to the original src if not a managed asset.
 */
export function resolveAssetSrc(src: string): string {
  // asset://localhost/ URLs (legacy, if any remain)
  const assetMatch = src.match(/asset:\/\/localhost\/.*\/(assets\/[^?]+)/)
  if (assetMatch) return `./${assetMatch[1]}`

  // blob: URLs — reverse-lookup from cache
  if (src.startsWith('blob:')) {
    for (const [path, blobUrl] of blobCache) {
      if (blobUrl === src) {
        const assetsIdx = path.lastIndexOf('/assets/')
        if (assetsIdx !== -1) return `.${path.slice(assetsIdx)}`
        const tempIdx = path.lastIndexOf('/temp-assets/')
        if (tempIdx !== -1) return `./assets/${path.split('/').pop()}`
      }
    }
  }

  // Local filesystem path — extract relative ./assets/filename.ext
  if (isLocalAssetPath(src)) {
    const assetsIdx = src.lastIndexOf('/assets/')
    if (assetsIdx !== -1) return `.${src.slice(assetsIdx)}`
    const tempIdx = src.lastIndexOf('/temp-assets/')
    if (tempIdx !== -1) return `./assets/${src.split('/').pop()}`
  }

  // Already a relative path or external URL — pass through
  return src
}
