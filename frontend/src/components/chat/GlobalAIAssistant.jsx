import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import FeAI from './AIAssistantButton';
import AIAssistantModal from './AIAssistantModal';
import { getEventIdFromUrl } from '../../utils/getEventIdFromUrl';
import { useAuth } from '../../contexts/AuthContext';

export default function GlobalAIAssistant() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Chỉ hiển thị khi người dùng đã đăng nhập và context đã load xong
  if (loading || !isAuthenticated) {
    return null;
  }

  // Hide on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Lấy eventId từ URL (hỗ trợ cả query param và path param)
  const eventId = getEventIdFromUrl(location.pathname, location.search);

  return (
    <>
      <FeAI onClick={() => setIsOpen(true)} />
      <AIAssistantModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        eventId={eventId}
      />
    </>
  );
}

