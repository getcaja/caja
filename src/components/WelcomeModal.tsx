import { Dialog } from './ui/Dialog'
import { X, Smile, Cpu, Sparkles } from 'lucide-react'

interface WelcomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-surface-1 border border-border rounded-xl w-[400px] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold text-text-primary">Welcome</h2>
          <button
            className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-secondary rounded transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Feature highlights */}
        <div className="px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Smile size={16} className="text-text-muted" />
            </div>
            <div>
              <p className="text-[13px] text-text-primary font-medium">Free & open</p>
              <p className="text-[12px] text-text-secondary">Caja is free to use. Build layouts visually, export clean Tailwind code.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Cpu size={16} className="text-text-muted" />
            </div>
            <div>
              <p className="text-[13px] text-text-primary font-medium">Built-in MCP server</p>
              <p className="text-[12px] text-text-secondary">Collaborate with AI agents. They can read, create, and modify your designs in real time.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-text-muted" />
            </div>
            <div>
              <p className="text-[13px] text-text-primary font-medium">Design is code</p>
              <p className="text-[12px] text-text-secondary">Every property maps to a Tailwind class. What you see is what you ship.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex flex-col items-center gap-2">
          <button
            className="w-full py-2 text-[13px] font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            onClick={() => onOpenChange(false)}
          >
            Get Started
          </button>
          <a
            href="https://buymeacoffee.com/miguelinskey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
          >
            Buy me a coffee ☕
          </a>
        </div>
      </div>
    </Dialog>
  )
}
