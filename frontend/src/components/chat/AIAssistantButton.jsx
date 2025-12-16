import { useState } from 'react';
import { Bot } from 'lucide-react';

export default function FeAI({ onClick }) {
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
        background: '#dc2626',
        color: '#fff',
        border: 'none',
        boxShadow: '0 10px 20px rgba(220, 38, 38, 0.3)',
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
      aria-label="Trợ lý feAI"
      type="button"
    >
      <Bot size={20} />
      <span>Trợ lý feAI</span>
    </button>
  );
}
