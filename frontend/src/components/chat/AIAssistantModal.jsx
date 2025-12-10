import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, User, Bot, X } from 'lucide-react';
import { aiAgentApi } from '../../apis/aiAgentApi.js';

const WELCOME_MESSAGE = `Xin chào! 👋 Tôi là Trợ lý feAI của myFEvent.

Tôi có thể giúp bạn:
• Lên ý tưởng và mô tả sự kiện
• Phân tích phạm vi, đối tượng và phòng ban cần thiết
• Đề xuất các bước triển khai hoặc checklist sơ bộ

Hãy mô tả nhanh sự kiện bạn đang chuẩn bị nhé!`;

const mapHistory = (messages) =>
  messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

const generateTitleFromText = (text) => {
  if (!text || typeof text !== 'string') return 'Cuộc trò chuyện mới';
  const words = text.trim().split(/\s+/);
  const firstFive = words.slice(0, 5).join(' ');
  return words.length > 5 ? `${firstFive} ...` : firstFive;
};

// Render đơn giản markdown cơ bản trong nội dung AI:
// - **text**  → <strong>text</strong>
// - ### Heading → dòng đậm hơn (giống heading nhỏ)
const renderWithBold = (text) => {
  if (!text || typeof text !== 'string') return text;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const isHeading = line.trim().startsWith('### ');
    const content = isHeading ? line.trim().slice(4) : line;

    const parts = content.split(/(\*\*[^*]+?\*\*)/g);

    const inner = parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });

    return (
      <div
        key={lineIdx}
        style={isHeading ? { fontWeight: 700, marginTop: 4, marginBottom: 2 } : undefined}
      >
        {inner}
      </div>
    );
  });
};

