import { Component } from 'react'

/** Catches render errors so a bug in one screen shows a recovery message instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // Details stay in the console; the user sees a generic message.
    console.error('Unhandled UI error:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-24 max-w-lg px-4">
        <h1 className="t-h1">Something went wrong</h1>
        <p className="t-body mt-4">An unexpected error occurred in the interface. Nothing you saved on the server is affected.</p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="press mt-6 inline-flex h-10 items-center rounded-md bg-signal px-4 text-sm font-medium text-ink-0 hover:bg-signal-strong"
        >
          Back to the overview
        </button>
      </div>
    )
  }
}
