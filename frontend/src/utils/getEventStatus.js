const STATUS_STYLE = {
    SCHEDULED: { text: 'Sắp diễn ra', className: 'bg-warning text-dark' },
    ONGOING: { text: 'Đang diễn ra', className: 'bg-success' },
    COMPLETED: { text: 'Đã kết thúc', className: 'bg-secondary' },
    CANCELLED: { text: 'Đã hủy', className: 'bg-danger' },
}
export function deriveEventStatus(event) {
    if (!event) return { text: 'Không xác định', className: 'bg-dark text-white' }
    if (event.status === 'cancelled') return STATUS_STYLE.CANCELLED
    if (event.status === 'scheduled') return STATUS_STYLE.SCHEDULED
    if (event.status === 'completed') return STATUS_STYLE.COMPLETED
    return STATUS_STYLE.ONGOING
}