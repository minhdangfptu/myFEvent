import { useState } from 'react';

export default function AIAssistantButton({ onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        borderRadius: '999px',
        background: '#1c9c6d',
        color: '#fff',
        border: 'none',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        zIndex: 1050,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 600,
      }}
      aria-label="AI Assistant"
      type="button"
    >
      <span role="img" aria-hidden="true" style={{ fontSize: '1.25rem' }}>
        🤖
      </span>
      <span>AI Assistant</span>
    </button>
  );
}
