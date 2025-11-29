import { useState, useEffect, useRef } from 'react';
import { aiApi } from '~/apis/aiApi';
import { toast } from 'react-toastify';

const STORAGE_PREFIX = 'ai-chat:';
const getStorageKey = (eventId) => `${STORAGE_PREFIX}${eventId}`;

const serializeMessages = (messages) =>
  (messages || []).map((msg) => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
      ? (msg.timestamp instanceof Date ? msg.timestamp.toISOString() : new Date(msg.timestamp).toISOString())
      : new Date().toISOString(),
    data: msg.data,
    isError: msg.isError,
  }));

const deserializeMessages = (messages) =>
  Array.isArray(messages)
    ? messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        data: msg.data,
        isError: msg.isError,
      }))
    : [];

const formatEventContext = (info) => {
  if (!info) {
    return '';
  }

  if (typeof info === 'string') {
    return info;
  }

  const getFirstAvailable = (...keys) => {
    for (const key of keys) {
      if (info[key]) return info[key];
    }
    return '';
  };

  const eventName = getFirstAvailable('event_name', 'eventName', 'name');
  const eventType = getFirstAvailable('event_type', 'eventType');
  const venue = getFirstAvailable('venue', 'location');
  const eventDate = getFirstAvailable('event_date', 'eventDate', 'timeline');
  const headcount = getFirstAvailable('headcount_total', 'headcountTotal', 'headCount');
  const departments = info.departments || info.departmentNames;

  const lines = [];

  if (eventName) lines.push(`Tên sự kiện: ${eventName}`);
  if (eventType) lines.push(`Loại sự kiện: ${eventType}`);
  if (venue) lines.push(`Địa điểm: ${venue}`);
  if (eventDate) lines.push(`Thời gian: ${eventDate}`);
  if (headcount) lines.push(`Quy mô tham dự: ${headcount}`);
  if (Array.isArray(departments) && departments.length > 0) {
    lines.push(`Các ban phụ trách: ${departments.join(', ')}`);
  }

  return lines.join('\n');
};

const resolveEventContextFromConversation = (conversation) => {
  if (!conversation) return '';
  const extractedInfo =
    conversation?.wbsData?.extracted_info ||
    conversation?.extracted_info ||
    conversation?.currentEvent;
  return formatEventContext(extractedInfo);
};

