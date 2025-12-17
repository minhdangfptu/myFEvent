import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { taskApi } from '~/apis/taskApi';
import { toast } from 'react-toastify';
import { Calendar, User } from 'lucide-react';

const normalizeAssigneeId = (assignee) => {
  if (!assignee) return null;
  if (typeof assignee === 'string' || typeof assignee === 'number') {
    return String(assignee);
  }
  if (typeof assignee === 'object') {
    if (assignee._id) return String(assignee._id);
    if (assignee.id) return String(assignee.id);
    if (assignee.userId) {
      const userId = assignee.userId;
      if (typeof userId === 'object') {
        return (
          (userId && (userId._id || userId.id)) ? String(userId._id || userId.id) :
          (typeof userId.toString === 'function' ? userId.toString() : null)
        );
      }
      return String(userId);
    }
    if (typeof assignee.toString === 'function') {
      return assignee.toString();
    }
  }
  return null;
};

export default function KanbanBoardTask({
  listTask,
  eventId,
  onTaskMove,
  currentEventMemberId,
}) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(null);
  // Ensure every task has a stable string `id` property for dnd-kit
  const normalizeTask = (task) => {
    if (!task) return task;
    const idVal = task.id ?? task._id ?? task._id ?? task?._id;
    return { ...task, id: idVal != null ? String(idVal) : String(Math.random()) };
  };

  const normalizeList = (arr) => Array.isArray(arr) ? arr.map(normalizeTask) : [];

  const [items, setItems] = useState({
    notStarted: normalizeList(listTask.notStarted),
    inProgress: normalizeList(listTask.inProgress),
    done: normalizeList(listTask.done),
  });

  // Sync items khi listTask thay đổi
  React.useEffect(() => {
    setItems({
      notStarted: normalizeList(listTask.notStarted),
      inProgress: normalizeList(listTask.inProgress),
      done: normalizeList(listTask.done),
    });
    // Debug: show incoming data to help trace rendering issues
    try {
      // eslint-disable-next-line no-console
      console.debug('[KanbanBoardTask] listTask:', listTask);
      // eslint-disable-next-line no-console
      console.debug('[KanbanBoardTask] items after normalize:', {
        notStarted: normalizeList(listTask.notStarted).length,
        inProgress: normalizeList(listTask.inProgress).length,
        done: normalizeList(listTask.done).length,
      });
    } catch (e) {
      // ignore
    }
  }, [listTask]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Map column title to backend status
  const getStatusFromColumn = (columnId) => {
    const statusMap = {
      notStarted: 'chua_bat_dau',
      inProgress: 'da_bat_dau',
      done: 'hoan_thanh',
    };
    return statusMap[columnId] || 'chua_bat_dau';
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const normalizedCurrentMemberId = currentEventMemberId
    ? String(currentEventMemberId)
    : null;

  const canCurrentMemberUpdate = (task) => {
    if (!normalizedCurrentMemberId) return true;
    const taskAssigneeId =
      normalizeAssigneeId(task?.assigneeId) ||
      normalizeAssigneeId(task?.assignee) ||
      normalizeAssigneeId(task?.assignedTo);
    if (!taskAssigneeId) return false;
    return String(taskAssigneeId) === normalizedCurrentMemberId;
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Tìm task và column của active item
    let activeTask = null;
    let activeColumnId = null;
    for (const [columnId, tasks] of Object.entries(items)) {
      const task = tasks.find((t) => String(t.id) === String(activeId));
      if (task) {
        activeTask = task;
        activeColumnId = columnId;
        break;
      }
    }

    if (!activeTask) return;

    // Kiểm tra quyền trước khi đổi trạng thái
    if (!canCurrentMemberUpdate(activeTask)) {
      setItems(items); // rollback
      toast.error('Chỉ người được giao task này mới có quyền đổi trạng thái!');
      return;
    }

    // Nếu kéo vào một column (overId là column ID)
    if (['notStarted', 'inProgress', 'done'].includes(overId)) {
      const newColumnId = overId;
      
      // Nếu đã ở cùng column, không làm gì
      if (activeColumnId === newColumnId) return;

      // Cập nhật UI ngay lập tức (optimistic update)
      const newItems = { ...items };
      newItems[activeColumnId] = newItems[activeColumnId].filter((t) => String(t.id) !== String(activeId));
      newItems[newColumnId] = [...newItems[newColumnId], normalizeTask(activeTask)];
      setItems(newItems);

      // Gọi API để cập nhật status
      const newStatus = getStatusFromColumn(newColumnId);
      try {
        await taskApi.updateTaskProgress(
          eventId,
          activeId,
          newStatus,
          { skipGlobal403: true }
        );
        toast.success('Cập nhật trạng thái task thành công!');
        
        // Gọi callback để parent refresh data nếu có
        if (onTaskMove) {
          onTaskMove();
        }
      } catch (error) {
        // Rollback nếu API fail
        setItems(items);
        const backendMessage = error?.response?.data?.message;
        if (error?.response?.status === 403 && backendMessage) {
          toast.error(backendMessage);
        } else if (backendMessage) {
          toast.error(backendMessage);
        } else if (error?.response?.status === 403) {
          toast.error('Bạn không được cập nhật trạng thái của công việc này');
        } else {
          toast.error('Cập nhật trạng thái task thất bại!');
        }
        console.error('Error updating task status:', error);
      }
      return;
    }

    // Nếu kéo vào một task khác (overId là task ID)
    const overTask = Object.values(items)
      .flat()
      .find((t) => String(t.id) === String(overId));
    
    if (!overTask) return;

    // Tìm column của over task
    let overColumnId = null;
    for (const [columnId, tasks] of Object.entries(items)) {
      if (tasks.find((t) => String(t.id) === String(overId))) {
        overColumnId = columnId;
        break;
      }
    }

    if (!overColumnId || activeColumnId === overColumnId) return;

    // Cập nhật UI
    const newItems = { ...items };
    newItems[activeColumnId] = newItems[activeColumnId].filter((t) => String(t.id) !== String(activeId));
    newItems[overColumnId] = [...newItems[overColumnId], normalizeTask(activeTask)];
    setItems(newItems);

    // Gọi API
    const newStatus = getStatusFromColumn(overColumnId);
    try {
      await taskApi.updateTaskProgress(
        eventId,
        activeId,
        newStatus,
        { skipGlobal403: true }
      );
      toast.success('Cập nhật trạng thái task thành công!');
      
      if (onTaskMove) {
        onTaskMove();
      }
    } catch (error) {
      setItems(items);
      const backendMessage = error?.response?.data?.message;
      if (error?.response?.status === 403 && backendMessage) {
        toast.error(backendMessage);
      } else if (backendMessage) {
        toast.error(backendMessage);
      } else if (error?.response?.status === 403) {
        toast.error('Bạn không được cập nhật trạng thái của công việc này');
      } else {
        toast.error('Cập nhật trạng thái task thất bại!');
      }
      console.error('Error updating task status:', error);
    }
  };

  const handleDetail = (taskId) => {
    navigate(`/events/${eventId}/tasks/${taskId}`);
  };

  const TaskCard = ({ task, isOverlay = false }) => (
    <div 
      className="card mb-3 border-0 shadow-sm" 
      style={{ 
        borderRadius: "12px",
        opacity: isOverlay ? 0.8 : 1,
        transform: isOverlay ? 'rotate(5deg)' : 'none',
      }}
    >
      <div 
        onClick={() => !isOverlay && handleDetail(task.id)} 
        className="card-body p-3" 
        style={{ cursor: isOverlay ? "grabbing" : "pointer" }}
      >
        <h6 className="card-title fw-600 mb-2" style={{ fontSize: "14px", color: "#2d3748" }}>
          {task.name || task.title}
        </h6>
        {task.department && <div className="mb-1 small"><span className="badge text-bg-light">{task.department}</span></div>}
        {task.assignee && <div className="mb-1 small"><span className="text-muted d-flex align-items-center gap-1"><User size={14} /> {task.assignee}</span></div>}
        {task.due && <div className="mb-1 small"><span className="text-muted d-flex align-items-center gap-1"><Calendar size={14} /> {task.due}</span></div>}
      </div>
    </div>
  );

  const SortableTaskCard = ({ task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: String(task.id) });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TaskCard task={task} />
      </div>
    );
  };

  const Column = ({ title, count, color, tasks, columnId }) => {
    const taskIds = tasks.map((task) => String(task.id));
    const { setNodeRef, isOver } = useDroppable({
      id: columnId,
    });

    return (
      <div className="col-12 col-md-4">
        <div
          className="rounded-3 p-3 mb-3 d-flex justify-content-between align-items-center text-white"
          style={{
            backgroundColor: color,
            borderRadius: "20px",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                fontSize: "14px",
              }}
            >
              {count}
            </div>
            <span className="fw-600" style={{ fontSize: "15px" }}>
              {title}
            </span>
          </div>
        </div>
        <div
          ref={setNodeRef}
          style={{
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            minHeight: "100px",
            backgroundColor: isOver ? "rgba(0, 0, 0, 0.05)" : "transparent",
            borderRadius: "8px",
            padding: isOver ? "4px" : "0",
            transition: "all 0.2s",
          }}
        >
          <SortableContext
            items={taskIds}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <SortableTaskCard key={String(task.id)} task={task} />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  };

  const activeTask = activeId
    ? Object.values(items)
        .flat()
        .find((task) => String(task.id) === String(activeId))
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-light min-vh-100 py-4">
        <div className="container-lg">
          <div className="row g-3">
            <Column
              title="Chưa bắt đầu"
              count={items.notStarted.length}
              color="#5b6ef5"
              tasks={items.notStarted}
              columnId="notStarted"
            />
            <Column
              title="Đã bắt đầu"
              count={items.inProgress.length}
              color="#ffa500"
              tasks={items.inProgress}
              columnId="inProgress"
            />
            <Column
              title="Hoàn thành"
              count={items.done.length}
              color="#28a745"
              tasks={items.done}
              columnId="done"
            />
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay={true} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
