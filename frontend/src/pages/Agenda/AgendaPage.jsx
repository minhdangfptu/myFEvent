import { useEffect, useMemo, useState } from "react";
import "./AgendaPage.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEvents } from "~/contexts/EventContext";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import UserLayout from "~/components/UserLayout";
import {
  getAgendaByMilestone,
  getFlattenedAgendaItems,
  createAgenda,
  addDateToAgenda,
  updateDateById,
  removeDateById,
  addItemToDateById,
  updateDayItem,
  removeDayItem,
} from "~/apis/agendaApi";
import ConfirmModal from "~/components/ConfirmModal";
import { AlertTriangle, CheckCircle, Pencil, Plus, RotateCw, Trash, XCircle } from "lucide-react";


export default function AgendaPage({ milestoneName = "" }) {
  // API data states
  const [agendaData, setAgendaData] = useState(null); // Single agenda document
  const [flattenedItems, setFlattenedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  // UI states
  const [dates, setDates] = useState([]);
  const [selectedDateId, setSelectedDateId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Form states
  const [newSchedule, setNewSchedule] = useState({
    startTime: "",
    endTime: "",
    content: "",
  });

const [newDate, setNewDate] = useState("");
const [showAddDateModal, setShowAddDateModal] = useState(false);
const [newDateInput, setNewDateInput] = useState("");
  
  // Confirm modal states
  const [showDeleteScheduleModal, setShowDeleteScheduleModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [showDeleteDateModal, setShowDeleteDateModal] = useState(false);
  const [dateToDelete, setDateToDelete] = useState(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [isDeletingDate, setIsDeletingDate] = useState(false);

  // Context and params
  const { fetchEventRole } = useEvents();
  const { eventId, milestoneId } = useParams();
  const location = useLocation();
  const milestoneTitle =
    (location.state && location.state.milestoneName) || milestoneName || "";
  const [eventRole, setEventRole] = useState("");

  // Utility functions
  const formatTimeToHHMM = (isoString) => {
    const date = new Date(isoString);
    return date.toTimeString().slice(0, 5);
  };

  const formatDateToDisplay = (isoString) => {
    const date = new Date(isoString);
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("vi-VN", options);
  };

  const getSessionFromHour = (hour) => {
    if (hour < 12) return "Sáng";
    if (hour < 17) return "Chiều";
    return "Tối";
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;

    if (Number.isNaN(diffMs) || diffMs <= 0) {
      return "0 phút";
    }

    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${diffMins} phút`;
  };

  // Transform agenda data to UI format
  const transformAgendaDataToUI = (agendaDoc) => {
    if (!agendaDoc || !agendaDoc.agenda || !Array.isArray(agendaDoc.agenda)) {
      return { dates: [], allDays: [] };
    }
  
    const uniqueDates = {};
    const allDays = [];
  
    agendaDoc.agenda.forEach((dateAgenda, dateIndex) => {
      const stableKey = dateAgenda._id;
      const dateDisplay = formatDateToDisplay(dateAgenda.date);
  
      if (!uniqueDates[stableKey]) {
        uniqueDates[stableKey] = {
          id: stableKey,
          date: dateDisplay,
          dateId: dateAgenda._id,
          dateIndex: dateIndex,
          rawDate: dateAgenda.date,
          itemCount: dateAgenda.items ? dateAgenda.items.length : 0,
        };
      }
  
      if (dateAgenda.items && Array.isArray(dateAgenda.items)) {
        dateAgenda.items.forEach((item, itemIndex) => {
          const processedItem = {
            ...item,
            // 👈 FIX: Create unique, stable ID that includes both position AND content
            id: `${dateAgenda._id}-${itemIndex}`, // Use dateId + itemIndex for stability
            originalId: `${dateIndex}-${itemIndex}`, // Keep original for API calls
            dateId: dateAgenda._id,
            dateIndex: dateIndex,
            itemIndex: itemIndex,
            session: getSessionFromHour(new Date(item.startTime).getHours()),
            duration: calculateDuration(item.startTime, item.endTime),
            displayDate: dateDisplay,
            rawDate: dateAgenda.date,
            // 👈 ADD: Store original data for comparison
            originalStartTime: item.startTime,
            originalContent: item.content
          };
          allDays.push(processedItem);
        });
      }
    });
  
    return {
      dates: Object.values(uniqueDates),
      allDays,
    };
  };

  const getSchedulesForSelectedDate = () => {
    if (!selectedDateId) return [];
    
    // Find the selected date object first
    const selectedDate = dates.find(d => d.id === selectedDateId);
    if (!selectedDate) return [];
    
    return schedules
      .filter(schedule => 
        new Date(schedule.rawDate).toDateString() === 
        new Date(selectedDate.rawDate).toDateString()
      )
      .sort((a, b) => a.itemIndex - b.itemIndex);
  };
  // API calls
  const fetchAgendaData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch agenda data using new API
      const response = await getAgendaByMilestone(eventId, milestoneId);
      // Handle single object response
      const agendaDoc = response.success ? response.data : null;
      setAgendaData(agendaDoc);

      if (agendaDoc) {
        // Transform data for UI
        const { dates: transformedDates, allDays } =
          transformAgendaDataToUI(agendaDoc);
        setDates(transformedDates);
        setSchedules(allDays);

        // Also fetch flattened items for easier manipulation
        const flattenedResponse = await getFlattenedAgendaItems(
          eventId,
          milestoneId
        );
        setFlattenedItems(
          flattenedResponse.success ? flattenedResponse.data || [] : []
        );

        // Set default selected date
        if (transformedDates.length > 0 && !selectedDateId) {
          setSelectedDateId(transformedDates[0].id);
        }
      } else {
        // No agenda exists yet
        setDates([]);
        setSchedules([]);
        setFlattenedItems([]);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Không thể tải dữ liệu agenda";
      setError(errorMessage);
      console.error("❌ Error fetching agenda:", err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateTime = (startTime, endTime) => {
    if (!startTime || !endTime) {
      return { valid: false, message: "Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc" };
    }

    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, message: "Định dạng thời gian không hợp lệ" };
    }

    if (start >= end) {
      return { valid: false, message: "Thời gian kết thúc phải sau thời gian bắt đầu" };
    }

    return { valid: true };
  };

const todayISODate = useMemo(() => new Date().toISOString().split("T")[0], []);

const validateDate = (dateString) => {
    if (!dateString || !dateString.trim()) {
      return { valid: false, message: "Vui lòng chọn ngày" };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { valid: false, message: "Định dạng ngày không hợp lệ" };
    }

    // Bỏ validate 6 tháng - cho phép chọn bất kỳ ngày nào
    return { valid: true };
  };

  const combineDateAndTimeToISO = (dateISO, timeString) => {
    if (!dateISO || !timeString) return null;
    const dateTime = new Date(`${dateISO}T${timeString}:00`);
    if (isNaN(dateTime.getTime())) return null;
    return dateTime.toISOString();
  };

  const getLocalDateKey = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const debugLog = (...args) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[AgendaPage]", ...args);
    }
  };

  // CRUD Operations
  const handleDeleteScheduleClick = (scheduleId) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (schedule) {
      setScheduleToDelete(schedule);
      setShowDeleteScheduleModal(true);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    setIsDeletingSchedule(true);
    try {
      // Use index-based API for deleting items (since items don't have _id)
      await removeDayItem(
        eventId,
        milestoneId,
        scheduleToDelete.dateIndex,
        scheduleToDelete.itemIndex
      );

      await fetchAgendaData(); // Refresh data
      toast.success("Xóa lịch trình thành công!");
      setShowDeleteScheduleModal(false);
      setScheduleToDelete(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi xóa lịch trình";
      setError(errorMessage);
      console.error("❌ Error deleting schedule:", err);
      toast.error(errorMessage);
      setShowDeleteScheduleModal(false);
      setScheduleToDelete(null);
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const handleAddSchedule = async () => {
    // Validate content
    if (!newSchedule.content || !newSchedule.content.trim()) {
      toast.error("Vui lòng nhập nội dung lịch trình");
      return;
    }

    if (!selectedDateId) {
      toast.error("Vui lòng chọn ngày để thêm lịch trình");
      return;
    }

    // Validate time
    const timeValidation = validateTime(newSchedule.startTime, newSchedule.endTime);
    if (!timeValidation.valid) {
      toast.error(timeValidation.message);
      return;
    }

    setIsAddingSchedule(true);
    try {
      const selectedDate = dates.find((d) => d.id === selectedDateId);

      if (!selectedDate || !selectedDate.dateId) {
        debugLog("Add schedule aborted: selected date missing", { selectedDateId, selectedDate });
        toast.error("Không tìm thấy dateId cho ngày được chọn");
        return;
      }

      // Use proper date construction
      const selectedRawDate = selectedDate.rawDate;
      debugLog("Adding schedule", { selectedDate, selectedRawDate, newSchedule });
      const dateOnly = selectedRawDate.split("T")[0]; // Get YYYY-MM-DD part

      const startTimeISO = combineDateAndTimeToISO(dateOnly, newSchedule.startTime);
      const endTimeISO = combineDateAndTimeToISO(dateOnly, newSchedule.endTime);

      if (!startTimeISO || !endTimeISO) {
        toast.error("Định dạng thời gian không hợp lệ");
        return;
      }

      const startTime = new Date(startTimeISO);
      const endTime = new Date(endTimeISO);

      if (endTime - startTime <= 0) {
        toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
        return;
      }

      const itemData = {
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: endTime - startTime, // milliseconds
        content: newSchedule.content.trim(),
      };

      // Use ID-based API for adding items to existing dates
      const response = await addItemToDateById(
        eventId,
        milestoneId,
        selectedDate.dateId,
        itemData
      );
      debugLog("Add schedule API response", response);
      setNewSchedule({ startTime: "", endTime: "", content: "" });
      await fetchAgendaData(); // Refresh data
      toast.success("Thêm lịch trình thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi thêm lịch trình";
      setError(errorMessage);
      console.error("❌ Error adding schedule:", err);
      debugLog("Error when adding schedule", { err, newSchedule, selectedDateId });
      toast.error(errorMessage);
    } finally {
      setIsAddingSchedule(false);
    }
  };

  const handleAddDate = async (dateVal) => {
    const dateToAdd = dateVal || newDate;
    
    // Validate date
    const dateValidation = validateDate(dateToAdd);
    if (!dateValidation.valid) {
      toast.error(dateValidation.message);
      return;
    }

    // Ensure date is in ISO string format (YYYY-MM-DD)
    let dateString = dateToAdd;
    if (dateToAdd instanceof Date) {
      dateString = dateToAdd.toISOString().split('T')[0];
    } else if (typeof dateToAdd === 'string') {
      // If it's already a string, ensure it's in YYYY-MM-DD format
      const dateObj = new Date(dateToAdd);
      if (!isNaN(dateObj.getTime())) {
        dateString = dateObj.toISOString().split('T')[0];
      }
    }

    const newDateKey = getLocalDateKey(dateString);
    debugLog("Attempting to add date", { dateToAdd, dateString, newDateKey, existingKeys: dates.map(d => ({ id: d.id, rawDate: d.rawDate, key: getLocalDateKey(d.rawDate) })) });
    const isDuplicateDate = dates.some(
      (d) => getLocalDateKey(d.rawDate) === newDateKey
    );

    if (isDuplicateDate) {
      debugLog("Duplicate date detected", { dateToAdd, dateString, newDateKey });
      toast.error("Ngày này đã tồn tại trong agenda");
      return;
    }

    try {
      // Check if agenda document exists
      if (!agendaData) {
        // Create agenda document first
        await createAgenda(eventId, milestoneId, {});
      }

      // Add date to agenda using new API - ensure dateString is in correct format
      const response = await addDateToAgenda(eventId, milestoneId, dateString);
      debugLog("Add date API response", response);

      setNewDate("");
      setNewDateInput("");
      await fetchAgendaData(); // Refresh data
      toast.success("Thêm ngày thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi thêm ngày";
      setError(errorMessage);
      console.error("❌ Error adding date:", err);
      debugLog("Error when adding date", err);
      toast.error(errorMessage);
    }
  };

  const handleDeleteDateClick = (dateId) => {
    const dateToDelete = dates.find((d) => d.id === dateId);
    if (dateToDelete) {
      setDateToDelete(dateToDelete);
      setShowDeleteDateModal(true);
    }
  };

  const handleDeleteDate = async () => {
    if (!dateToDelete) return;

    setIsDeletingDate(true);
    try {
      if (dateToDelete.dateId) {
        // Use ID-based API for deleting dates
        await removeDateById(eventId, milestoneId, dateToDelete.dateId);
        await fetchAgendaData(); // Refresh data
        toast.success("Xóa ngày thành công!");

        // Reset selected date if deleted
        if (selectedDateId === dateToDelete.id) {
          const remainingDates = dates.filter((d) => d.id !== dateToDelete.id);
          setSelectedDateId(
            remainingDates.length > 0 ? remainingDates[0].id : null
          );
        }
      }
      setShowDeleteDateModal(false);
      setDateToDelete(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi xóa ngày";
      setError(errorMessage);
      console.error("❌ Error deleting date:", err);
      toast.error(errorMessage);
      setShowDeleteDateModal(false);
      setDateToDelete(null);
    } finally {
      setIsDeletingDate(false);
    }
  };

  const handleStartEditingDate = (dateItem) => {
    setEditingDate({
      id: dateItem.dateId,
      originalId: dateItem.id,
      date: dateItem.rawDate.split("T")[0], // Convert to YYYY-MM-DD format
    });
  };

  const handleSaveDateEdit = async () => {
    if (!editingDate) return;

    // Validate date
    const dateValidation = validateDate(editingDate.date);
    if (!dateValidation.valid) {
      toast.error(dateValidation.message);
      return;
    }

    const editedDateKey = getLocalDateKey(editingDate.date);
    debugLog("Attempting to edit date", { editingDate, editedDateKey, existingKeys: dates.map(d => ({ id: d.id, rawDate: d.rawDate, key: getLocalDateKey(d.rawDate) })) });
    const hasDuplicate = dates.some(
      (d) =>
        d.dateId !== editingDate.id &&
        getLocalDateKey(d.rawDate) === editedDateKey
    );

    if (hasDuplicate) {
      debugLog("Duplicate date detected on edit", { editingDate, editedDateKey });
      toast.error("Ngày này đã tồn tại trong agenda");
      return;
    }

    try {
      const updates = {
        date: new Date(editingDate.date).toISOString(),
      };

      const response = await updateDateById(eventId, milestoneId, editingDate.id, updates);
      debugLog("Update date API response", response);
      setEditingDate(null);
      await fetchAgendaData();
      toast.success("Cập nhật ngày thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi cập nhật ngày";
      setError(errorMessage);
      console.error("❌ Error updating date:", err);
      debugLog("Error when updating date", err);
      toast.error(errorMessage);
    }
  };

  const handleCancelDateEdit = () => {
    setEditingDate(null);
  };

  // Modal handlers
  const handleShowAddDateModal = () => {
  setNewDateInput(todayISODate);
    setShowAddDateModal(true);
  };

  const handleCloseAddDateModal = () => {
    setShowAddDateModal(false);
  };

  const handleConfirmAddDate = async () => {
    setNewDate(newDateInput);
    setShowAddDateModal(false);
    if (newDateInput) {
      await handleAddDate(newDateInput);
    }
  };

  const handleStartEditing = (schedule) => {
    
    setEditingSchedule({
      id: schedule.id,
      content: schedule.content,
      originalContent: schedule.content, // 👈 ADD: Store original for finding
      startTime: formatTimeToHHMM(schedule.startTime),
      endTime: formatTimeToHHMM(schedule.endTime),
      dateId: schedule.dateId,
      dateIndex: schedule.dateIndex,
      itemIndex: schedule.itemIndex,
      // 👈 ADD: Store indices for debugging
      debugInfo: {
        dateIndex: schedule.dateIndex,
        itemIndex: schedule.itemIndex,
        originalId: schedule.originalId
      }
    });
  };
  

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    // Validate content
    if (!editingSchedule.content || !editingSchedule.content.trim()) {
      toast.error("Vui lòng nhập nội dung lịch trình");
      return;
    }
  
    try {
      const selectedDate = dates.find((d) => d.id === selectedDateId);
      if (!selectedDate) {
        debugLog("Save edit aborted: selected date missing", { selectedDateId });
        toast.error("Không tìm thấy ngày được chọn");
        return;
      }

      const freshScheduleMeta = schedules.find((s) => s.id === editingSchedule.id);
      if (!freshScheduleMeta) {
        debugLog("Save edit aborted: schedule meta not found", { editingScheduleId: editingSchedule.id });
        toast.error("Không tìm thấy lịch trình cần cập nhật");
        return;
      }
 
      // Validate time
      const timeValidation = validateTime(editingSchedule.startTime, editingSchedule.endTime);
      if (!timeValidation.valid) {
        toast.error(timeValidation.message);
        return;
      }
  
      // Use proper date construction
      const selectedRawDate = selectedDate.rawDate;
      const dateOnly = selectedRawDate.split("T")[0]; // Get YYYY-MM-DD part

      const startTimeISO = combineDateAndTimeToISO(dateOnly, editingSchedule.startTime);
      const endTimeISO = combineDateAndTimeToISO(dateOnly, editingSchedule.endTime);

      if (!startTimeISO || !endTimeISO) {
        debugLog("Invalid time detected on save", { dateOnly, editingSchedule });
        toast.error("Định dạng thời gian không hợp lệ");
        return;
      }

      const startTime = new Date(startTimeISO);
      const endTime = new Date(endTimeISO);

      if (endTime - startTime <= 0) {
        toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
        return;
      }
 
      const updates = {
        content: editingSchedule.content.trim(),
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: endTime - startTime
      };
  
      debugLog("Updating schedule", {
        dateIndex: freshScheduleMeta.dateIndex,
        itemIndex: freshScheduleMeta.itemIndex,
        updates,
        editingSchedule
      });

      const response = await updateDayItem(
        eventId,
        milestoneId,
        freshScheduleMeta.dateIndex,
        freshScheduleMeta.itemIndex,
        updates
      );

      debugLog("Update schedule API response", {
        response,
        usedDateIndex: freshScheduleMeta.dateIndex,
        usedItemIndex: freshScheduleMeta.itemIndex,
        scheduleId: editingSchedule.id
      });

      if (!response?.success) {
        throw new Error(response?.message || "Cập nhật lịch trình thất bại");
      }

      setEditingSchedule(null);
      await fetchAgendaData(); // Fetch fresh data to get correct indices after server-side sorting
      toast.success("Cập nhật lịch trình thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi cập nhật lịch trình";
      setError(errorMessage);
      console.error("❌ Error saving edit:", err);
      debugLog("Error saving edit", { err, editingSchedule });
      toast.error(errorMessage);
    }
  };

  const handleCancelEdit = () => {
    setEditingSchedule(null);
  };

  // Effects
  useEffect(() => {
    if (eventId && milestoneId) {
      fetchAgendaData();
    }
  }, [eventId, milestoneId]);

  useEffect(() => {
    if (eventId) {
      fetchEventRole(eventId).then((role) => {
        setEventRole(role);
        setHasPermission(role === "HoD" || role === "HoOC");
      });
    }
  }, [eventId, fetchEventRole]);

  // Get sidebar type
  const getSidebarType = () => {
    if (eventRole === "HoOC") return "HoOC";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "Member";
    return "user";
  };

  // Get current date display
  const selectedDate = dates.find((d) => d.id === selectedDateId);
  const currentSchedules = getSchedulesForSelectedDate();
  if (loading) {
    return (
      <UserLayout title="Agenda" sidebarType={getSidebarType()} eventId={eventId}>
        <div className="agenda-page__container">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="mt-2">Đang tải dữ liệu agenda...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title={`Agenda ${milestoneTitle}`}
      sidebarType={getSidebarType()}
      activePage="overview & overview-timeline"
      eventId={eventId}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="agenda-page__container">
        <h2 className="agenda-page__title">
          Agenda {selectedDate ? `${selectedDate.date}` : ""}
        </h2>

        {/* Permission Notice
        {!hasPermission && (
          <div className="alert alert-warning">
            <AlertTriangle size={18} />
            Bạn chỉ có quyền xem agenda. Không thể chỉnh sửa.
          </div>
        )} */}

        {/* Date Management Section */}
        <div className="agenda-page__date-management">
          <h5 className="agenda-page__section-title">
            Các ngày có trong {milestoneTitle}
          </h5>
          <div className="agenda-page__date-buttons">
            {dates.map((dateItem) => {
              const isEditingThisDate =
                editingDate && editingDate.id === dateItem.dateId;

              return (
                <div key={dateItem.id} className="agenda-page__date-item">
                  {isEditingThisDate ? (
                    // Edit mode
                    <div className="agenda-page__date-edit-container">
                      <input
                        type="date"
                        value={editingDate.date}
                      min={todayISODate}
                        onChange={(e) =>
                          setEditingDate({
                            ...editingDate,
                            date: e.target.value,
                          })
                        }
                        
                        className="agenda-page__date-input"
                      />
                      <div className="agenda-page__date-edit-actions">
                        <button
                          className="agenda-page__action-button agenda-page__action-button--confirm"
                          onClick={handleSaveDateEdit}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          className="agenda-page__action-button agenda-page__action-button--delete"
                          onClick={handleCancelDateEdit}
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <button
                      className={`agenda-page__date-button ${
                        selectedDateId === dateItem.id
                          ? "agenda-page__date-button--active"
                          : ""
                      }`}
                      onClick={() => setSelectedDateId(dateItem.id)}
                      title={`${dateItem.itemCount} lịch trình`}
                    >
                      {dateItem.date}
                      {hasPermission && (
                        <>
                          <i
                            className="agenda-page__date-button-icon ms-2 bi bi-pencil"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditingDate(dateItem);
                            }}
                          ></i>
                          <i
                            className="agenda-page__date-button-icon ms-1 bi bi-trash"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDateClick(dateItem.id);
                            }}
                          ></i>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {hasPermission && (
              <div className="agenda-page__add-date-section">
                <button
                  className="agenda-page__add-date-button"
                  onClick={handleShowAddDateModal}
                >
                  <Plus size={18} /> Thêm ngày mới
                </button>
                <ConfirmModal
                  show={showAddDateModal}
                  onClose={handleCloseAddDateModal}
                  onConfirm={handleConfirmAddDate}
                  message={
                    <div>
                      <div>Chọn ngày mới để thêm:</div>
                      <input
                        type="date"
                        className="form-control mt-2"
                        value={newDateInput}
                        min={todayISODate}
                        onChange={(e) => setNewDateInput(e.target.value)}
                        style={{ maxWidth: 250 }}
                      />
                    </div>
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Schedule Details Section */}
        {selectedDate && (
          <div className="agenda-page__schedule-section">
            <h5 className="agenda-page__section-title">
              Chi tiết lịch trình - {selectedDate.date}
            </h5>

            <div className="agenda-page__schedule-table-wrapper">
              <table className="agenda-page__schedule-table">
                <thead className="agenda-page__schedule-table-head">
                  <tr className="agenda-page__schedule-table-header-row">
                    <th className="agenda-page__schedule-table-header-cell">
                      Buổi
                    </th>
                    <th className="agenda-page__schedule-table-header-cell">
                      Thời gian
                    </th>
                    <th className="agenda-page__schedule-table-header-cell">
                      Nội dung
                    </th>
                    <th className="agenda-page__schedule-table-header-cell">
                      Thời lượng
                    </th>
                    {hasPermission && (
                      <th className="agenda-page__schedule-table-header-cell">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="agenda-page__schedule-table-body">
                  {currentSchedules.map((schedule) => {
                    const isEditing =
                      editingSchedule && editingSchedule.id === schedule.id;

                    return (
                      <tr
                        key={schedule.id}
                        className={`agenda-page__schedule-table-row ${
                          isEditing
                            ? "agenda-page__schedule-table-row--editing"
                            : ""
                        }`}
                      >
                        <td className="agenda-page__schedule-table-cell agenda-page__schedule-session-cell">
                          {schedule.session}
                        </td>
                        <td className="agenda-page__schedule-table-cell agenda-page__schedule-time-cell">
                          {isEditing ? (
                            <div className="agenda-page__time-input-group">
                              <input
                                type="time"
                                className="agenda-page__time-input"
                                value={editingSchedule.startTime}
                                onChange={(e) =>
                                  setEditingSchedule({
                                    ...editingSchedule,
                                    startTime: e.target.value,
                                  })
                                }
                              />
                              <span className="agenda-page__time-separator">
                                -
                              </span>
                              <input
                                type="time"
                                className="agenda-page__time-input"
                                value={editingSchedule.endTime}
                                onChange={(e) =>
                                  setEditingSchedule({
                                    ...editingSchedule,
                                    endTime: e.target.value,
                                  })
                                }
                              />
                            </div>
                          ) : (
                            `${formatTimeToHHMM(
                              schedule.startTime
                            )} - ${formatTimeToHHMM(schedule.endTime)}`
                          )}
                        </td>
                        <td className="agenda-page__schedule-table-cell agenda-page__schedule-content-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              className="agenda-page__content-input"
                              value={editingSchedule.content}
                              onChange={(e) =>
                                setEditingSchedule({
                                  ...editingSchedule,
                                  content: e.target.value,
                                })
                              }
                            />
                          ) : (
                            schedule.content
                          )}
                        </td>
                        <td className="agenda-page__schedule-table-cell agenda-page__schedule-duration-cell">
                          {schedule.duration}
                        </td>
                        {hasPermission && (
                          <td className="agenda-page__schedule-table-cell agenda-page__schedule-actions-cell">
                            {isEditing ? (
                              <div className="agenda-page__action-buttons">
                                <button
                                  className="agenda-page__action-button agenda-page__action-button--confirm"
                                  onClick={handleSaveEdit}
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button
                                  className="agenda-page__action-button agenda-page__action-button--delete"
                                  onClick={handleCancelEdit}
                                >
                                  <XCircle size={18} />
                                </button>
                              </div>
                            ) : (
                              <div className="agenda-page__action-buttons">
                                <button
                                  className="agenda-page__action-button agenda-page__action-button--edit"
                                  onClick={() => handleStartEditing(schedule)}
                                >
                                  <Pencil size={18} />
                                </button>
                                <button
                                  className="agenda-page__action-button agenda-page__action-button--delete"
                                  onClick={() =>
                                    handleDeleteScheduleClick(schedule.id)
                                  }
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Schedule Row */}
            {hasPermission && (
              <div className="agenda-page__add-schedule-section">
                <div className="agenda-page__add-schedule-inputs">
                  <select className="agenda-page__session-select" disabled>
                    <option>Tự động</option>
                  </select>
                  <input
                    type="time"
                    className="agenda-page__time-input-sm"
                    value={newSchedule.startTime}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        startTime: e.target.value,
                      })
                    }
                  />
                  <span className="agenda-page__time-separator-sm">-</span>
                  <input
                    type="time"
                    className="agenda-page__time-input-sm"
                    value={newSchedule.endTime}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        endTime: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="agenda-page__content-input-lg"
                    placeholder="Nhập nội dung lịch trình"
                    value={newSchedule.content}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        content: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="agenda-page__duration-input-sm"
                    placeholder="Tự động"
                    readOnly
                    value={
                      newSchedule.startTime && newSchedule.endTime
                        ? calculateDuration(
                            new Date(`2000-01-01 ${newSchedule.startTime}`),
                            new Date(`2000-01-01 ${newSchedule.endTime}`)
                          )
                        : ""
                    }
                  />
                  <button
                    className="agenda-page__action-button agenda-page__action-button--confirm"
                    onClick={handleAddSchedule}
                    disabled={isAddingSchedule}
                  >
                    {isAddingSchedule ? (
                      <i className="bi bi-arrow-clockwise spin-animation"></i>
                    ) : (
                      <CheckCircle size={18} />
                    )}
                  </button>
                  <button
                    className="agenda-page__action-button agenda-page__action-button--delete"
                    onClick={() =>
                      setNewSchedule({
                        startTime: "",
                        endTime: "",
                        content: "",
                      })
                    }
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Add Activity Button */}
            {hasPermission && currentSchedules.length === 0 && (
              <div className="text-center mt-4">
                <button className="agenda-page__add-activity-button">
                  <Plus size={18} /> Thêm lịch trình đầu tiên
                </button>
              </div>
            )}
          </div>
        )}

        {/* No data state */}
        {dates.length === 0 && (
          <div className="text-center mt-5">
            <i
              className="bi bi-calendar3"
              style={{ fontSize: "3rem", color: "#6c757d" }}
            ></i>
            <h4 className="text-muted mt-3">Chưa có agenda nào</h4>
            <p className="text-muted">
              Hãy thêm ngày sự kiện đầu tiên để bắt đầu!
            </p>
          </div>
        )}

        {/* Confirm Modals */}
        <ConfirmModal
          show={showDeleteScheduleModal}
          onClose={() => {
            setShowDeleteScheduleModal(false);
            setScheduleToDelete(null);
          }}
          onConfirm={handleDeleteSchedule}
          message="Bạn có chắc chắn muốn xóa lịch trình này?"
          isLoading={isDeletingSchedule}
        />

        <ConfirmModal
          show={showDeleteDateModal}
          onClose={() => {
            setShowDeleteDateModal(false);
            setDateToDelete(null);
          }}
          onConfirm={handleDeleteDate}
          message="Bạn có chắc chắn muốn xóa ngày này và tất cả lịch trình?"
          isLoading={isDeletingDate}
        />
      </div>
    </UserLayout>
  );
}
