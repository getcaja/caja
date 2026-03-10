import { Dialog } from './ui/Dialog'
import { X, Smile, Cpu, Sparkles } from 'lucide-react'

interface WelcomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="c-modal w-[400px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold fg-default">Welcome</h2>
          <button
            className="c-icon-btn w-5 h-5"
            onClick={() => onOpenChange(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Feature highlights */}
        <div className="px-4 py-5 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Smile size={16} className="fg-muted" />
            </div>
            <div>
              <p className="text-[13px] fg-default font-medium">Free & open</p>
              <p className="text-[12px] fg-muted">Caja is free to use, open source and actively developed.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Cpu size={16} className="fg-muted" />
            </div>
            <div>
              <p className="text-[13px] fg-default font-medium">Built-in MCP server</p>
              <p className="text-[12px] fg-muted">Let AI agents build your layouts. Polish on the canvas, or both.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="fg-muted" />
            </div>
            <div>
              <p className="text-[13px] fg-default font-medium">Design with code</p>
              <p className="text-[12px] fg-muted">The same technology that maps to your stack. No translation layer.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex flex-col items-center gap-2">
          <button
            className="w-full py-2 text-[13px] font-medium bg-accent fg-default rounded-lg hover:bg-accent-hover transition-colors"
            onClick={() => onOpenChange(false)}
          >
            Get Started
          </button>
        </div>
      </div>
    </Dialog>
  )
}
