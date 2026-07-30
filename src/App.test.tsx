import React from 'react';

export default function App() {
  return (
    <div style={{ 
      padding: '40px', 
      color: 'white', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>CodeMate AI - Test Render</h1>
      <p>If you can see this, React is working!</p>
      <button 
        onClick={() => alert('Button works!')}
        style={{
          padding: '12px 24px',
          background: '#0ea5e9',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Click Me
      </button>
    </div>
  );
}
