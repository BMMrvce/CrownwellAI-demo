import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-lg border border-red-600 bg-red-900/20 text-red-200">
          <h2 className="text-lg font-semibold mb-2">Something went wrong.</h2>
          <p className="text-sm mb-3">The component crashed. Please collapse any open tool panels or try again.</p>
          <button
            className="px-3 py-2 rounded bg-slate-800 text-slate-100 border border-slate-700"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
