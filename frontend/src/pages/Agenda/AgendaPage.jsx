import { useEffect, useMemo, useState } from "react";
import "./AgendaPage.css";
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
import { ToastContainer } from "react-toastify";


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
  const [insertAfterIndex, setInsertAfterIndex] = useState(null);

  // Message system state
  const [message, setMessage] = useState(null); // { text: string, type: 'success' | 'error' }

  // Context and params
  const { fetchEventRole } = useEvents();
  const { eventId, milestoneId } = useParams();
  const location = useLocation();
  const milestoneTitle =
    (location.state && location.state.milestoneName) || milestoneName || "";
  const [eventRole, setEventRole] = useState("");

  // Message helper functions
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 3000); // Auto hide after 3 seconds
  };

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
            id: `${dateAgenda._id}-${itemIndex}`, // For UI stability
            originalId: `${dateIndex}-${itemIndex}`, // Keep original for reference
            itemId: item._id, // Store MongoDB item _id for matching
            dateId: dateAgenda._id,
            dateIndex: dateIndex,
            itemIndex: itemIndex,
            session: getSessionFromHour(new Date(item.startTime).getHours()),
            duration: calculateDuration(item.startTime, item.endTime),
            displayDate: dateDisplay,
            rawDate: dateAgenda.date
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
      showMessage(errorMessage, "error");
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

    // Thời gian kết thúc phải sau thời gian bắt đầu (không cho phép overnight)
    if (end <= start) {
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

  // === Utility: find index by _id from fresh agendaData ===
  const findDateAndItemIndexById = (agendaDataObj, dateId, itemId) => {
    if (!agendaDataObj || !agendaDataObj.agenda) return { dateIndex: -1, itemIndex: -1 };
    
    // Convert to string for reliable comparison (MongoDB _id can be ObjectId or string)
    const dateIdStr = String(dateId);
    const itemIdStr = String(itemId);
    
    const dateIndex = agendaDataObj.agenda.findIndex(d => String(d._id) === dateIdStr);
    if (dateIndex === -1) return { dateIndex: -1, itemIndex: -1 };
    
    const dateItems = agendaDataObj.agenda[dateIndex].items || [];
    const itemIndex = dateItems.findIndex(item => String(item._id) === itemIdStr);
    return { dateIndex, itemIndex };
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
      // === Quan trọng: tìm index chuẩn từ _id ===
      const { dateIndex, itemIndex } = findDateAndItemIndexById(
        agendaData,
        scheduleToDelete.dateId,
        scheduleToDelete.itemId
      );

      if (dateIndex === -1 || itemIndex === -1) {
        debugLog("Delete aborted: could not find accurate indices", {
          scheduleToDelete,
          dateIndex,
          itemIndex,
          selectedDate: dates.find(d => d.dateId === scheduleToDelete.dateId),
          agendaDataDates: agendaData?.agenda?.map(d => ({ _id: d._id, itemCount: d.items?.length }))
        });
        showMessage("Không tìm thấy lịch trình cần xóa. Vui lòng refresh trang.", "error");
        setShowDeleteScheduleModal(false);
        setScheduleToDelete(null);
        return;
      }

      debugLog("Deleting schedule by index resolved from _id", { dateIndex, itemIndex, itemId: scheduleToDelete.itemId });

      // Pass itemId to backend for verification (more reliable than index alone)
      await removeDayItem(
        eventId,
        milestoneId,
        dateIndex,
        itemIndex,
        scheduleToDelete.itemId
      );

      await fetchAgendaData(); // Refresh data
      showMessage("Xóa lịch trình thành công!");
      setShowDeleteScheduleModal(false);
      setScheduleToDelete(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi xóa lịch trình";
      setError(errorMessage);
      console.error("❌ Error deleting schedule:", err);
      showMessage(errorMessage, "error");
      setShowDeleteScheduleModal(false);
      setScheduleToDelete(null);
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const handleAddSchedule = async () => {
    // Validate content
    if (!newSchedule.content || !newSchedule.content.trim()) {
      showMessage("Vui lòng nhập nội dung lịch trình", "error");
      return;
    }

    if (!selectedDateId) {
      showMessage("Vui lòng chọn ngày để thêm lịch trình", "error");
      return;
    }

    // Validate time
    const timeValidation = validateTime(newSchedule.startTime, newSchedule.endTime);
    if (!timeValidation.valid) {
      showMessage(timeValidation.message, "error");
      return;
    }

    setIsAddingSchedule(true);
    try {
      const selectedDate = dates.find((d) => d.id === selectedDateId);

      if (!selectedDate || !selectedDate.dateId) {
        debugLog("Add schedule aborted: selected date missing", { selectedDateId, selectedDate });
        showMessage("Không tìm thấy dateId cho ngày được chọn", "error");
        return;
      }

      // Use proper date construction
      const selectedRawDate = selectedDate.rawDate;
      debugLog("Adding schedule", { selectedDate, selectedRawDate, newSchedule });
      const dateOnly = selectedRawDate.split("T")[0]; // Get YYYY-MM-DD part

      // Handle overnight schedule (e.g., 23:30 to 6:00 next day)
      const startTimeISO = combineDateAndTimeToISO(dateOnly, newSchedule.startTime);
      const endTimeISO = combineDateAndTimeToISO(dateOnly, newSchedule.endTime);

      if (!startTimeISO || !endTimeISO) {
        showMessage("Định dạng thời gian không hợp lệ", "error");
        return;
      }

      const startTime = new Date(startTimeISO);
      const endTime = new Date(endTimeISO);

      // Thời gian kết thúc phải sau thời gian bắt đầu
      if (endTime <= startTime) {
        showMessage("Thời gian kết thúc phải sau thời gian bắt đầu", "error");
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
      setInsertAfterIndex(null);
      await fetchAgendaData(); // Refresh data
      showMessage("Thêm lịch trình thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi thêm lịch trình";
      setError(errorMessage);
      console.error("❌ Error adding schedule:", err);
      debugLog("Error when adding schedule", { err, newSchedule, selectedDateId });
      showMessage(errorMessage, "error");
    } finally {
      setIsAddingSchedule(false);
    }
  };

  const handleAddDate = async (dateVal) => {
    const dateToAdd = dateVal || newDate;
    
    // Validate date
    const dateValidation = validateDate(dateToAdd);
    if (!dateValidation.valid) {
      showMessage(dateValidation.message, "error");
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
      showMessage("Ngày này đã tồn tại trong agenda", "error");
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
      showMessage("Thêm ngày thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi thêm ngày";
      setError(errorMessage);
      console.error("❌ Error adding date:", err);
      debugLog("Error when adding date", err);
      showMessage(errorMessage, "error");
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
        showMessage("Xóa ngày thành công!");

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
      showMessage(errorMessage, "error");
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
      showMessage(dateValidation.message, "error");
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
      showMessage("Ngày này đã tồn tại trong agenda", "error");
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
      showMessage("Cập nhật ngày thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi cập nhật ngày";
      setError(errorMessage);
      console.error("❌ Error updating date:", err);
      debugLog("Error when updating date", err);
      showMessage(errorMessage, "error");
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
    // Validate date input
    if (!newDateInput || !newDateInput.trim()) {
      showMessage("Vui lòng chọn ngày", "error");
      return;
    }

    const dateValidation = validateDate(newDateInput);
    if (!dateValidation.valid) {
      showMessage(dateValidation.message, "error");
      return;
    }

    setNewDate(newDateInput);
    setShowAddDateModal(false);
      await handleAddDate(newDateInput);
  };

  const handleStartEditing = (schedule) => {

    setEditingSchedule({
      id: schedule.id,
      itemId: schedule.itemId, // MongoDB item _id for matching
      content: schedule.content,
      startTime: formatTimeToHHMM(schedule.startTime),
      endTime: formatTimeToHHMM(schedule.endTime),
      dateId: schedule.dateId,
      dateIndex: schedule.dateIndex,
      itemIndex: schedule.itemIndex
    });
  };
  

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    // Validate content
    if (!editingSchedule.content || !editingSchedule.content.trim()) {
      showMessage("Vui lòng nhập nội dung lịch trình", "error");
      return;
    }

    try {
      const selectedDate = dates.find((d) => d.id === selectedDateId);
      if (!selectedDate) {
        debugLog("Save edit aborted: selected date missing", { selectedDateId });
        showMessage("Không tìm thấy ngày được chọn", "error");
        return;
      }

      // === Quan trọng: tìm index chuẩn từ _id ===
      const { dateIndex, itemIndex } = findDateAndItemIndexById(
        agendaData,
        editingSchedule.dateId,
        editingSchedule.itemId
      );

      if (dateIndex === -1 || itemIndex === -1) {
        debugLog("Save edit aborted: could not find accurate indices", {
          editingSchedule,
          dateIndex,
          itemIndex,
          selectedDate,
          agendaDataDates: agendaData?.agenda?.map(d => ({ _id: d._id, itemCount: d.items?.length }))
        });
        showMessage("Không tìm thấy lịch trình cần cập nhật. Vui lòng refresh trang.", "error");
        return;
      }

      debugLog("Found accurate indices by _id", { dateIndex, itemIndex, itemId: editingSchedule.itemId });
 
      // Validate time
      const timeValidation = validateTime(editingSchedule.startTime, editingSchedule.endTime);
      if (!timeValidation.valid) {
        showMessage(timeValidation.message, "error");
        return;
      }
  
      // Use proper date construction
      const selectedRawDate = selectedDate.rawDate;
      const dateOnly = selectedRawDate.split("T")[0]; // Get YYYY-MM-DD part

      const startTimeISO = combineDateAndTimeToISO(dateOnly, editingSchedule.startTime);
      const endTimeISO = combineDateAndTimeToISO(dateOnly, editingSchedule.endTime);

      if (!startTimeISO || !endTimeISO) {
        debugLog("Invalid time detected on save", { dateOnly, editingSchedule });
        showMessage("Định dạng thời gian không hợp lệ", "error");
        return;
      }

      const startTime = new Date(startTimeISO);
      const endTime = new Date(endTimeISO);

      // Thời gian kết thúc phải sau thời gian bắt đầu
      if (endTime <= startTime) {
        showMessage("Thời gian kết thúc phải sau thời gian bắt đầu", "error");
        return;
      }
 
      const updates = {
        content: editingSchedule.content.trim(),
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: endTime - startTime
      };

      debugLog("Updating schedule", {
        dateIndex: dateIndex,
        itemIndex: itemIndex,
        updates,
        editingSchedule
      });

      const response = await updateDayItem(
        eventId,
        milestoneId,
        dateIndex,
        itemIndex,
        updates
      );

      debugLog("Update schedule API response", {
        response,
        usedDateIndex: dateIndex,
        usedItemIndex: itemIndex,
        scheduleId: editingSchedule.id
      });

      if (!response?.success) {
        throw new Error(response?.message || "Cập nhật lịch trình thất bại");
      }

      setEditingSchedule(null);
      await fetchAgendaData(); // Fetch fresh data to get correct indices after server-side sorting
      showMessage("Cập nhật lịch trình thành công!");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Lỗi khi cập nhật lịch trình";
      setError(errorMessage);
      console.error("❌ Error saving edit:", err);
      debugLog("Error saving edit", { err, editingSchedule });
      showMessage(errorMessage, "error");
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
        setHasPermission( role === "HoOC");
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
      <UserLayout title="Agenda" sidebarType={getSidebarType()} activePage="overview-timeline" eventId={eventId}>
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
      title="Agenda"
      sidebarType={getSidebarType()}
      activePage="overview-timeline"
      eventId={eventId}
    >
      {/* Custom Message Notification */}
      {message && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}
      <div className="agenda-page__container">

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 className="agenda-page__section-title" style={{ marginBottom: 0 }}>
                Chi tiết lịch trình - {selectedDate.date}
              </h5>
              {hasPermission && currentSchedules.length > 0 && (
                <button
                  className="agenda-page__action-button"
                  onClick={() => {
                    if (insertAfterIndex !== null) {
                      // Cancel adding
                      setInsertAfterIndex(null);
                      setNewSchedule({
                        startTime: "",
                        endTime: "",
                        content: "",
                      });
                    } else {
                      // Start adding
                      setInsertAfterIndex(currentSchedules.length - 1);
                    }
                  }}
                  title={insertAfterIndex !== null ? "Hủy thêm" : "Thêm lịch trình mới"}
                  style={{
                    backgroundColor: insertAfterIndex !== null ? '#ef4444' : '#10b981',
                    color: 'white',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {insertAfterIndex !== null ? (
                    <>
                      <XCircle size={18} />
                      Hủy
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Thêm lịch trình
                    </>
                  )}
                </button>
              )}
            </div>

            {currentSchedules.length > 0 && (
              <div className="agenda-page__schedule-table-wrapper" style={{ position: 'relative' }}>
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
                    {currentSchedules.map((schedule, index) => {
                    const isEditing =
                      editingSchedule && editingSchedule.id === schedule.id;
                    const showInsertRow = insertAfterIndex === index;

                    return (
                      <>
                        <tr
                          key={schedule.id}
                          className={`agenda-page__schedule-table-row ${
                            isEditing
                              ? "agenda-page__schedule-table-row--editing"
                              : ""
                          }`}
                          style={{ position: 'relative' }}
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

                      {/* Insert new schedule row */}
                      {showInsertRow && (
                        <tr className="agenda-page__schedule-table-row agenda-page__schedule-table-row--adding" style={{ backgroundColor: '#fef2f2' }}>
                          <td className="agenda-page__schedule-table-cell agenda-page__schedule-session-cell">
                            <select className="agenda-page__session-select" disabled style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f9fafb' }}>
                              <option>Tự động</option>
                            </select>
                          </td>
                          <td className="agenda-page__schedule-table-cell agenda-page__schedule-time-cell">
                            <div className="agenda-page__time-input-group">
                              <input
                                type="time"
                                className="agenda-page__time-input"
                                value={newSchedule.startTime}
                                onChange={(e) =>
                                  setNewSchedule({
                                    ...newSchedule,
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
                                value={newSchedule.endTime}
                                onChange={(e) =>
                                  setNewSchedule({
                                    ...newSchedule,
                                    endTime: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </td>
                          <td className="agenda-page__schedule-table-cell agenda-page__schedule-content-cell">
                            <input
                              type="text"
                              className="agenda-page__content-input"
                              placeholder="Nhập nội dung lịch trình"
                              value={newSchedule.content}
                              onChange={(e) =>
                                setNewSchedule({
                                  ...newSchedule,
                                  content: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="agenda-page__schedule-table-cell agenda-page__schedule-duration-cell">
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
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f9fafb' }}
                            />
                          </td>
                          {hasPermission && (
                            <td className="agenda-page__schedule-table-cell agenda-page__schedule-actions-cell">
                              <div className="agenda-page__action-buttons">
                                <button
                                  className="agenda-page__action-button agenda-page__action-button--confirm"
                                  onClick={handleAddSchedule}
                                  disabled={isAddingSchedule}
                                  title="Lưu"
                                >
                                  {isAddingSchedule ? (
                                    <RotateCw size={18} className="spin-animation" />
                                  ) : (
                                    <CheckCircle size={18} />
                                  )}
                                </button>
                                <button
                                  className="agenda-page__action-button agenda-page__action-button--delete"
                                  onClick={() => {
                                    setInsertAfterIndex(null);
                                    setNewSchedule({
                                      startTime: "",
                                      endTime: "",
                                      content: "",
                                    });
                                  }}
                                  title="Hủy"
                                >
                                  <XCircle size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            {/* Add First Schedule Button */}
            {hasPermission && currentSchedules.length === 0 && insertAfterIndex === null && (
              <div className="text-center mt-4">
                <button
                  className="agenda-page__add-activity-button"
                  onClick={() => setInsertAfterIndex(-1)}
                >
                  <Plus size={18} /> Thêm lịch trình đầu tiên
                </button>
              </div>
            )}

            {/* Insert row when list is empty */}
            {hasPermission && currentSchedules.length === 0 && insertAfterIndex === -1 && (
              <div className="agenda-page__schedule-table-wrapper" style={{ marginTop: '20px' }}>
                <table className="agenda-page__schedule-table">
                  <thead className="agenda-page__schedule-table-head">
                    <tr className="agenda-page__schedule-table-header-row">
                      <th className="agenda-page__schedule-table-header-cell">Buổi</th>
                      <th className="agenda-page__schedule-table-header-cell">Thời gian</th>
                      <th className="agenda-page__schedule-table-header-cell">Nội dung</th>
                      <th className="agenda-page__schedule-table-header-cell">Thời lượng</th>
                      <th className="agenda-page__schedule-table-header-cell">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="agenda-page__schedule-table-body">
                    <tr className="agenda-page__schedule-table-row agenda-page__schedule-table-row--adding" style={{ backgroundColor: '#fef2f2' }}>
                      <td className="agenda-page__schedule-table-cell agenda-page__schedule-session-cell">
                        <select className="agenda-page__session-select" disabled style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f9fafb' }}>
                          <option>Tự động</option>
                        </select>
                      </td>
                      <td className="agenda-page__schedule-table-cell agenda-page__schedule-time-cell">
                        <div className="agenda-page__time-input-group">
                          <input
                            type="time"
                            className="agenda-page__time-input"
                            value={newSchedule.startTime}
                            onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                            style={{ width: '100%' }}
                          />
                          <span className="agenda-page__time-separator">-</span>
                          <input
                            type="time"
                            className="agenda-page__time-input"
                            value={newSchedule.endTime}
                            onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </td>
                      <td className="agenda-page__schedule-table-cell agenda-page__schedule-content-cell">
                        <input
                          type="text"
                          className="agenda-page__content-input"
                          placeholder="Nhập nội dung lịch trình"
                          value={newSchedule.content}
                          onChange={(e) => setNewSchedule({ ...newSchedule, content: e.target.value })}
                        />
                      </td>
                      <td className="agenda-page__schedule-table-cell agenda-page__schedule-duration-cell">
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
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f9fafb' }}
                        />
                      </td>
                      <td className="agenda-page__schedule-table-cell agenda-page__schedule-actions-cell">
                        <div className="agenda-page__action-buttons">
                          <button
                            className="agenda-page__action-button agenda-page__action-button--confirm"
                            onClick={handleAddSchedule}
                            disabled={isAddingSchedule}
                            title="Lưu"
                          >
                            {isAddingSchedule ? (
                              <RotateCw size={18} className="spin-animation" />
                            ) : (
                              <CheckCircle size={18} />
                            )}
                          </button>
                          <button
                            className="agenda-page__action-button agenda-page__action-button--delete"
                            onClick={() => {
                              setInsertAfterIndex(null);
                              setNewSchedule({ startTime: "", endTime: "", content: "" });
                            }}
                            title="Hủy"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
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
