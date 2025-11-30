/**
 * Format a MongoDB date value for display.
 * Supports: ISO string, timestamp (number), Date, or { $date: ... } / { date: ... } objects.
 * Returns 'dd/mm/yyyy' (vi-VN) or empty string on invalid input.
 */
export function formatDate(value) {
  if (value == null) return ''
  let d = null

  if (value instanceof Date) d = value
  else if (typeof value === 'number') d = new Date(value)
  else if (typeof value === 'string') d = new Date(value)
  else if (typeof value === 'object') {
    const v = value.$date ?? value.date ?? value
    if (v instanceof Date) d = v
    else if (typeof v === 'number' || typeof v === 'string') d = new Date(v)
    else return ''
  } else return ''

  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}
export function formatDateForInput(value) {
  if (!value) return '';
  let d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0]; // yyyy-MM-dd
}

/**
 * Format a date-time value for user-friendly display.
 * Returns format: 'dd/mm/yyyy hh:mm AM/PM' (e.g., "12/04/2025 07:49 PM")
 * @param {*} value - Date value (Date, string, number, or object)
 * @returns {string} Formatted date-time string or empty string
 */
export function formatDateTime(value) {
  if (value == null) return '';
  let d = null;

  if (value instanceof Date) d = value;
  else if (typeof value === 'number') d = new Date(value);
  else if (typeof value === 'string') d = new Date(value);
  else if (typeof value === 'object') {
    const v = value.$date ?? value.date ?? value;
    if (v instanceof Date) d = v;
    else if (typeof v === 'number' || typeof v === 'string') d = new Date(v);
    else return '';
  } else return '';

  if (Number.isNaN(d.getTime())) return '';

  // Format date as dd/mm/yyyy
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);

  // Format time as hh:mm AM/PM
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);

  return `${datePart} ${timePart}`;
}