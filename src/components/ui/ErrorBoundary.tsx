import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto grid min-h-dvh max-w-120 place-items-center px-4 text-center">
        <div>
          <div className="text-5xl">🙈</div>
          <p className="mt-3 text-ink">משהו השתבש.</p>
          <button onClick={() => location.reload()} className="mt-4 min-h-12 rounded-2xl bg-white px-6 shadow-soft">
            טעינה מחדש
          </button>
        </div>
      </div>
    )
  }
}
