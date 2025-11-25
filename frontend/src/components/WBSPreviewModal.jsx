import { useState, useEffect } from 'react';
import { aiApi } from '~/apis/aiApi';
import { toast } from 'react-toastify';

export default function WBSPreviewModal({ eventId, wbsData, sessionId, onClose, onApplied }) {
  const [editedWBS, setEditedWBS] = useState(wbsData);
  const [isApplying, setIsApplying] = useState(false);
  const [activeTab, setActiveTab] = useState('epics'); // epics, tasks, risks

  // Initialize edited WBS
  useEffect(() => {
    if (wbsData) {
      const wbs = wbsData.wbs || wbsData.data?.wbs || wbsData;
      setEditedWBS({
        epics: wbs.epics_task || wbs.epics || [],
        tasks: extractTasksFromDepartments(wbs.departments || {}),
        risks: wbs.risks || {},
      });
    }
  }, [wbsData]);

  function extractTasksFromDepartments(departments) {
    const tasks = [];
    for (const [dept, taskList] of Object.entries(departments)) {
      if (Array.isArray(taskList)) {
        tasks.push(...taskList.map(task => ({ ...task, department: dept })));
      }
    }
    return tasks;
  }

  // Group tasks by department
  function groupTasksByDepartment(tasks) {
    const grouped = {};
    tasks.forEach(task => {
      const dept = task.department || 'Khác';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(task);
    });
    return grouped;
  }

  const handleEditEpic = (index, field, value) => {
    const updated = [...editedWBS.epics];
    updated[index] = { ...updated[index], [field]: value };
    setEditedWBS({ ...editedWBS, epics: updated });
  };

  const handleEditTask = (index, field, value) => {
    const updated = [...editedWBS.tasks];
    updated[index] = { ...updated[index], [field]: value };
    setEditedWBS({ ...editedWBS, tasks: updated });
  };


  const handleEditRisk = (category, index, field, value) => {
    const updated = { ...editedWBS.risks };
    if (category === 'overall') {
      updated.overall = [...(updated.overall || [])];
      updated.overall[index] = { ...updated.overall[index], [field]: value };
    } else {
      updated.by_department = { ...(updated.by_department || {}) };
      updated.by_department[category] = [...(updated.by_department[category] || [])];
      updated.by_department[category][index] = {
        ...updated.by_department[category][index],
        [field]: value,
      };
    }
    setEditedWBS({ ...editedWBS, risks: updated });
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const response = await aiApi.applyWBS(eventId, editedWBS, sessionId);
      
      if (response.success) {
        toast.success(response.message || 'Đã apply WBS thành công!');
        if (onApplied) {
          onApplied(response.data);
        }
        onClose();
      } else {
        throw new Error(response.message || 'Lỗi khi apply WBS');
      }
    } catch (error) {
      console.error('Error applying WBS:', error);
      toast.error(error.message || 'Lỗi khi apply WBS');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          width: '90%',
          maxWidth: 1200,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Xem trước & Chỉnh sửa WBS</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6B7280',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E5E7EB',
          padding: '0 24px',
        }}>
          {['epics', 'tasks', 'risks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
                color: activeTab === tab ? '#3B82F6' : '#6B7280',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {tab === 'epics' ? 'Công việc lớn' : tab === 'tasks' ? 'Công việc' : 'Rủi ro'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          {activeTab === 'epics' && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Công việc lớn ({editedWBS.epics?.length || 0})</h3>
              
              {/* Excel-like Table */}
              <div style={{
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                overflow: 'auto',
                backgroundColor: '#fff',
                maxWidth: '100%',
              }}>
                {/* Table Header - Sticky */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1.5fr 2fr 150px 120px 120px',
                  backgroundColor: '#F9FAFB',
                  borderBottom: '2px solid #E5E7EB',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#374151',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mã công việc lớn</div>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Tên</div>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mô tả</div>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Ban</div>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Ngày bắt đầu</div>
                  <div style={{ padding: '10px 12px' }}>Ngày kết thúc</div>
                </div>
                
                {/* Table Rows */}
                {editedWBS.epics?.map((epic, idx) => (
                  <div 
                    key={epic.epic_id || idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1.5fr 2fr 150px 120px 120px',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#F9FAFB',
                    }}
                  >
                    {/* Epic ID */}
                    <div style={{ 
                      padding: '10px 12px', 
                      borderRight: '1px solid #E5E7EB',
                      fontSize: 12,
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      {epic.epic_id || `EP-${String(idx + 1).padStart(3, '0')}`}
                    </div>
                    
                    {/* Name */}
                    <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                      <input
                        type="text"
                        value={epic.name || ''}
                        onChange={(e) => handleEditEpic(idx, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: 4,
                          fontSize: 13,
                          backgroundColor: 'transparent',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                        onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        placeholder="Tên công việc lớn"
                      />
                    </div>
                    
                    {/* Description */}
                    <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                      <input
                        type="text"
                        value={epic.description || ''}
                        onChange={(e) => handleEditEpic(idx, 'description', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: 4,
                          fontSize: 13,
                          backgroundColor: 'transparent',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                        onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        placeholder="Mô tả"
                      />
                    </div>
                    
                    {/* Department */}
                    <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                      <input
                        type="text"
                        value={epic.department || ''}
                        onChange={(e) => handleEditEpic(idx, 'department', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: 4,
                          fontSize: 13,
                          backgroundColor: 'transparent',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                        onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        placeholder="Ban"
                      />
                    </div>
                    
                    {/* Start Date */}
                    <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                      <input
                        type="date"
                        value={epic['start-date'] || epic.startDate || ''}
                        onChange={(e) => handleEditEpic(idx, 'start-date', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: 'transparent',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                        onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                      />
                    </div>
                    
                    {/* End Date */}
                    <div style={{ padding: '4px' }}>
                      <input
                        type="date"
                        value={epic['end-date'] || epic.endDate || ''}
                        onChange={(e) => handleEditEpic(idx, 'end-date', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: 'transparent',
                          outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                        onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {(!editedWBS.epics || editedWBS.epics.length === 0) && (
                <div style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#6B7280',
                }}>
                  Không có công việc lớn nào
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (() => {
            const tasksByDept = groupTasksByDepartment(editedWBS.tasks || []);
            const departments = Object.keys(tasksByDept);
            
            return (
              <div>
                <h3 style={{ marginBottom: 16 }}>Công việc ({editedWBS.tasks?.length || 0})</h3>
                
                {departments.map((dept) => {
                  const deptTasks = tasksByDept[dept];
                  return (
                    <div key={dept} style={{ marginBottom: 32 }}>
                      <h4 style={{ 
                        marginBottom: 12, 
                        fontSize: 16, 
                        fontWeight: 600,
                        color: '#111827',
                        padding: '8px 12px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: 6,
                      }}>
                        {dept} ({deptTasks.length} công việc)
                      </h4>
                      
                      {/* Excel-like Table */}
                      <div style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        overflow: 'auto',
                        backgroundColor: '#fff',
                        maxWidth: '100%',
                      }}>
                        {/* Table Header - Sticky */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 1.5fr 120px 120px 100px 150px',
                          backgroundColor: '#F9FAFB',
                          borderBottom: '2px solid #E5E7EB',
                          fontWeight: 600,
                          fontSize: 13,
                          color: '#374151',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                        }}>
                          <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mã công việc</div>
                          <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Tên</div>
                          <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mô tả</div>
                          <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Ngày bắt đầu</div>
                          <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Hạn chót</div>
                          <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Số lượng người</div>
                          <div style={{ padding: '10px 12px' }}>Phụ thuộc</div>
                        </div>
                        
                        {/* Table Rows */}
                        {deptTasks.map((task, taskIdx) => {
                          // Find global index in editedWBS.tasks array
                          let globalIndex = -1;
                          let deptCount = 0;
                          for (let i = 0; i < editedWBS.tasks.length; i++) {
                            const t = editedWBS.tasks[i];
                            const tDept = t.department || 'Khác';
                            if (tDept === dept) {
                              if (t.task_id === task.task_id || 
                                  (t.name === task.name && tDept === dept && deptCount === taskIdx)) {
                                globalIndex = i;
                                break;
                              }
                              deptCount++;
                            }
                          }
                          
                          // Fallback: use taskIdx if not found
                          if (globalIndex === -1) {
                            globalIndex = editedWBS.tasks.findIndex(t => 
                              (t.department || 'Khác') === dept
                            ) + taskIdx;
                          }
                          
                          return (
                            <div 
                              key={task.task_id || taskIdx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr 1.5fr 120px 120px 100px 150px',
                                borderBottom: '1px solid #E5E7EB',
                                backgroundColor: taskIdx % 2 === 0 ? '#fff' : '#F9FAFB',
                              }}
                            >
                              {/* Task ID */}
                              <div style={{ 
                                padding: '10px 12px', 
                                borderRight: '1px solid #E5E7EB',
                                fontSize: 12,
                                color: '#6B7280',
                                display: 'flex',
                                alignItems: 'center',
                              }}>
                                {task.task_id || `T-${String(taskIdx + 1).padStart(3, '0')}`}
                              </div>
                              
                              {/* Name */}
                              <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                                <input
                                  type="text"
                                  value={task.name || ''}
                                  onChange={(e) => handleEditTask(globalIndex, 'name', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: 4,
                                    fontSize: 13,
                                    backgroundColor: 'transparent',
                                    outline: 'none',
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                                  placeholder="Tên công việc"
                                />
                              </div>
                              
                              {/* Description */}
                              <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                                <input
                                  type="text"
                                  value={task.description || ''}
                                  onChange={(e) => handleEditTask(globalIndex, 'description', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: 4,
                                    fontSize: 13,
                                    backgroundColor: 'transparent',
                                    outline: 'none',
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                                  placeholder="Mô tả"
                                />
                              </div>
                              
                              {/* Start Date */}
                              <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                                <input
                                  type="date"
                                  value={task['start-date'] || task.startDate || ''}
                                  onChange={(e) => handleEditTask(globalIndex, 'start-date', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    backgroundColor: 'transparent',
                                    outline: 'none',
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                                />
                              </div>
                              
                              {/* Deadline */}
                              <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                                <input
                                  type="date"
                                  value={task.deadline || task['deadline'] || ''}
                                  onChange={(e) => handleEditTask(globalIndex, 'deadline', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    backgroundColor: 'transparent',
                                    outline: 'none',
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                                />
                              </div>
                              
                              {/* Team Size */}
                              <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={task.suggested_team_size || task.suggestedTeamSize || ''}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                    handleEditTask(globalIndex, 'suggested_team_size', value);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    backgroundColor: 'transparent',
                                    outline: 'none',
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                                  placeholder="1-5"
                                />
                              </div>
                              
                              {/* Depends On */}
                              <div style={{ padding: '4px' }}>
                                <input
                                  type="text"
                                  value={Array.isArray(task.depends_on) ? task.depends_on.join(', ') : (task.depends_on || '')}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const dependsOn = value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
                                    handleEditTask(globalIndex, 'depends_on', dependsOn);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    backgroundColor: 'transparent',
                                    outline: 'none',
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                                  placeholder="Mã công việc (phân cách bằng dấu phẩy)"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {departments.length === 0 && (
                  <div style={{
                    padding: 40,
                    textAlign: 'center',
                    color: '#6B7280',
                  }}>
                    Không có tasks nào
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'risks' && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Rủi ro</h3>
              
              {/* By Department */}
              {editedWBS.risks?.by_department && Object.entries(editedWBS.risks.by_department).map(([dept, risks]) => (
                <div key={dept} style={{ marginBottom: 32 }}>
                  <h4 style={{ 
                    marginBottom: 12, 
                    fontSize: 16, 
                    fontWeight: 600,
                    color: '#111827',
                    padding: '8px 12px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: 6,
                  }}>
                    {dept} ({risks.length} rủi ro)
                  </h4>
                  
                  {/* Excel-like Table */}
                  <div style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    overflow: 'auto',
                    backgroundColor: '#fff',
                    maxWidth: '100%',
                  }}>
                    {/* Table Header - Sticky */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1.5fr 2fr 120px',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '2px solid #E5E7EB',
                      fontWeight: 600,
                      fontSize: 13,
                      color: '#374151',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                    }}>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mã rủi ro</div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Tiêu đề</div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mô tả</div>
                      <div style={{ padding: '10px 12px' }}>Mức độ</div>
                    </div>
                    
                    {/* Table Rows */}
                    {risks.map((risk, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1.5fr 2fr 120px',
                          borderBottom: '1px solid #E5E7EB',
                          backgroundColor: idx % 2 === 0 ? '#fff' : '#F9FAFB',
                        }}
                      >
                        {/* Risk ID */}
                        <div style={{ 
                          padding: '10px 12px', 
                          borderRight: '1px solid #E5E7EB',
                          fontSize: 12,
                          color: '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                        }}>
                          R-{String(idx + 1).padStart(3, '0')}
                        </div>
                        
                        {/* Title */}
                        <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                          <input
                            type="text"
                            value={risk.title || risk.name || ''}
                            onChange={(e) => handleEditRisk(dept, idx, 'title', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: 4,
                              fontSize: 13,
                              backgroundColor: 'transparent',
                              outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                            placeholder="Tiêu đề rủi ro"
                          />
                        </div>
                        
                        {/* Description */}
                        <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                          <input
                            type="text"
                            value={risk.description || ''}
                            onChange={(e) => handleEditRisk(dept, idx, 'description', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: 4,
                              fontSize: 13,
                              backgroundColor: 'transparent',
                              outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                            placeholder="Mô tả"
                          />
                        </div>
                        
                        {/* Level */}
                        <div style={{ padding: '4px' }}>
                          <select
                            value={risk.level || 'medium'}
                            onChange={(e) => handleEditRisk(dept, idx, 'level', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: 4,
                              fontSize: 12,
                              backgroundColor: 'transparent',
                              outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                          >
                            <option value="low">Thấp</option>
                            <option value="medium">Trung bình</option>
                            <option value="high">Cao</option>
                            <option value="critical">Nghiêm trọng</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Overall Risks */}
              {editedWBS.risks?.overall && editedWBS.risks.overall.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ 
                    marginBottom: 12, 
                    fontSize: 16, 
                    fontWeight: 600,
                    color: '#111827',
                    padding: '8px 12px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: 6,
                  }}>
                    Rủi ro tổng thể ({editedWBS.risks.overall.length})
                  </h4>
                  
                  {/* Excel-like Table */}
                  <div style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    overflow: 'auto',
                    backgroundColor: '#fff',
                    maxWidth: '100%',
                  }}>
                    {/* Table Header - Sticky */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1.5fr 2fr 120px',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '2px solid #E5E7EB',
                      fontWeight: 600,
                      fontSize: 13,
                      color: '#374151',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                    }}>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mã rủi ro</div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Tiêu đề</div>
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>Mô tả</div>
                      <div style={{ padding: '10px 12px' }}>Mức độ</div>
                    </div>
                    
                    {/* Table Rows */}
                    {editedWBS.risks.overall.map((risk, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1.5fr 2fr 120px',
                          borderBottom: '1px solid #E5E7EB',
                          backgroundColor: idx % 2 === 0 ? '#fff' : '#F9FAFB',
                        }}
                      >
                        {/* Risk ID */}
                        <div style={{ 
                          padding: '10px 12px', 
                          borderRight: '1px solid #E5E7EB',
                          fontSize: 12,
                          color: '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                        }}>
                          R-{String(idx + 1).padStart(3, '0')}
                        </div>
                        
                        {/* Title */}
                        <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                          <input
                            type="text"
                            value={risk.title || risk.name || ''}
                            onChange={(e) => handleEditRisk('overall', idx, 'title', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: 4,
                              fontSize: 13,
                              backgroundColor: 'transparent',
                              outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                            placeholder="Tiêu đề rủi ro"
                          />
                        </div>
                        
                        {/* Description */}
                        <div style={{ padding: '4px', borderRight: '1px solid #E5E7EB' }}>
                          <input
                            type="text"
                            value={risk.description || ''}
                            onChange={(e) => handleEditRisk('overall', idx, 'description', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: 4,
                              fontSize: 13,
                              backgroundColor: 'transparent',
                              outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                            placeholder="Mô tả"
                          />
                        </div>
                        
                        {/* Level */}
                        <div style={{ padding: '4px' }}>
                          <select
                            value={risk.level || 'medium'}
                            onChange={(e) => handleEditRisk('overall', idx, 'level', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: 4,
                              fontSize: 12,
                              backgroundColor: 'transparent',
                              outline: 'none',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                          >
                            <option value="low">Thấp</option>
                            <option value="medium">Trung bình</option>
                            <option value="high">Cao</option>
                            <option value="critical">Nghiêm trọng</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!editedWBS.risks?.by_department || Object.keys(editedWBS.risks.by_department).length === 0) && 
               (!editedWBS.risks?.overall || editedWBS.risks.overall.length === 0) && (
                <div style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#6B7280',
                }}>
                  Không có risks nào
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#111827',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: isApplying ? 'not-allowed' : 'pointer',
              opacity: isApplying ? 0.5 : 1,
              fontWeight: 500,
            }}
          >
            {isApplying ? 'Đang áp dụng...' : 'Áp dụng WBS'}
          </button>
        </div>
      </div>
    </div>
  );
}

