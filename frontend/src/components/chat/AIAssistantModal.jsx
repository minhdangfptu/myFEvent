import { useEffect, useMemo, useRef, useState } from 'react';
import { aiChatApi } from '../../apis/aiChatApi.js';

export default function AIAssistantModal({ isOpen, onClose }) {
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasksTable, setTasksTable] = useState([]);
  const [wbsInfo, setWbsInfo] = useState(null);
  const containerRef = useRef(null);

  const placeholder = useMemo(() => (
    'Hỏi AI-gentask về kế hoạch sự kiện, ví dụ: "Concert ngày 25/12 tại đường 30m, 50 người, có ban Marketing và Hậu cần"'
  ), []);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await aiChatApi.listSessions();
        setSessions(res?.data?.sessions || []);
      } catch {}
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => containerRef.current?.focus(), 50);
  }, [isOpen]);

  const startNewChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
  };

  const flattenDepartmentsToTable = (departments) => {
    const rows = [];
    if (!departments || typeof departments !== 'object') return rows;
    const parseDate = (s) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const estimateHours = (priority) => {
      const map = { critical: 16, high: 12, medium: 8, low: 4 };
      return map[(priority || '').toLowerCase()] ?? 8;
    };
    Object.values(departments).forEach((arr) => {
      (arr || []).forEach((t) => {
        const sd = parseDate(t?.['start-date']);
        const ed = parseDate(t?.deadline);
        const duration = sd && ed ? Math.max(0, Math.round((ed - sd) / (1000 * 60 * 60 * 24))) : 0;
        const depends = Array.isArray(t?.depends_on) ? t.depends_on.join(',') : (t?.depends_on ?? '');
        rows.push({
          task_id: t?.task_id || '',
          name: t?.name || '',
          'start-date': t?.['start-date'] || '',
          deadline: t?.deadline || '',
          duration_days: duration,
          depends_on: String(depends),
          estimated_hours: estimateHours(t?.priority),
          complexity: t?.complexity || '',
          priority: t?.priority || '',
        });
      });
    });
    return rows;
  };

  const exportCSV = () => {
    if (!tasksTable || tasksTable.length === 0) return;
    const headers = ['task_id','name','start-date','deadline','duration_days','depends_on','estimated_hours','complexity','priority'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [headers.join(',')].concat(
      tasksTable.map(r => headers.map(h => esc(r[h])).join(','))
    );
    const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks_table.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const switchSession = async (sid) => {
    setSessionId(sid);
    try {
      const res = await aiChatApi.getHistory(sid);
      setMessages(res?.data?.history || []);
    } catch {
      setMessages([]);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const sid = sessionId || crypto.randomUUID();
    setSessionId(sid);
    const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiChatApi.sendMessage({ message: userMsg.content, session_id: sid });
      const aiMsg = { role: 'assistant', content: res?.data?.message || '', timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);

      // Extract tasks table when planning is complete
      const data = res?.data || {};
      if (data?.state === 'planning_complete') {
        setWbsInfo({ extracted_info: data.extracted_info, rag_insights: data.rag_insights });
        if (Array.isArray(data?.tasks_table) && data.tasks_table.length) {
          setTasksTable(data.tasks_table);
        } else {
          const flat = flattenDepartmentsToTable(data?.departments || data?.wbs?.departments);
          setTasksTable(flat);
        }
      }
      // refresh sessions list
      const list = await aiChatApi.listSessions();
      setSessions(list?.data?.sessions || []);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Lỗi không xác định';
      console.error('AI chat error:', e);
      const errMsg = { role: 'assistant', content: `Xin lỗi, có lỗi kết nối tới AI. (${String(detail)})`, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, errMsg]);
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
        zIndex: 1049,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: 'min(520px, 33vw)',
          height: '70vh',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>AI-gentask</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={startNewChat}>
              <i className="bi bi-plus-lg me-1"></i>New Chat
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup>
                <i className="bi bi-three-dots"></i>
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #eee', borderRadius: 8, padding: 8, width: 280, maxHeight: 260, overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <div className="small text-muted mb-2">Hội thoại trước đó</div>
                  {sessions.length === 0 && (
                    <div className="text-muted small">Chưa có phiên trò chuyện</div>
                  )}
                  {sessions.map((s) => (
                    <button
                      key={s.session_id}
                      className={`btn btn-light w-100 text-start mb-1 ${sessionId === s.session_id ? 'active' : ''}`}
                      onClick={() => { setMenuOpen(false); switchSession(s.session_id); }}
                      title={`${s.session_id}`}
                    >
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.current_event || s.session_id}
                      </div>
                      <div className="small text-muted">{s.message_count} tin nhắn</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div ref={containerRef} tabIndex={-1} style={{ flex: 1, padding: '12px 16px', overflow: 'auto', background: '#fafafa' }}>
          {messages.length === 0 && (
            <div className="text-muted" style={{ marginTop: 24 }}>
              Bắt đầu trò chuyện với AI để lên kế hoạch WBS cho sự kiện của bạn.
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: m.role === 'assistant' ? '#dc2626' : '#e5e7eb',
                color: m.role === 'assistant' ? 'white' : '#111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flex: '0 0 auto',
              }}>
                {m.role === 'assistant' ? <i className="bi bi-robot"></i> : <i className="bi bi-person"></i>}
              </div>
              <div style={{ background: 'white', border: '1px solid #eee', borderRadius: 12, padding: '8px 12px', maxWidth: '90%' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-muted small">AI đang soạn trả lời...</div>
          )}

          {tasksTable.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Bảng công việc (Excel-like)</div>
                <button className="btn btn-sm btn-outline-primary" onClick={exportCSV}>
                  <i className="bi bi-download me-1"></i>Export CSV
                </button>
              </div>
              <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'auto', maxHeight: 220 }}>
                <table className="table table-sm mb-0">
                  <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                    <tr>
                      <th>task_id</th>
                      <th>name</th>
                      <th>start-date</th>
                      <th>deadline</th>
                      <th>duration_days</th>
                      <th>depends_on</th>
                      <th>estimated_hours</th>
                      <th>complexity</th>
                      <th>priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksTable.map((r, i) => (
                      <tr key={i}>
                        <td>{r.task_id}</td>
                        <td style={{ minWidth: 220 }}>{r.name}</td>
                        <td>{r['start-date']}</td>
                        <td>{r.deadline}</td>
                        <td>{r.duration_days}</td>
                        <td style={{ minWidth: 120 }}>{r.depends_on}</td>
                        <td>{r.estimated_hours}</td>
                        <td>{r.complexity}</td>
                        <td>{r.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn btn-danger" onClick={send} disabled={loading || !input.trim()}>
            <i className="bi bi-send me-1"></i>Gửi
          </button>
        </div>
      </div>
    </div>
  );
}