export default function AIAssistantModal({ isOpen, onClose, eventId = null }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [plans, setPlans] = useState([]); // các kế hoạch EPIC/TASK do agent sinh ra cho lần chat gần nhất
  const [applying, setApplying] = useState(false);
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  const placeholder = useMemo(
    () =>
      'Ví dụ: "Workshop AI cho 200 người tại FU, cần gợi ý các ban tham gia và timeline"',
    []
  );

  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setLoading(false);
      return;
    }

    // Load session list
    setLoadingSessions(true);
    aiAgentApi
      .listSessions(eventId)
      .then((data) => {
        const list = data?.sessions;
        if (Array.isArray(list)) {
          setSessions(list);
        } else {
          // giữ nguyên nếu server không trả đúng format
        }
      })
      .catch(() => {
        // không xoá danh sách hiện tại nếu lỗi mạng / 401,...
      })
      .finally(() => setLoadingSessions(false));

    setMessages([
      {
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date().toISOString(),
      },
    ]);
    setSessionId(null);

    setTimeout(() => containerRef.current?.focus(), 50);
  }, [isOpen, eventId]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const startNewChat = () => {
    setSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput('');
    setPlans([]); // Reset plans khi bắt đầu chat mới
  };

  const openSession = async (sid) => {
    if (!sid) return;
    setLoading(true);
    try {
      const data = await aiAgentApi.getSession(sid, eventId);
      const convo = data?.conversation || data;
      const convMessages = (convo?.messages || []).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        timestamp: m.timestamp,
        data: m.data, // Giữ lại data để lấy plans
      }));
      setSessionId(sid);
      setMessages(convMessages);
      
      // Khôi phục plans từ message cuối cùng (assistant message có plans và chưa được áp dụng)
      const lastAssistantMsg = [...convMessages]
        .reverse()
        .find((m) => 
          m.role === 'assistant' && 
          m.data?.plans && 
          Array.isArray(m.data.plans) && 
          m.data.plans.length > 0 &&
          !m.data.applied // Chỉ lấy plans chưa được áp dụng
        );
      if (lastAssistantMsg?.data?.plans && !lastAssistantMsg.data.applied) {
        setPlans(lastAssistantMsg.data.plans);
      } else {
        setPlans([]);
      }
    } catch (e) {
      console.error('Failed to load session', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async () => {
    try {
      const data = await aiAgentApi.listSessions(eventId);
      const list = data?.sessions;
      if (Array.isArray(list)) {
        setSessions(list);
      }
    } catch {
      // ignore
    }
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const sid = sessionId || crypto.randomUUID();

    const userMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      setSessionId(sid);
      const response = await aiAgentApi.runTurn(mapHistory(nextMessages), {
        eventId,
        sessionId: sid,
      });
      const assistantReply =
        response?.assistant_reply ||
        'Tôi chưa nhận được phản hồi từ AI Agent. Vui lòng thử lại nhé.';

      // Lưu lại kế hoạch (nếu có) để user xem & áp dụng sau
      const nextPlans =
        Array.isArray(response?.plans) && response.plans.length > 0
          ? response.plans
          : [];
      
      // Debug: log để kiểm tra plans
      console.log('[AIAssistantModal] Response plans:', response?.plans);
      console.log('[AIAssistantModal] Next plans:', nextPlans);
      
      setPlans(nextPlans);

      // Lưu plans vào message data để hiển thị nút "Áp dụng" ngay trong message
      const aiMessage = {
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toISOString(),
        data: nextPlans.length > 0 ? { plans: nextPlans } : undefined,
      };
      console.log('[AIAssistantModal] AI message with data:', aiMessage);
      setMessages((prev) => [...prev, aiMessage]);

      const returnedSessionId =
        response?.sessionId || response?.session_id || sid;
      setSessionId(returnedSessionId);

      // Cập nhật sidebar ngay lập tức để không phải chờ server
      setSessions((prev) => {
        const idStr = String(returnedSessionId);
        const now = new Date().toISOString();
        const title = generateTitleFromText(userMessage.content);
        const existingIdx = prev.findIndex(
          (s) => String(s.sessionId || s.session_id || s._id) === idStr
        );
        if (existingIdx === -1) {
          return [
            {
              sessionId: idStr,
              title,
              updatedAt: now,
            },
            ...prev,
          ];
        }
        const clone = [...prev];
        clone[existingIdx] = {
          ...clone[existingIdx],
          title: clone[existingIdx].title || title,
          updatedAt: now,
        };
        return clone;
      });

      // Sau đó đồng bộ lại với server (nếu cần)
      refreshSessions();
    } catch (error) {
      const detail =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        'Không thể kết nối tới AI Agent.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Xin lỗi, tôi gặp sự cố khi gửi yêu cầu.\nChi tiết: ${detail}`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        zIndex: 1050,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          right: '32px',
          bottom: '32px',
          width: 'min(900px, 60vw)',
          height: '75vh',
          background: '#fff',
          borderRadius: '16px 16px 16px 16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Trợ lý feAI</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Đồng hành lập kế hoạch sự kiện
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              color: '#6b7280',
              transition: 'background-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
          }}
        >
          {/* Sidebar sessions giống ChatGPT */}
          <div
            style={{
              width: 260,
              borderRight: '1px solid #eee',
              padding: '8px',
              overflowY: 'auto',
              background: '#f9fafb',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Cuộc trò chuyện
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={startNewChat}
              >
                Mới
              </button>
            </div>
            {loadingSessions ? (
              <div className="text-muted small">Đang tải...</div>
            ) : sessions.length === 0 ? (
              <div className="text-muted small">
                Chưa có cuộc trò chuyện nào
              </div>
            ) : (
              sessions.map((s) => {
                const sid = s.sessionId || s.session_id || s._id;
                const active = String(sid) === String(sessionId);
                const title = s.title || `Cuộc trò chuyện ${String(sid).slice(-6)}`;
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => openSession(sid)}
                    className="btn btn-light w-100 text-start mb-1"
                    style={{
                      borderColor: active ? '#dc2626' : '#e5e7eb',
                      backgroundColor: active ? '#fef2f2' : '#ffffff',
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {title}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Khung chat chính */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              padding: '12px 16px',
              overflowY: 'auto',
              background: '#f3f4f6',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}-${m.timestamp}`}
                style={{
                  marginBottom: 12,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  justifyContent:
                    m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {m.role !== 'user' && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#dc2626',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '80%',
                    backgroundColor: m.role === 'user' ? '#dc2626' : '#fff',
                    color: m.role === 'user' ? '#fff' : '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '8px 12px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                  }}
                >
                  {m.role === 'user' ? m.content : renderWithBold(m.content)}
                </div>
                {m.role === 'user' && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="text-muted small">AI đang soạn trả lời...</div>
            )}
            {/* Hiển thị plans từ message cuối cùng hoặc từ state plans */}
            {(() => {
              // Tìm message cuối cùng có plans và chưa được áp dụng
              const lastMessageWithPlans = [...messages]
                .reverse()
                .find((m) => 
                  m.role === 'assistant' && 
                  m.data?.plans && 
                  Array.isArray(m.data.plans) && 
                  m.data.plans.length > 0 &&
                  !m.data.applied // Chưa được áp dụng
                );
              
              // Nếu không có trong message, dùng plans từ state (cho message mới)
              const activePlans = lastMessageWithPlans?.data?.plans || 
                (plans.length > 0 && !messages.some(m => m.data?.applied && m.data?.plans === plans) ? plans : []);
              
              // Chỉ hiển thị nếu có plans và chưa được áp dụng
              if (activePlans.length === 0) return null;
              
              return (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Kế hoạch công việc đã được AI đề xuất
                  </div>
                  <ul style={{ paddingLeft: 18, marginBottom: 8 }}>
                    {activePlans.map((p, idx) => {
                      if (p.type === 'epics_plan') {
                        const epics =
                          p.plan?.epics && Array.isArray(p.plan.epics)
                            ? p.plan.epics
                            : [];
                        return (
                          <li key={`${p.type}-${idx}`}>
                            {`EPIC cho sự kiện ${
                              p.eventId || eventId || ''
                            }`}:{' '}
                            {epics.length} công việc lớn
                          </li>
                        );
                      }
                      if (p.type === 'tasks_plan') {
                        const tasks =
                          p.plan?.tasks && Array.isArray(p.plan.tasks)
                            ? p.plan.tasks
                            : [];
                        return (
                          <li key={`${p.type}-${idx}`}>
                            {`TASK cho EPIC "${p.epicTitle || ''}"`}: {tasks.length}{' '}
                            công việc
                          </li>
                        );
                      }
                      return (
                        <li key={`plan-${idx}`}>Kế hoạch khác từ tool {p.tool}</li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={applying || activePlans.length === 0}
                    onClick={async () => {
                      try {
                        setApplying(true);
                        const res = await aiAgentApi.applyPlan(activePlans, {
                          eventId,
                          sessionId, // Gửi sessionId để backend có thể đánh dấu plans đã áp dụng
                        });
                        const msg =
                          res?.message ||
                          'Áp dụng kế hoạch EPIC/TASK từ AI Event Planner hoàn tất (xem chi tiết trong summary).';
                        
                        // Đánh dấu plans đã được áp dụng trong message
                        setMessages((prev) =>
                          prev.map((msg) => {
                            if (msg === lastMessageWithPlans || 
                                (msg.role === 'assistant' && 
                                 msg.data?.plans && 
                                 Array.isArray(msg.data.plans) &&
                                 msg.data.plans.length > 0 &&
                                 !msg.data.applied)) {
                              return {
                                ...msg,
                                data: {
                                  ...msg.data,
                                  applied: true, // Đánh dấu đã áp dụng
                                },
                              };
                            }
                            return msg;
                          })
                        );
                        
                        // Thêm message xác nhận
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: 'assistant',
                            content: msg,
                            timestamp: new Date().toISOString(),
                          },
                        ]);
                        
                        // Xóa plans khỏi state
                        setPlans([]);
                        
                        // Emit event để các trang task list biết cần refresh
                        if (eventId) {
                          window.dispatchEvent(
                            new CustomEvent('ai:plan-applied', {
                              detail: { eventId },
                            })
                          );
                        }
                      } catch (e) {
                        const detail =
                          e?.response?.data?.message || e.message || '';
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: 'assistant',
                            content:
                              'Áp dụng kế hoạch vào sự kiện thất bại. ' +
                              (detail ? `Chi tiết: ${detail}` : ''),
                            timestamp: new Date().toISOString(),
                            isError: true,
                          },
                        ]);
                      } finally {
                        setApplying(false);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    {applying ? 'Đang áp dụng...' : 'Áp dụng vào sự kiện'}
                  </button>
                </div>
              );
            })()}
            <div ref={bottomRef} />
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: 8,
            background: '#fff',
            borderRadius: `16px`
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            style={{
              flex: 1,
              border: '1px solid #d1d5db',
              borderRadius: 10,
              padding: '10px 12px',
              resize: 'none',
              fontSize: 14,
            }}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            type="button"
            style={{
              whiteSpace: 'nowrap',
              background: loading || !input.trim() ? '#d1d5db' : '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }}}
            onMouseLeave={(e) => {
              if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}}
          >
            <Send size={16} />
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