export default function AIChatAssistant({ eventId, onWBSGenerated, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [wbsData, setWbsData] = useState(null);
  const [sessions, setSessions] = useState([]); // [{sessionId, title, updatedAt}]
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // show loader until all data ready
  const [hasHydratedFromStorage, setHasHydratedFromStorage] = useState(false);
  const messagesEndRef = useRef(null);
  const titleCacheRef = useRef(new Map()); // sessionId -> title (cache to avoid repeat fetch)
  const [openMenuId, setOpenMenuId] = useState(null); // kebab menu per session
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameSessionId, setRenameSessionId] = useState(null);
  const eventContextRef = useRef('');

  const generateTitleFromText = (text) => {
    if (!text || typeof text !== 'string') return 'Cuộc trò chuyện mới';
    const words = text.trim().split(/\s+/);
    const firstFive = words.slice(0, 5).join(' ');
    return words.length > 5 ? `${firstFive} ...` : firstFive;
  };

  useEffect(() => {
    // Load session list
    if (!eventId) return;
    setIsLoadingSessions(true);
    setIsInitializing(true);
    const dedupeAndSort = (arr) => {
      const map = new Map();
      (arr || []).forEach((s) => {
        const id = String(s.sessionId || s.session_id || s.id || s._id);
        const prev = map.get(id);
        if (!prev) {
          map.set(id, s);
        } else {
          const a = new Date(prev.updatedAt || 0).getTime();
          const b = new Date(s.updatedAt || 0).getTime();
          map.set(id, b >= a ? s : prev);
        }
      });
      const list = Array.from(map.values());
      list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      return list;
    };
    aiApi
      .getConversationHistory(eventId)
      .then((res) => {
        // Expect res.data or res depending on backend; normalize
        const list = res?.data || res?.conversations || res || [];
        const normalized = Array.isArray(list) ? list : [];
        const deduped = dedupeAndSort(normalized);
        // Prime cache with any existing titles from backend to avoid losing names on refresh
        deduped.forEach((s) => {
          const id = String(s.sessionId || s.session_id || s.id || s._id);
          const existingTitle = s.title || s.name;
          if (existingTitle && String(existingTitle).trim().length > 0 && !titleCacheRef.current.get(id)) {
            titleCacheRef.current.set(id, existingTitle);
          }
        });
        // Hydrate titles first, then render one-shot to avoid flicker
        hydrateMissingTitlesAtomic(deduped).then((hydrated) => {
          const finalList = Array.isArray(hydrated) ? dedupeAndSort(hydrated) : dedupeAndSort(deduped);
          setSessions(finalList);
          setIsInitializing(false);
        }).catch(() => {
          setSessions(deduped);
          setIsInitializing(false);
        });
      })
      .catch(() => setSessions([]))
      .finally(() => setIsLoadingSessions(false));
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setSessionId(null);
      setMessages([]);
      eventContextRef.current = '';
      setHasHydratedFromStorage(true);
      return;
    }

    setHasHydratedFromStorage(false);

    if (typeof window === 'undefined' || !window.sessionStorage) {
      setSessionId(null);
      setMessages([]);
      setHasHydratedFromStorage(true);
      return;
    }

    try {
      const stored = window.sessionStorage.getItem(getStorageKey(eventId));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          const restoredSessionId = parsed.sessionId || null;
          const restoredMessages = deserializeMessages(parsed.messages);
          setSessionId(restoredSessionId);
          setMessages(restoredMessages);
          eventContextRef.current = parsed.eventContext || '';
          if (!eventContextRef.current) {
            const firstUser = restoredMessages.find((m) => m.role === 'user');
            if (firstUser?.content) {
              eventContextRef.current = firstUser.content;
            }
          }
        } else {
          setSessionId(null);
          setMessages([]);
          eventContextRef.current = '';
        }
      } else {
        setSessionId(null);
        setMessages([]);
        eventContextRef.current = '';
      }
    } catch (error) {
      console.warn('Failed to hydrate AI chat from sessionStorage:', error);
      setSessionId(null);
      setMessages([]);
      eventContextRef.current = '';
    } finally {
      setHasHydratedFromStorage(true);
    }
  }, [eventId]);

  // One-shot hydrate: wait for all titles, then return hydrated list
  const hydrateMissingTitlesAtomic = async (sessionList) => {
    if (!Array.isArray(sessionList) || sessionList.length === 0) return;
    const itemsNeedingTitle = sessionList.filter((s) => {
      const title = s?.title || s?.name;
      const id = String(s.sessionId || s.session_id || s.id || s._id);
      const cached = titleCacheRef.current.get(id);
      return (!title || String(title).trim().length === 0) && !cached;
    });
    if (itemsNeedingTitle.length === 0) return;
    // Concurrency to speed up but return in one final list
    const CONCURRENCY = 8;
    const queue = [...itemsNeedingTitle];
    const results = [];
    const workers = new Array(CONCURRENCY).fill(null).map(async () => {
      while (queue.length > 0) {
        const s = queue.shift();
        if (!s) break;
        const id = s.sessionId || s.session_id || s.id || s._id;
        try {
          const res = await aiApi.getConversationBySession(eventId, id);
          const convo = res?.data || res || {};
          const msgs = convo.messages || [];
          const firstUser = msgs.find((m) => (m.role || m.sender) === 'user') || msgs[0];
          const title = firstUser ? generateTitleFromText(firstUser.content || firstUser.message || '') : 'Cuộc trò chuyện';
          const key = String(id);
          titleCacheRef.current.set(key, title);
          results.push({ id: key, title });
        } catch {
          const key = String(id);
          const fallback = 'Cuộc trò chuyện';
          titleCacheRef.current.set(key, fallback);
          results.push({ id: key, title: fallback });
        }
      }
    });
    await Promise.all(workers);
    // Produce hydrated array
    const hydrated = sessionList.map((s) => {
      const sid = String(s.sessionId || s.session_id || s.id || s._id);
      const existingTitle = s.title || s.name;
      const cached = titleCacheRef.current.get(sid);
      const found = results.find((r) => r.id === sid);
      // Prefer cache, then existing title, then found result
      const finalTitle = cached || existingTitle || (found ? found.title : undefined);
      if (finalTitle && !cached) {
        titleCacheRef.current.set(sid, finalTitle);
      }
      return finalTitle ? { ...s, title: finalTitle } : s;
    });
    return hydrated;
  };

  useEffect(() => {
    // If no session selected, show greeting
    if (!hasHydratedFromStorage) return;
    if (!sessionId) {
      setMessages((current) => {
        if (current && current.length > 0) return current;
        return [
          {
            role: 'assistant',
            content:
              'Xin chào! 👋 Tôi là AI Assistant giúp bạn lập kế hoạch và quản lý sự kiện.\n\nTôi có thể giúp bạn:\n• Tạo WBS (Work Breakdown Structure) cho sự kiện\n• Phân công công việc theo từng ban\n• Phân tích rủi ro và đề xuất giải pháp\n\nBạn muốn bắt đầu bằng cách nào?',
            timestamp: new Date(),
          },
        ];
      });
    }
  }, [sessionId, hasHydratedFromStorage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSession = async (selectedSessionId) => {
    if (!eventId || !selectedSessionId) return;
    if (selectedSessionId === sessionId) return;
    setIsLoading(true);
    try {
      const res = await aiApi.getConversationBySession(eventId, selectedSessionId);
      const convo = res?.data || res || {};
      const resolvedContext = resolveEventContextFromConversation(convo);
      const msgs = (convo.messages || []).map((m) => ({
        role: m.role || m.sender || 'assistant',
        content: m.content || m.message || '',
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
      setMessages(msgs);
      setSessionId(selectedSessionId);
      if (resolvedContext) {
        eventContextRef.current = resolvedContext;
      } else {
        const firstUserMsg = msgs.find((m) => m.role === 'user');
        if (firstUserMsg?.content) {
          eventContextRef.current = firstUserMsg.content;
        }
      }
      // Backfill session title if missing: use first user message
      const firstUserMsg = msgs.find((m) => m.role === 'user');
      if (firstUserMsg) {
        setSessions((prev) => {
          const idStr = String(selectedSessionId);
          const exists = prev.find((s) => String(s.sessionId || s.session_id || s.id || s._id) === idStr);
          if (!exists) return prev;
          return prev.map((s) => {
            const sid = String(s.sessionId || s.session_id || s.id || s._id);
            if (sid !== idStr) return s;
            const currentTitle = s.title || s.name;
            if (currentTitle && currentTitle.trim().length > 0) return s;
            const derived = generateTitleFromText(firstUserMsg.content);
            // persist into cache so other renders use the correct title for this session only
            titleCacheRef.current.set(idStr, derived);
            return { ...s, title: derived };
          });
        });
      }
    } catch (e) {
      toast.error('Không tải được lịch sử cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (typeof window !== 'undefined' && window.sessionStorage && eventId) {
      window.sessionStorage.removeItem(getStorageKey(eventId));
    }
    setSessionId(null); // backend sẽ tạo session mới khi gửi tin nhắn đầu tiên
    eventContextRef.current = '';
    setMessages([
      {
        role: 'assistant',
        content:
          'Đã tạo cuộc trò chuyện mới. Bạn muốn tôi hỗ trợ gì trong cuộc trò chuyện này?',
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!eventContextRef.current) {
      eventContextRef.current = inputMessage;
    }

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const messageToSend =
        sessionId && eventContextRef.current
          ? `Ngữ cảnh sự kiện hiện tại:\n${eventContextRef.current}\n\nYêu cầu cập nhật:\n${inputMessage}`
          : inputMessage;

      const response = await aiApi.chat(eventId, messageToSend, sessionId);
      
      if (response.success && response.data) {
        const aiResponse = {
          role: 'assistant',
          content: response.data.message || '',
          timestamp: new Date(),
          data: response.data,
        };

        setMessages((prev) => [...prev, aiResponse]);

        // Update session ID
        const returnedSessionId =
          response.data.session_id ||
          response.data.sessionId ||
          response.data.sessionID ||
          response.data.session ||
          response.data.id;

        if (returnedSessionId) {
          const normalizedSessionId = String(returnedSessionId);
          setSessionId(normalizedSessionId);
          // Refresh the entire session list and hydrate titles atomically to avoid duplicates/flicker
          aiApi.getConversationHistory(eventId)
            .then(async (res) => {
              const list = res?.data || res?.conversations || res || [];
              const normalized = Array.isArray(list) ? list : [];
              // Pre-cache title for the newly created session to avoid extra fetch
              const newId = normalizedSessionId;
              if (!titleCacheRef.current.get(newId)) {
                titleCacheRef.current.set(newId, generateTitleFromText(userMessage.content));
              }
              // Dedupe before hydrate
              const dedupeAndSort = (arr) => {
                const map = new Map();
                (arr || []).forEach((s) => {
                  const id = String(s.sessionId || s.session_id || s.id || s._id);
                  const prev = map.get(id);
                  if (!prev) {
                    map.set(id, s);
                  } else {
                    const a = new Date(prev.updatedAt || 0).getTime();
                    const b = new Date(s.updatedAt || 0).getTime();
                    map.set(id, b >= a ? s : prev);
                  }
                });
                const list = Array.from(map.values());
                list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
                return list;
              };
              const deduped = dedupeAndSort(normalized);
              // Prime cache with existing titles (if any) to avoid losing previous names
              deduped.forEach((s) => {
                const id = String(s.sessionId || s.session_id || s.id || s._id);
                const existingTitle = s.title || s.name;
                if (existingTitle && String(existingTitle).trim().length > 0 && !titleCacheRef.current.get(id)) {
                  titleCacheRef.current.set(id, existingTitle);
                }
              });
              const hydrated = await hydrateMissingTitlesAtomic(deduped);
              const finalList = Array.isArray(hydrated) ? dedupeAndSort(hydrated) : deduped;
              setSessions(finalList);
            })
            .catch(() => {
              // Fallback: keep current sessions; do not inject synthetic items to avoid duplicates
            });
        }

        // Check if WBS is generated
        if (response.data.wbs || response.data.state === 'planning_complete') {
          setWbsData(response.data);
          if (onWBSGenerated) {
            onWBSGenerated(response.data);
          }
        }

        // Update event context using extracted info if available
        const extractedInfo =
          response.data.extracted_info ||
          response.data.wbs?.extracted_info ||
          response.data.metadata?.extracted_info;
        const formattedContext = formatEventContext(extractedInfo);
        if (formattedContext) {
          eventContextRef.current = formattedContext;
        }
      } else {
        throw new Error(response.message || 'Lỗi khi chat với AI');
      }
    } catch (error) {
      console.error('Error chatting with AI:', error);
      
      // Extract error message from response
      let errorMessage = 'Lỗi khi chat với AI';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      const errorMessageObj = {
        role: 'assistant',
        content: `Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn.\n\n${errorMessage}\n\nVui lòng kiểm tra:\n• AI service có đang chạy không\n• Kết nối mạng có ổn định không\n• Thử lại sau vài giây`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRenameSession = (id) => {
    const key = String(id);
    const current = titleCacheRef.current.get(key) ||
      (sessions.find((s) => String(s.sessionId || s.session_id || s.id || s._id) === key)?.title) ||
      '';
    setRenameSessionId(id);
    setRenameInput(current || '');
    setShowRenameModal(true);
  };

  const handleConfirmRename = () => {
    if (!renameSessionId) return;
    const key = String(renameSessionId);
    const trimmed = String(renameInput).trim();
    if (trimmed.length === 0) return;
    titleCacheRef.current.set(key, trimmed);
    setSessions((prev) =>
      prev.map((s) => {
        const sid = String(s.sessionId || s.session_id || s.id || s._id);
        if (sid !== key) return s;
        return { ...s, title: trimmed };
      })
    );
    // Update in backend
    chatService.updateSessionTitle(renameSessionId, trimmed).catch((err) => {
      console.error('Failed to update session title:', err);
    });
    setShowRenameModal(false);
    setRenameInput("");
    setRenameSessionId(null);
    setOpenMenuId(null);
  };

  const handleDeleteSession = (id) => {
    const key = String(id);
    // Local remove (no backend yet)
    setSessions((prev) => prev.filter((s) => String(s.sessionId || s.session_id || s.id || s._id) !== key));
    if (String(sessionId) === key) {
      setSessionId(null);
      eventContextRef.current = '';
      setMessages([
        {
          role: 'assistant',
          content:
            'Cuộc trò chuyện đã được xóa khỏi danh sách hiển thị.',
          timestamp: new Date(),
        },
      ]);
      if (typeof window !== 'undefined' && window.sessionStorage && eventId) {
        window.sessionStorage.removeItem(getStorageKey(eventId));
      }
    }
    setOpenMenuId(null);
  };

  useEffect(() => {
    if (!hasHydratedFromStorage) return;
    if (!eventId) return;
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const payload = JSON.stringify({
        sessionId,
        messages: serializeMessages(messages),
        eventContext: eventContextRef.current,
      });
      window.sessionStorage.setItem(getStorageKey(eventId), payload);
    } catch (error) {
      console.warn('Failed to persist AI chat state:', error);
    }
  }, [messages, sessionId, eventId, hasHydratedFromStorage]);

  useEffect(() => {
    if (!eventContextRef.current) {
      const firstUser = messages.find((m) => m.role === 'user');
      if (firstUser?.content) {
        eventContextRef.current = firstUser.content;
      }
    }
  }, [messages]);

  return (
    <div className="ai-chat-assistant" style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 720,
      maxWidth: '90vw',
      maxHeight: '80vh',
      backgroundColor: '#fff',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: '16px 16px 0 0',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
            AI Assistant
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>
            Hỗ trợ tạo WBS
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Body: Sidebar (sessions) + Messages */}
      <div style={{ display: 'flex', minHeight: 0, flex: 1 }}>
        {/* Sidebar - sessions */}
        <div style={{
          width: 240,
          borderRight: '1px solid #E5E7EB',
          padding: '12px',
          overflowY: 'auto',
        }}>
          {isInitializing && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, color: '#6B7280', fontSize: 12 }}>
              Đang tải cuộc trò chuyện...
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              Cuộc trò chuyện
            </span>
            <button
              onClick={handleNewChat}
              title="Mới"
              style={{
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#111827',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              + Mới
            </button>
          </div>
          {isLoadingSessions || isInitializing ? (
            <div className="text-muted" style={{ fontSize: 12 }}>Đang tải...</div>
          ) : sessions.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 12 }}>Chưa có cuộc trò chuyện</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sessions.map((s) => {
                const id = s.sessionId || s.session_id || s.id || s._id;
                const cacheKey = String(id);
                // Always prefer cached title (per-session) to avoid using current chat's messages for others
                let title = titleCacheRef.current.get(cacheKey) || s.title || s.name;
                if (!title || title.trim().length === 0) {
                  // If this is the active session and we have messages, derive from first user message
                  if (String(id) === String(sessionId)) {
                    const firstUser = messages.find((m) => m.role === 'user');
                    title = firstUser ? generateTitleFromText(firstUser.content) : null;
                    if (title) {
                      // cache it immediately so only this session gets the derived title
                      titleCacheRef.current.set(cacheKey, title);
                    }
                  }
                }
                if (!title || title.trim().length === 0) {
                  title = `Cuộc trò chuyện ${String(id).slice(-6)}`;
                }
                const isActive = String(id) === String(sessionId);
                return (
                  <div key={id} style={{ position: 'relative' }}>
                    <div
                      onClick={() => handleSelectSession(id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        textAlign: 'left',
                        border: '1px solid ' + (isActive ? '#3B82F6' : '#E5E7EB'),
                        background: isActive ? '#EFF6FF' : '#fff',
                        color: '#111827',
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === cacheKey ? null : cacheKey));
                        }}
                        title="Tùy chọn"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          color: '#6B7280',
                          borderRadius: 6,
                        }}
                      >
                        ⋯
                      </button>
                    </div>
                    {openMenuId === cacheKey && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 40,
                          right: 8,
                          background: '#111827',
                          color: '#F9FAFB',
                          borderRadius: 8,
                          padding: 6,
                          minWidth: 140,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                          zIndex: 10,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleRenameSession(id)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#F9FAFB',
                            padding: '8px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Đổi tên
                        </button>
                        <button
                          onClick={() => handleDeleteSession(id)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#FCA5A5',
                            padding: '8px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    backgroundColor: msg.role === 'user' ? '#3B82F6' : '#F3F4F6',
                    color: msg.role === 'user' ? '#fff' : '#111827',
                    whiteSpace: 'pre-wrap',
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                }}>
                  Đang suy nghĩ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            borderRadius: '0 0 16px 16px',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập tin nhắn của bạn..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'none',
                  minHeight: 40,
                  maxHeight: 120,
                }}
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !inputMessage.trim() ? 0.5 : 1,
                  fontWeight: 500,
                }}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Session Modal */}
      {showRenameModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowRenameModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <h5 className="modal-title" style={{ fontWeight: '600', color: '#111827' }}>
                  Đổi tên cuộc trò chuyện
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRenameModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên mới cho cuộc trò chuyện"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmRename();
                    } else if (e.key === 'Escape') {
                      setShowRenameModal(false);
                    }
                  }}
                  autoFocus
                  style={{ borderRadius: '8px' }}
                />
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowRenameModal(false)}
                  style={{ borderRadius: '8px' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmRename}
                  disabled={!renameInput.trim()}
                  style={{ borderRadius: '8px' }}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

