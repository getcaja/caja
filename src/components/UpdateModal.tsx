import { useState } from 'react'
import { Dialog } from './ui/Dialog'
import { X, Download, RotateCcw } from 'lucide-react'
import type { UpdateInfo } from '../lib/updater'

interface UpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  update: UpdateInfo | null
}

/** Simple markdown-ish renderer for changelog text (headers, bullets, bold) */
function ChangelogBody({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        const trimmed = line.trimStart()
        if (trimmed.startsWith('## ')) {
          return <p key={i} className="text-[12px] fg-default font-semibold mt-2 first:mt-0">{trimmed.slice(3)}</p>
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return <p key={i} className="text-[12px] fg-muted pl-2">• {trimmed.slice(2)}</p>
        }
        if (trimmed === '') return null
        return <p key={i} className="text-[12px] fg-muted">{trimmed}</p>
      })}
    </div>
  )
}

export function UpdateModal({ open, onOpenChange, update }: UpdateModalProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  if (!update) return null

  const handleUpdate = async () => {
    setStatus('downloading')
    setProgress(0)
    setError(null)
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          setProgress(0)
        } else if (event.event === 'Progress') {
          setProgress((p) => p + (event.data.chunkLength ?? 0))
        } else if (event.event === 'Finished') {
          setProgress(100)
        }
      })
      setStatus('ready')
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }

  const handleRelaunch = async () => {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  }

  const handleClose = () => {
    if (status === 'downloading') return // don't close while downloading
    onOpenChange(false)
    // Reset state for next open
    setStatus('idle')
    setProgress(0)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <div className="c-modal w-[400px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold fg-default">
            {status === 'ready' ? 'Update Installed' : `Update Available — v${update.version}`}
          </h2>
          {status !== 'downloading' && (
            <button className="c-icon-btn w-5 h-5" onClick={handleClose}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Changelog */}
        {update.body && (
          <div className="px-4 py-4 max-h-[300px] overflow-y-auto border-b border-border">
            <ChangelogBody text={update.body} />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 flex flex-col gap-2">
          {status === 'idle' && (
            <button
              className="w-full py-2 text-[13px] font-medium bg-accent fg-default rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              onClick={handleUpdate}
            >
              <Download size={12} />
              Download & Install
            </button>
          )}

          {status === 'downloading' && (
            <div className="flex flex-col gap-2">
              <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: progress > 0 ? `${Math.min((progress / (update.contentLength || progress + 1)) * 100, 100)}%` : '30%' }}
                />
              </div>
              <p className="text-[11px] fg-muted text-center">Downloading...</p>
            </div>
          )}

          {status === 'ready' && (
            <button
              className="w-full py-2 text-[13px] font-medium bg-accent fg-default rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              onClick={handleRelaunch}
            >
              <RotateCcw size={12} />
              Restart Now
            </button>
          )}

          {status === 'error' && (
            <>
              <p className="text-[11px] text-destructive text-center">{error}</p>
              <button
                className="w-full py-2 text-[13px] font-medium bg-accent fg-default rounded-lg hover:bg-accent-hover transition-colors"
                onClick={() => { setStatus('idle'); setError(null) }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
