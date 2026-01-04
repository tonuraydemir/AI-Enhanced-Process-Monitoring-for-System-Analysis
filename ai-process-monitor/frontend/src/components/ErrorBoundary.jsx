import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can also log the error to an error reporting service
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
    try { window?.location?.reload(); } catch (_) {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong rendering the app.</h1>
            <p style={{ opacity: 0.8, marginBottom: 16 }}>
              The UI crashed due to a runtime error. See details below and share them with us.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#111827', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
{(this.state.error?.message || 'Unknown error')}
{this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
{this.state.info?.componentStack ? `\n\nComponent stack:${this.state.info.componentStack}` : ''}
            </pre>
            <button onClick={this.handleReset} style={{ marginTop: 16, padding: '8px 12px', background: '#2563eb', borderRadius: 6 }}>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
