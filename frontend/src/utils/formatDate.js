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