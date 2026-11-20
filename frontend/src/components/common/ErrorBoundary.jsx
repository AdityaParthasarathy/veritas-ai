import { Component } from 'react'

/** Catches render errors so a bug in one page shows a recovery message instead of a blank screen. */
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
      <div role="alert" className="mx-auto mt-16 max-w-md rounded-xl border border-veritas-error/30 bg-veritas-error-light p-6 text-center">
        <h1 className="text-lg font-semibold text-veritas-text">Something went wrong</h1>
        <p className="mt-2 text-sm text-veritas-muted">An unexpected error occurred in the interface. Your data on the server is unaffected.</p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-4 rounded-lg bg-veritas-primary-solid px-4 py-2 text-sm font-medium text-white hover:bg-veritas-primary-solid-hover"
        >
          Back to overview
        </button>
      </div>
    )
  }
}
