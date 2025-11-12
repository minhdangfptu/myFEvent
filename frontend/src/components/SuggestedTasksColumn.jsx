import { useState, useEffect } from 'react';
import { taskApi } from '~/apis/taskApi';
import { toast } from 'react-toastify';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SuggestedTaskCard({ task, onAssign }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardStyle = {
    ...style,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    cursor: 'grab',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      className="suggested-task-card"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#111827' }}>
        {task.name}
      </div>
      {task.description && (
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          {task.description.substring(0, 60)}...
        </div>
      )}
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
        {task.department} • {task.deadline || 'No deadline'}
      </div>
    </div>
  );
}

export default function SuggestedTasksColumn({ eventId, departmentId, onTaskAssigned }) {
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSuggestedTasks();
  }, [eventId, departmentId]);

  const fetchSuggestedTasks = async () => {
    setIsLoading(true);
    try {
      const response = await taskApi.getTaskByEvent(eventId);
      const tasks = response?.data || [];
      
      // Filter suggested tasks for this department
      const suggested = tasks
        .filter(task => task.status === 'suggested')
        .filter(task => {
          if (!departmentId) return true;
          const taskDeptId = task.departmentId?._id || task.departmentId;
          return String(taskDeptId) === String(departmentId);
        })
        .map(task => ({
          id: task._id,
          name: task.title || '',
          description: task.description || '',
          department: task.departmentId?.name || 'Chưa phân công',
          deadline: task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '',
          departmentId: task.departmentId?._id,
        }));
      
      setSuggestedTasks(suggested);
    } catch (error) {
      console.error('Error fetching suggested tasks:', error);
      toast.error('Lỗi khi tải danh sách công việc gợi ý');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id;
    const task = suggestedTasks.find(t => t.id === taskId);

    if (!task) return;

    // If dropped on a member (over.id is memberId), assign the task
    if (over.id && over.id.startsWith('member-')) {
      const memberId = over.id.replace('member-', '');
      handleAssignTask(taskId, memberId);
    }
  };

  const handleAssignTask = async (taskId, memberId) => {
    try {
      await taskApi.assignTask(eventId, taskId, memberId);
      
      // Update task status from suggested to todo
      await taskApi.updateTaskProgress(eventId, taskId, 'todo');
      
      toast.success('Đã gán công việc thành công!');
      
      // Remove from suggested tasks
      setSuggestedTasks(prev => prev.filter(t => t.id !== taskId));
      
      if (onTaskAssigned) {
        onTaskAssigned();
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Lỗi khi gán công việc');
    }
  };

  const activeTask = suggestedTasks.find(t => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        width: 280,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        border: '2px dashed #D1D5DB',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
            Gợi ý ({suggestedTasks.length})
          </h3>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>
            Đang tải...
          </div>
        ) : suggestedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF', fontSize: 14 }}>
            Không có công việc gợi ý
          </div>
        ) : (
          <SortableContext
            items={suggestedTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestedTasks.map(task => (
                <SuggestedTaskCard key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        )}

        <div style={{
          marginTop: 12,
          padding: 8,
          backgroundColor: '#F3F4F6',
          borderRadius: 6,
          fontSize: 12,
          color: '#6B7280',
          textAlign: 'center',
        }}>
          Kéo thả để gán cho thành viên
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div style={{
            padding: 12,
            backgroundColor: '#fff',
            border: '2px solid #3B82F6',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            width: 250,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {activeTask.name}
            </div>
            {activeTask.description && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {activeTask.description.substring(0, 50)}...
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

