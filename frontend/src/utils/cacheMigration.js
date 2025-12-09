/**
 * Cache Migration Utility
 *
 * Migrates old localStorage cache format to new user-scoped format with TTL
 *
 * Old format:
 * - eventRoles: {eventId: role, ...}
 * - eventMembers: {eventId: {...}, ...}
 *
 * New format:
 * - eventRoles_{userId}: {eventId: role, ..., _timestamp: Date.now()}
 * - eventMembers_{userId}: {eventId: {...}, ..., _timestamp: Date.now()}
 */

/**
 * Clear all old format cache keys
 * This should be called once when user logs in to ensure clean state
 */
export function clearOldCacheFormat() {
  try {
    const keysToRemove = [];

    // Find all old format keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      // Remove old format keys (without user ID suffix)
      if (key === 'eventRoles' || key === 'eventMembers') {
        keysToRemove.push(key);
      }

      // Also remove any keys that don't have timestamp (old user-scoped format)
      if (key?.startsWith('eventRoles_') || key?.startsWith('eventMembers_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          // If no timestamp, it's old format
          if (!data._timestamp) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }

    // Remove all old keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`[CacheMigration] Cleared ${keysToRemove.length} old cache keys:`, keysToRemove);
    }

    return keysToRemove.length;
  } catch (error) {
    console.error('[CacheMigration] Error clearing old cache:', error);
    return 0;
  }
}

/**
 * Clear expired cache entries for all users
 * This can be called periodically to cleanup
 */
export function clearExpiredCache() {
  try {
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      // Check user-scoped cache keys
      if (key?.startsWith('eventRoles_') || key?.startsWith('eventMembers_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');

          // Check if expired
          if (data._timestamp && Date.now() - data._timestamp > CACHE_TTL) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }

    // Remove all expired keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`[CacheMigration] Cleared ${keysToRemove.length} expired cache keys`);
    }

    return keysToRemove.length;
  } catch (error) {
    console.error('[CacheMigration] Error clearing expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
  try {
    const stats = {
      oldFormat: [],
      userScoped: [],
      expired: [],
      valid: [],
      totalSize: 0
    };

    const CACHE_TTL = 24 * 60 * 60 * 1000;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key === 'eventRoles' || key === 'eventMembers') {
        stats.oldFormat.push(key);
      } else if (key?.startsWith('eventRoles_') || key?.startsWith('eventMembers_')) {
        try {
          const value = localStorage.getItem(key) || '{}';
          const data = JSON.parse(value);

          stats.totalSize += value.length;

          if (!data._timestamp) {
            stats.oldFormat.push(key);
          } else if (Date.now() - data._timestamp > CACHE_TTL) {
            stats.expired.push(key);
          } else {
            stats.valid.push({
              key,
              age: Math.floor((Date.now() - data._timestamp) / 1000 / 60), // minutes
              itemCount: Object.keys(data).length - 1 // -1 for _timestamp
            });
          }
        } catch (e) {
          stats.oldFormat.push(key);
        }
      }
    }

    return stats;
  } catch (error) {
    console.error('[CacheMigration] Error getting cache stats:', error);
    return null;
  }
}

/**
 * Force clear ALL event cache (nuclear option for debugging)
 */
export function clearAllEventCache() {
  try {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.includes('eventRoles') || key?.includes('eventMembers')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log(`[CacheMigration] CLEARED ALL EVENT CACHE (${keysToRemove.length} keys)`);

    return keysToRemove.length;
  } catch (error) {
    console.error('[CacheMigration] Error clearing all cache:', error);
    return 0;
  }
}

// Auto-run cleanup on module load (only once)
if (typeof window !== 'undefined') {
  // Clear old format cache on app load
  setTimeout(() => {
    clearOldCacheFormat();
    clearExpiredCache();
  }, 1000); // Wait 1s to not block initial render
}
