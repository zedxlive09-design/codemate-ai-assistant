import React, { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

// Try importing each component with error handling
const importWithFallback = (importFn: () => any, name: string) => {
  try {
    return importFn();
  } catch (e) {
    console.error(`Failed to import ${name}:`, e);
    return null;
  }
};

// Lazy load components
const Sidebar = React.lazy(() => import('./components/Sidebar').then(m => ({ default: m.default })));
const ChatArea = React.lazy(() => import('./components/ChatArea').then(m => ({ default: m.default })));
const FileExplorer = React.lazy(() => import('./components/FileExplorer').then(m => ({ default: m.default })));
const SettingsPanel = React.lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.default })));
const ModelManager = React.lazy(() => import('./components/ModelManager').then(m => ({ default: m.default })));

function Loading({ name }: { name: string }) {
  return <div style={{ padding: '10px', color: '#94a3b8' }}>Loading {name}...</div>;
}

export default function App() {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Log any uncaught errors
    const handleError = (e: ErrorEvent) => {
      setErrors(prev => [...prev, `${e.message}`]);
      console.error('Global error:', e.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Show any global errors */}
      {errors.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#7f1d1d',
          color: '#fca5a5',
          padding: '16px',
          zIndex: 9999,
          fontSize: '14px'
        }}>
          <strong>Global Errors:</strong>
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>CodeMate AI</h1>
          <span style={{ 
            fontSize: '11px', 
            padding: '2px 8px', 
            background: 'rgba(139, 92, 246, 0.2)', 
            color: '#c4b5fd',
            borderRadius: '999px'
          }}>
            v2.2 Debug Mode
          </span>
        </div>
      </header>

      {/* Main content area - below header */}
      <div style={{ 
        marginTop: '56px', 
        width: '100%', 
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Test each component individually */}
        <ErrorBoundary name="Sidebar">
          <React.Suspense fallback={<Loading name="Sidebar" />}>
            <Sidebar />
          </React.Suspense>
        </ErrorBoundary>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <ErrorBoundary name="ChatArea">
            <React.Suspense fallback={<Loading name="ChatArea" />}>
              <ChatArea />
            </React.Suspense>
          </ErrorBoundary>
        </main>

        {/* Status bar */}
        <footer style={{
          height: '28px',
          borderTop: '1px solid rgba(51, 65, 85, 0.5)',
          background: 'rgba(15, 23, 42, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <span>● Ready</span>
          <span>Debug Mode Active</span>
        </footer>
      </div>
    </div>
  );
}
