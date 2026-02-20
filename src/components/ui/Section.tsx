export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-3 mb-3">
      <div className="mb-2">
        <span className="c-section-title">{title}</span>
      </div>
      {children}
    </div>
  )
}
