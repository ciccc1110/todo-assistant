/**
 * taskCache.js
 * 任务数据本地缓存管理工具
 *
 * 策略：缓存优先 + 后台异步刷新
 * - 打开页面时先读取 localStorage 缓存，立即渲染
 * - 同时在后台发起 API 请求，拿到新数据后更新缓存并刷新页面
 * - 任务操作（增删改）后主动清除缓存，保证下次加载数据最新
 */

/** 缓存有效期：15 分钟（毫秒） */
const CACHE_TTL = 15 * 60 * 1000

/** 生成带用户隔离的缓存 key */
export const TASK_CACHE_KEY = (userId) =>
  `task_cache_${userId || 'anonymous'}`

/**
 * 读取任务缓存
 * @param {string} userId
 * @returns {Array|null} 缓存的任务列表，若无缓存或已过期则返回 null
 */
export function loadTaskCache(userId) {
  try {
    const raw = localStorage.getItem(TASK_CACHE_KEY(userId))
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL) {
      // 缓存已过期，清除并返回 null
      localStorage.removeItem(TASK_CACHE_KEY(userId))
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * 写入任务缓存
 * @param {string} userId
 * @param {Array} tasks 任务列表
 */
export function saveTaskCache(userId, tasks) {
  try {
    localStorage.setItem(
      TASK_CACHE_KEY(userId),
      JSON.stringify({ data: tasks, timestamp: Date.now() })
    )
  } catch (e) {
    // 存储配额超出时静默忽略，不影响功能
    console.warn('⚠️ 任务缓存写入失败（可能超出存储配额）:', e.message)
  }
}

/**
 * 主动使缓存失效（任务增删改后调用）
 * @param {string} userId
 */
export function invalidateTaskCache(userId) {
  localStorage.removeItem(TASK_CACHE_KEY(userId))
  console.log('🗑️ 任务缓存已失效（任务操作触发）')
}

/**
 * 缓存优先加载 + 后台异步刷新
 *
 * 使用方式：
 *   await cacheFirstLoad({
 *     userId,
 *     onCacheHit: (cachedTasks) => { /* 立即渲染缓存数据 *\/ },
 *     fetchFn: () => getTaskList({}, userId),
 *     onFetched: (freshTasks) => { /* 用新数据更新视图 *\/ },
 *     onError: (err) => { /* 处理请求失败 *\/ }
 *   })
 *
 * @param {Object} options
 * @param {string} options.userId - 用户 ID
 * @param {Function} options.onCacheHit - 命中缓存时的回调，参数为缓存数据
 * @param {Function} options.fetchFn - 实际 API 请求函数，需返回 Promise<Array>
 * @param {Function} options.onFetched - API 返回新数据后的回调，参数为新数据
 * @param {Function} [options.onError] - 请求失败时的回调，参数为 Error
 * @returns {Promise<boolean>} 是否命中缓存（true = 有缓存立即渲染了）
 */
export async function cacheFirstLoad({
  userId,
  onCacheHit,
  fetchFn,
  onFetched,
  onError
}) {
  const cached = loadTaskCache(userId)
  const hasCacheHit = !!cached

  if (hasCacheHit) {
    // ① 立即用缓存渲染，用户无感知延迟
    onCacheHit(cached)
  }

  // ② 后台异步拉取最新数据（无论有无缓存都执行）
  try {
    const freshData = await fetchFn()
    // 写入缓存
    saveTaskCache(userId, freshData)
    // 通知调用方更新视图
    onFetched(freshData)
  } catch (err) {
    console.error('❌ 后台刷新任务数据失败:', err)
    if (onError) onError(err)
  }

  return hasCacheHit
}