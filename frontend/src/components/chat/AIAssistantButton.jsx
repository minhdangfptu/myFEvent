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
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#dc2626',
        color: 'white',
        border: 'none',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        zIndex: 1050,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
      aria-label="AI Assistant"
    >
      <i className="bi bi-robot" style={{ fontSize: '1.5rem' }}></i>
    </button>
  );
}


