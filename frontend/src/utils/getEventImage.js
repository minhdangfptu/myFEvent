/**
 * Return a valid image URL for an event.
 * Accepts event.image as string, array, or object. Falls back to provided default.
 */
export function getEventImage(event, fallback = '/default-events.jpg') {
  if (!event) return fallback
  const img = event.image ?? event.images ?? null
  if (!img) return fallback

  if (Array.isArray(img)) {
    for (const v of img) {
      if (typeof v === 'string' && v.trim()) return v
      if (v && typeof v === 'object' && (v.url || v.src)) return v.url ?? v.src
    }
    return fallback
  }

  if (typeof img === 'string' && img.trim()) return img

  if (img && typeof img === 'object') {
    if (typeof img.url === 'string' && img.url.trim()) return img.url
    if (typeof img.src === 'string' && img.src.trim()) return img.src
  }

  return fallback
}