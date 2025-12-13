import React, { useState, useEffect, useRef } from 'react';
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

export default function TaskAssignmentBoard({ 
  tasks, 
  members, 
  eventId, 
  departmentId,
  onTaskAssigned
}) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(null);
  const isCompletedTask = (task) => {
    const status = String(task?.status || "").toLowerCase();
    return (
      status === "hoan_thanh" ||
      status === "completed" ||
      status === "done" ||
      status === "hoàn thành"
    );
  };
  
  // Separate unassigned tasks and members
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [memberTasksMap, setMemberTasksMap] = useState({}); // { memberId: [tasks] }

  // Initialize tasks
  useEffect(() => {
    const unassigned = [];
    const memberTasks = {};
    
    // Initialize member tasks map
    members.forEach(member => {
      const memberId = String(member._id || member.id || member.userId?._id || member.userId);
      memberTasks[memberId] = [];
    });
    
    // Group tasks
    tasks.forEach(task => {
      // Get assigneeId from task
      let assigneeId = null;
      if (task.assigneeId) {
        assigneeId = typeof task.assigneeId === 'object' ? (task.assigneeId._id || task.assigneeId) : task.assigneeId;
      } else if (task.assignee) {
        assigneeId = typeof task.assignee === 'object' ? (task.assignee._id || task.assignee.id) : task.assignee;
      }
      
      if (!assigneeId || assigneeId === "Chưa phân công" || String(assigneeId) === "null" || String(assigneeId) === "undefined") {
        unassigned.push(task);
      } else {
        const memberId = String(assigneeId);
        if (memberTasks[memberId]) {
          memberTasks[memberId].push(task);
        } else {
          // If member not in list, add to unassigned
          unassigned.push(task);
        }
      }
    });
    
    setUnassignedTasks(unassigned);
    setMemberTasksMap(memberTasks);
  }, [tasks, members]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find if active is a task
    const activeTask = unassignedTasks.find(t => t.id === activeId) || 
                      Object.values(memberTasksMap).flat().find(t => t.id === activeId);
    
    if (!activeTask) return;

    // Determine target based on collision detection result
    // If overId is 'unassigned-column', unassign
    if (overId === 'unassigned-column') {
      if (isCompletedTask(activeTask)) {
        toast.info('Công việc đã hoàn thành, không thể đổi người phụ trách');
        return;
      }
      const currentAssigneeId = activeTask.assigneeId ? 
        String(typeof activeTask.assigneeId === 'object' ? (activeTask.assigneeId._id || activeTask.assigneeId) : activeTask.assigneeId) : 
        null;
      
      if (!currentAssigneeId) {
        return; // Already unassigned
      }

      // Save scroll position before update
      if (membersColumnRef.current) {
        scrollPositionRef.current = membersColumnRef.current.scrollTop;
        shouldRestoreScrollRef.current = true;
      }

      // Optimistic update
      const newUnassigned = [...unassignedTasks, activeTask];
      const newMemberTasks = { ...memberTasksMap };
      
      if (newMemberTasks[currentAssigneeId]) {
        newMemberTasks[currentAssigneeId] = newMemberTasks[currentAssigneeId].filter(t => t.id !== activeId);
      }
      
      setUnassignedTasks(newUnassigned);
      setMemberTasksMap(newMemberTasks);

      // Call API to unassign task
      try {
        await taskApi.unassignTask(eventId, activeId);
        toast.success('Đã hủy phân công công việc!');
        
        if (onTaskAssigned) {
          onTaskAssigned();
        }
      } catch (error) {
        // Rollback on error
        setUnassignedTasks(unassignedTasks);
        setMemberTasksMap(memberTasksMap);
        toast.error('Hủy phân công thất bại!');
        console.error('Error unassigning task:', error);
      }
      return;
    }

    // Check if dropped on a member (overId starts with "member-")
    if (overId.startsWith('member-')) {
      if (isCompletedTask(activeTask)) {
        toast.info('Công việc đã hoàn thành, không thể đổi người phụ trách');
        return;
      }
      const targetMemberId = overId.replace('member-', '');
      
      // Check if task is already assigned to this member
      const currentAssigneeId = activeTask.assigneeId ? 
        String(typeof activeTask.assigneeId === 'object' ? (activeTask.assigneeId._id || activeTask.assigneeId) : activeTask.assigneeId) : 
        null;
      
      if (currentAssigneeId === targetMemberId) {
        return; // Already assigned to this member
      }

      // Save scroll position before update
      if (membersColumnRef.current) {
        scrollPositionRef.current = membersColumnRef.current.scrollTop;
        shouldRestoreScrollRef.current = true;
      }

      // Optimistic update
      const newUnassigned = unassignedTasks.filter(t => t.id !== activeId);
      const newMemberTasks = { ...memberTasksMap };
      
      // Remove from old member if assigned
      if (currentAssigneeId && newMemberTasks[currentAssigneeId]) {
        newMemberTasks[currentAssigneeId] = newMemberTasks[currentAssigneeId].filter(t => t.id !== activeId);
      }
      
      // Add to new member
      if (!newMemberTasks[targetMemberId]) {
        newMemberTasks[targetMemberId] = [];
      }
      newMemberTasks[targetMemberId] = [...newMemberTasks[targetMemberId], activeTask];
      
      setUnassignedTasks(newUnassigned);
      setMemberTasksMap(newMemberTasks);

      // Call API to assign task
      try {
        await taskApi.assignTask(eventId, activeId, targetMemberId);
        toast.success('Đã gán công việc thành công!');
        
        if (onTaskAssigned) {
          onTaskAssigned();
        }
      } catch (error) {
        // Rollback on error
        setUnassignedTasks(unassignedTasks);
        setMemberTasksMap(memberTasksMap);
        if (error?.response?.status === 403) {
          toast.error('Bạn không có quyền gán công việc này');
        } else {
          toast.error('Gán công việc thất bại!');
        }
        console.error('Error assigning task:', error);
      }
    }
    // If dropped on "unassigned" area, unassign task
    else if (overId === 'unassigned-column') {
      const currentAssigneeId = activeTask.assigneeId ? 
        String(typeof activeTask.assigneeId === 'object' ? (activeTask.assigneeId._id || activeTask.assigneeId) : activeTask.assigneeId) : 
        null;
      
      if (!currentAssigneeId) {
        return; // Already unassigned
      }

      // Save scroll position before update
      if (membersColumnRef.current) {
        scrollPositionRef.current = membersColumnRef.current.scrollTop;
        shouldRestoreScrollRef.current = true;
      }

      // Optimistic update
      const newUnassigned = [...unassignedTasks, activeTask];
      const newMemberTasks = { ...memberTasksMap };
      
      if (newMemberTasks[currentAssigneeId]) {
        newMemberTasks[currentAssigneeId] = newMemberTasks[currentAssigneeId].filter(t => t.id !== activeId);
      }
      
      setUnassignedTasks(newUnassigned);
      setMemberTasksMap(newMemberTasks);

      // Call API to unassign task
      try {
        await taskApi.unassignTask(eventId, activeId);
        toast.success('Đã hủy phân công công việc!');
        
        if (onTaskAssigned) {
          onTaskAssigned();
        }
      } catch (error) {
        // Rollback on error
        setUnassignedTasks(unassignedTasks);
        setMemberTasksMap(memberTasksMap);
        toast.error('Hủy phân công thất bại!');
        console.error('Error unassigning task:', error);
      }
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
        cursor: isOverlay ? "grabbing" : "pointer",
      }}
      onClick={() => !isOverlay && handleDetail(task.id)}
    >
      <div className="card-body p-3">
        <h6 className="card-title fw-600 mb-2" style={{ fontSize: "14px", color: "#2d3748" }}>
          {task.name || task.title}
        </h6>
        {task.department && (
          <div className="mb-1 small">
            <span className="badge text-bg-light">{task.department}</span>
          </div>
        )}
        {task.due && (
          <div className="mb-1 small">
            <span className="text-muted">📅 {task.due}</span>
          </div>
        )}
        {task.status && (
          <div className="mb-1 small">
            <span 
              className="badge"
              style={{
                backgroundColor: task.status === "Hoàn thành" ? "#DCFCE7" : 
                                task.status === "Tạm hoãn" ? "#FEE2E2" : "#FEF3C7",
                color: task.status === "Hoàn thành" ? "#16A34A" : 
                       task.status === "Tạm hoãn" ? "#DC2626" : "#D97706",
              }}
            >
              {task.status}
            </span>
          </div>
        )}
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
    } = useSortable({ id: task.id });

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

  // Simple task item for member cards (compact display)
  const SortableTaskItem = ({ task }) => {
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
      cursor: 'grab',
      backgroundColor: "#F9FAFB",
      fontSize: "12px",
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="small mb-1 p-2 rounded"
      >
        {task.name || task.title}
      </div>
    );
  };

  const MemberCard = ({ member }) => {
    const memberId = String(member._id || member.id || member.userId?._id || member.userId);
    const memberName = member?.userId?.fullName || member?.fullName || member?.name || 'Thành viên';
    const tasks = memberTasksMap[memberId] || [];
    
    const { setNodeRef, isOver } = useDroppable({
      id: `member-${memberId}`,
    });

    return (
      <div
        ref={setNodeRef}
        className="card mb-3 border-0 shadow-sm"
        style={{
          borderRadius: "12px",
          backgroundColor: isOver ? "rgba(59, 130, 246, 0.1)" : "white",
          border: isOver ? "2px dashed #3B82F6" : "1px solid #E5E7EB",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
      >
        <div className="card-body p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="card-title mb-0 fw-600" style={{ fontSize: "15px", color: "#2d3748" }}>
              {memberName}
            </h6>
            <span className="badge bg-primary">{tasks.length}</span>
          </div>
          {tasks.length > 0 && (
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-2">
                {tasks.map((task) => (
                  <SortableTaskItem key={task.id} task={task} />
                ))}
              </div>
            </SortableContext>
          )}
          {isOver && tasks.length === 0 && (
            <div className="text-center text-muted py-2" style={{ fontSize: "12px" }}>
              Thả công việc vào đây
            </div>
          )}
        </div>
      </div>
    );
  };

  const UnassignedTasksColumn = () => {
    const taskIds = unassignedTasks.map((task) => task.id);
    const { setNodeRef, isOver } = useDroppable({
      id: 'unassigned-column',
    });

    return (
      <div className="col-12 col-md-6">
        <div
          className="rounded-3 p-3 mb-3 d-flex justify-content-between align-items-center text-white"
          style={{
            backgroundColor: '#6B7280',
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
              {unassignedTasks.length}
            </div>
            <span className="fw-600" style={{ fontSize: "15px" }}>
              Công việc chưa phân công
            </span>
          </div>
        </div>
        <div
          ref={setNodeRef}
          style={{
            maxHeight: "calc(100vh - 250px)",
            overflowY: "auto",
            minHeight: "200px",
            backgroundColor: isOver ? "rgba(107, 114, 128, 0.1)" : "transparent",
            borderRadius: "8px",
            padding: isOver ? "4px" : "0",
            transition: "all 0.2s",
            border: isOver ? "2px dashed #6B7280" : "1px solid transparent",
          }}
        >
          <SortableContext
            items={taskIds}
            strategy={verticalListSortingStrategy}
          >
            {unassignedTasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))}
            {unassignedTasks.length === 0 && (
              <div 
                className="text-center text-muted py-5"
                style={{ fontSize: "14px" }}
              >
                {isOver ? "Thả vào đây để hủy phân công" : "Không có công việc chưa phân công"}
              </div>
            )}
          </SortableContext>
        </div>
      </div>
    );
  };

  const membersColumnRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const isUserScrollingRef = useRef(false);

  // Restore scroll position after update
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Only restore if we're not currently scrolling and we have a saved position
    if (shouldRestoreScrollRef.current && membersColumnRef.current && !isUserScrollingRef.current) {
      const container = membersColumnRef.current;
      const savedScroll = scrollPositionRef.current;
      
      // Use setTimeout with multiple frames to ensure DOM is fully updated
      const restoreTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container && shouldRestoreScrollRef.current && !isUserScrollingRef.current) {
              container.scrollTop = savedScroll;
              shouldRestoreScrollRef.current = false;
            }
          });
        });
      }, 10);
      
      return () => clearTimeout(restoreTimeout);
    }
  }, [memberTasksMap, unassignedTasks]);

  const MembersColumn = () => {

    return (
      <div className="col-12 col-md-6">
        <div
          className="rounded-3 p-3 mb-3 d-flex justify-content-between align-items-center text-white"
          style={{
            backgroundColor: '#3B82F6',
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
              {members.length}
            </div>
            <span className="fw-600" style={{ fontSize: "15px" }}>
              Thành viên trong ban
            </span>
          </div>
        </div>
        <div
          ref={membersColumnRef}
          onScroll={(e) => {
            // Mark that user is scrolling
            isUserScrollingRef.current = true;
            scrollPositionRef.current = e.target.scrollTop;
            
            // Reset scrolling flag after a short delay
            clearTimeout(window.scrollTimeout);
            window.scrollTimeout = setTimeout(() => {
              isUserScrollingRef.current = false;
            }, 150);
          }}
          style={{
            maxHeight: "calc(100vh - 250px)",
            overflowY: "auto",
            minHeight: "200px",
          }}
        >
          {members.length === 0 ? (
            <div className="text-center text-muted py-5" style={{ fontSize: "14px" }}>
              Chưa có thành viên trong ban
            </div>
          ) : (
            members.map((member) => (
              <MemberCard key={member._id || member.id || member.userId?._id || member.userId} member={member} />
            ))
          )}
        </div>
      </div>
    );
  };

  const activeTask = activeId
    ? (unassignedTasks.find(t => t.id === activeId) || 
       Object.values(memberTasksMap).flat().find(t => t.id === activeId))
    : null;

  // Custom collision detection - easier to drop (just need to drag to left/right side)
  const customCollisionDetection = (args) => {
    const { active, droppableContainers, pointerCoordinates, collisionRect } = args;
    
    if (!pointerCoordinates) {
      return closestCenter(args);
    }
    
    // Get container bounds for columns
    const unassignedContainer = droppableContainers.find(c => c.id === 'unassigned-column');
    const memberContainers = droppableContainers.filter(c => c.id.startsWith('member-'));
    
    if (!unassignedContainer || memberContainers.length === 0) {
      return closestCenter(args);
    }
    
    // Get viewport center (or use container bounds if available)
    const viewportWidth = window.innerWidth;
    const centerX = viewportWidth / 2;
    
    // If dragging to left side (unassigned column)
    if (pointerCoordinates.x < centerX) {
      return [{ id: unassignedContainer.id }];
    }
    // If dragging to right side (members column) - find closest member card
    else {
      // Use closestCenter to find the closest member card
      const result = closestCenter({
        ...args,
        droppableContainers: memberContainers,
      });
      return result;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-light min-vh-100 py-4">
        <div className="container-lg">
          <div className="row g-3">
            <UnassignedTasksColumn />
            <MembersColumn />
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay={true} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

