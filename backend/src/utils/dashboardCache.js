const dashboardCache = new Map()

const toCacheKey = (eventId) => `dashboard:${eventId}`

export const getCachedDashboard = (eventId) => {
  if (!eventId) return null

  const key = toCacheKey(eventId)
  const cached = dashboardCache.get(key)
  if (!cached) return null

  if (cached.expiresAt < Date.now()) {
    dashboardCache.delete(key)
    return null
  }

  return cached.data
}

export const setCachedDashboard = (eventId, data, ttlMs) => {
  if (!eventId || !data) return

  const ttl = Number.isFinite(ttlMs) ? ttlMs : 0
  const expiresAt = ttl > 0 ? Date.now() + ttl : Date.now()

  dashboardCache.set(toCacheKey(eventId), { expiresAt, data })
}

export const invalidateDashboardCache = (eventId) => {
  if (!eventId) return
  dashboardCache.delete(toCacheKey(eventId))
}

