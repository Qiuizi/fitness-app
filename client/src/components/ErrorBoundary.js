import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || '页面遇到了一个意外问题';

    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--c-red-dim)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--c-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{
          fontSize: 22, fontWeight: 800,
          letterSpacing: '-0.02em', color: 'var(--text-1)',
          margin: '0 0 8px',
        }}>出错了</h2>
        <p style={{
          fontSize: 14, color: 'var(--text-3)',
          margin: '0 0 24px', maxWidth: 360, lineHeight: 1.5,
        }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={this.handleRetry} className="secondary" style={{ padding: '10px 22px', fontSize: 14 }}>重试</button>
          <button onClick={this.handleReload} style={{ padding: '10px 22px', fontSize: 14 }}>返回首页</button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
