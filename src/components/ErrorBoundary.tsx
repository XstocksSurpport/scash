import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: string | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message || '页面加载失败' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="admin-shell">
          <div className="admin-login">
            <div className="admin-title">页面加载失败</div>
            <p className="import-tip">{this.state.error}</p>
            <button type="button" className="swap-action-btn ready" onClick={() => window.location.reload()}>
              刷新重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
