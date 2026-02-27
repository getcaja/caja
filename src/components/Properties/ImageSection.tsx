import { useState } from 'react'
import type { ImageElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ToggleGroup } from '../ui/ToggleGroup'
import { isExternalUrl, isLocalAssetPath, downloadAsset } from '../../lib/assetOps'

export function ImageSection({ frame }: { frame: ImageElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const filePath = useFrameStore((s) => s.filePath)
  const [downloading, setDownloading] = useState(false)

  const handleSrcBlur = async () => {
    if (!isExternalUrl(frame.src) || downloading) return
    setDownloading(true)
    try {
      const { localPath } = await downloadAsset(frame.src, filePath)
      updateFrame(frame.id, { src: localPath })
    } catch (err) {
      console.warn('Image download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Section title="Image">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Source</span>
          <div className="relative flex-1">
            {isLocalAssetPath(frame.src) ? (
              <div className="flex items-center gap-1">
                <span className="flex-1 c-input text-text-muted truncate" title={frame.src}>
                  {frame.src.split('/').pop()}
                </span>
                <button
                  className="shrink-0 text-[10px] text-text-muted hover:text-text-primary"
                  onClick={() => updateFrame(frame.id, { src: '' })}
                  title="Remove image"
                >
                  Clear
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={frame.src}
                  onChange={(e) => updateFrame(frame.id, { src: e.target.value })}
                  onBlur={handleSrcBlur}
                  placeholder="https://..."
                  className="w-full c-input"
                />
                {downloading && (
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted animate-pulse">
                    Downloading...
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Alt</span>
          <input
            type="text"
            value={frame.alt}
            onChange={(e) => updateFrame(frame.id, { alt: e.target.value })}
            placeholder="Description..."
            className="flex-1 c-input"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Fit</span>
          <ToggleGroup
            value={frame.objectFit}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'fill', label: 'Fill' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => updateFrame(frame.id, { objectFit: v as ImageElement['objectFit'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
