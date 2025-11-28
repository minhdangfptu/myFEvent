import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SupportButton() {
  const [hover, setHover] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Only show for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  const handleClick = () => {
    navigate('/support');
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '96px', // Positioned above AI Assistant button
        zIndex: 1050,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            right: '70px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            pointerEvents: 'none',
          }}
        >
          Hỗ trợ
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              right: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '6px solid #1f2937',
            }}
          />
        </div>
      )}

      {/* Button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '56px',
          height: '66px',
          borderRadius: '50%',
          background: '#e14040ff',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          transform: hover ? 'translateY(-2px) scale(1.05)' : 'none',
          fontSize: '28px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Support"
      >
        ?
      </button>
    </div>
  );
}
