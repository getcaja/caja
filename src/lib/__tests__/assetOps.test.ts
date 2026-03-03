import { describe, it, expect, vi } from 'vitest'
import { isExternalUrl, isLocalAssetPath, resolveRenderSrc, resolveAssetSrc } from '../assetOps'

// Mock Tauri modules so the module can be imported in a non-Tauri environment.
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}))
vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts: string[]) => parts.join('/')),
  dirname: vi.fn((p: string) => p.split('/').slice(0, -1).join('/')),
  appDataDir: vi.fn(() => Promise.resolve('/Users/me/Library/Application Support/caja')),
}))
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}))

// ---------------------------------------------------------------------------
// isExternalUrl
// ---------------------------------------------------------------------------
describe('isExternalUrl', () => {
  it('returns true for https URLs', () => {
    expect(isExternalUrl('https://example.com/image.png')).toBe(true)
  })

  it('returns true for http URLs', () => {
    expect(isExternalUrl('http://example.com/image.png')).toBe(true)
  })

  it('is case-insensitive (HTTP:// uppercase)', () => {
    expect(isExternalUrl('HTTP://EXAMPLE.COM/img.png')).toBe(true)
  })

  it('returns false for blob: URLs', () => {
    expect(isExternalUrl('blob:http://localhost/some-uuid')).toBe(false)
  })

  it('returns false for data: URIs', () => {
    expect(isExternalUrl('data:image/png;base64,abc123')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isExternalUrl('')).toBe(false)
  })

  it('returns false for absolute filesystem paths', () => {
    expect(isExternalUrl('/path/to/file.png')).toBe(false)
  })

  it('returns false for ftp:// URLs', () => {
    expect(isExternalUrl('ftp://example.com/file.png')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isLocalAssetPath
// ---------------------------------------------------------------------------
describe('isLocalAssetPath', () => {
  it('returns true for absolute path containing /assets/', () => {
    expect(isLocalAssetPath('/Users/me/project/assets/abc123.png')).toBe(true)
  })

  it('returns true for absolute path containing /temp-assets/', () => {
    expect(isLocalAssetPath('/tmp/app/temp-assets/image.jpg')).toBe(true)
  })

  it('returns false for http URL that contains /assets/ in path', () => {
    expect(isLocalAssetPath('https://example.com/assets/image.png')).toBe(false)
  })

  it('returns false for blob: URL', () => {
    expect(isLocalAssetPath('blob:http://example.com/some-uuid')).toBe(false)
  })

  it('returns false for data: URI', () => {
    expect(isLocalAssetPath('data:image/png;base64,abc')).toBe(false)
  })

  it('returns false for absolute path without /assets/ segment', () => {
    expect(isLocalAssetPath('/Users/me/project/images/photo.png')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isLocalAssetPath('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resolveRenderSrc
// ---------------------------------------------------------------------------
// The blob cache inside assetOps is module-private, so we can only observe
// the passthrough and cache-miss behaviours from the outside.
describe('resolveRenderSrc', () => {
  it('returns empty string for empty input', () => {
    expect(resolveRenderSrc('')).toBe('')
  })

  it('passes through blob: URLs unchanged', () => {
    const url = 'blob:http://localhost/1234-5678'
    expect(resolveRenderSrc(url)).toBe(url)
  })

  it('passes through data: URIs unchanged', () => {
    const uri = 'data:image/png;base64,abc123=='
    expect(resolveRenderSrc(uri)).toBe(uri)
  })

  it('passes through https URLs unchanged', () => {
    const url = 'https://example.com/img.png'
    expect(resolveRenderSrc(url)).toBe(url)
  })

  it('passes through http URLs unchanged', () => {
    const url = 'http://example.com/img.png'
    expect(resolveRenderSrc(url)).toBe(url)
  })

  it('returns local path itself when not in blob cache (cache miss)', () => {
    // No blob was ever stored for this path, so it falls back to the path.
    const localPath = '/Users/me/project/assets/not-cached.png'
    expect(resolveRenderSrc(localPath)).toBe(localPath)
  })
})

// ---------------------------------------------------------------------------
// resolveAssetSrc
// ---------------------------------------------------------------------------
describe('resolveAssetSrc', () => {
  it('maps /assets/ path to ./assets/filename.ext', () => {
    expect(resolveAssetSrc('/Users/me/project/assets/abc.png')).toBe('./assets/abc.png')
  })

  it('maps /temp-assets/ path to ./assets/filename.ext', () => {
    expect(resolveAssetSrc('/Users/me/Library/Application Support/caja/temp-assets/abc.png'))
      .toBe('./assets/abc.png')
  })

  it('passes through external https URL', () => {
    const url = 'https://example.com/img.png'
    expect(resolveAssetSrc(url)).toBe(url)
  })

  it('passes through empty string', () => {
    expect(resolveAssetSrc('')).toBe('')
  })

  it('passes through a relative path that is not a managed asset', () => {
    expect(resolveAssetSrc('./relative/path.png')).toBe('./relative/path.png')
  })

  it('handles legacy asset://localhost/ URL with /assets/ segment', () => {
    const legacy = 'asset://localhost/Users/me/project/assets/img.png'
    expect(resolveAssetSrc(legacy)).toBe('./assets/img.png')
  })

  it('passes through a path that lacks /assets/ or /temp-assets/ segment', () => {
    const path = '/Users/me/project/images/photo.png'
    expect(resolveAssetSrc(path)).toBe(path)
  })
})
