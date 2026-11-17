import React from 'react';

type Props = { children: React.ReactNode };
type State = { failed: boolean; message: string };

/** Prevent an editor rendering error from leaving the user with a blank page. */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, message: error?.message || 'Unexpected editor error.' };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" aria-live="assertive" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#11131b', color: '#f5f6fa', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ width: 'min(100%, 520px)', padding: 24, border: '1px solid #45495a', borderRadius: 16, background: '#1b1e29' }}>
          <h1 style={{ marginTop: 0 }}>حدث خطأ في المحرر</h1>
          <p>لم تتلف ملفات المشروع المحفوظة بالضرورة. أعد تحميل الصفحة للمحاولة مجددًا.</p>
          <details>
            <summary>تفاصيل الخطأ</summary>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{this.state.message}</pre>
          </details>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 18px', border: 0, borderRadius: 10, cursor: 'pointer' }}>إعادة تحميل المحرر</button>
        </section>
      </main>
    );
  }
}
