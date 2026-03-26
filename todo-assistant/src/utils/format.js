/** 
 * 格式化日期
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === -1) return '昨天'
  if (days > 0) return `${days}天后`
  return `${Math.abs(days)}天前`
}

/** 
 * 获取优先级颜色
 */
export function getPriorityColor(priority) {
  const colors = {
    '高': '#F56C6C',
    '中': '#E6A23C',
    '低': '#67C23A'
  }
  return colors[priority] || '#909399'
}

/**
 * 获取分类颜色
 */
export function getCategoryColor(category) {
  const colors = {
    '工作类': '#409EFF',
    '学习类': '#67C23A',
    '生活类': '#E6A23C',
    '出行类': '#F56C6C'
  }
  return colors[category] || '#909399'
}