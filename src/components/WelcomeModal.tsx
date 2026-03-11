import { Dialog } from './ui/Dialog'
import { X, Smile, Cpu, Sparkles, Bug } from 'lucide-react'

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
          <div className="flex items-start gap-3">
            <Smile size={16} className="fg-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] fg-default font-medium">Free & open</p>
              <p className="text-[12px] fg-muted">Caja is free to use, open source and actively developed.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Cpu size={16} className="fg-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] fg-default font-medium">Built for you and agents</p>
              <p className="text-[12px] fg-muted">Design by hand, delegate to AI via MCP, or mix both. You're always in control.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sparkles size={16} className="fg-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] fg-default font-medium">Same engine, no translation</p>
              <p className="text-[12px] fg-muted">The canvas is the browser. Real HTML, real CSS, simplified by Tailwind.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Bug size={16} className="fg-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] fg-default font-medium">Early release</p>
              <p className="text-[12px] fg-muted">This is an early version that may contain bugs. Feel free to report them on <a href="https://github.com/getcaja/caja/issues" target="_blank" rel="noopener noreferrer" className="underline fg-accent-text">GitHub</a>.</p>
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
