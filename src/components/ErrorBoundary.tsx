import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: 'inline' | 'fullpage'
  resetKey?: string | number | null
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  retry = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    const error = this.state.error
    const isFullpage = this.props.fallback === 'fullpage'

    if (isFullpage) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100vw',
          background: 'var(--color-surface-0)', color: 'var(--color-text-primary)', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 480, padding: 32, borderRadius: 12,
            background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: 'var(--color-accent)', color: '#fff', fontSize: 13,
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    // Inline fallback (canvas / panel)
    return (
      <div style={{
        padding: 16, margin: 8, borderRadius: 8,
        background: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)',
        color: '#fca5a5', fontFamily: 'system-ui, sans-serif', fontSize: 13,
      }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Render error</p>
        <p style={{ margin: '0 0 12px', color: '#f87171', lineHeight: 1.4 }}>
          {error.message}
        </p>
        <button
          onClick={this.retry}
          style={{
            padding: '4px 12px', borderRadius: 4,
            border: '1px solid color-mix(in srgb, var(--color-destructive) 30%, transparent)',
            background: 'color-mix(in srgb, var(--color-destructive) 12%, transparent)',
            color: '#fca5a5', fontSize: 12, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }
}
