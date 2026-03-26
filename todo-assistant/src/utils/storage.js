
function getTaskStorageKey(userId) {
  return `todo_assistant_tasks_${userId || 'anonymous'}`
}

/**
 * 保存任务到本地存储
 */

// 需要传入 userId
export function saveTasks(tasks, userId) {
  try {
    localStorage.setItem(getTaskStorageKey(userId), JSON.stringify(tasks))
  } catch (error) {
    console.error('保存任务失败:', error)
  }
}

/** 
 * 从本地存储加载任务
 */

// 需要传入 userId
export function loadTasks(userId) {
  try {
    const data = localStorage.getItem(getTaskStorageKey(userId))
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('加载任务失败:', error)
    return []
  }
}

/**
 * 清空本地存储
 */

// 需要传入 userId
export function clearTasks(userId) {
  localStorage.removeItem(getTaskStorageKey(userId))
}

/** 
 * 导出任务数据
 */
// 需要传入 userId
export function exportTasks(userId) {
  const tasks = loadTasks(userId)
  const dataStr = JSON.stringify(tasks, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tasks_export_${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 导入任务数据
 */
export function importTasks(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const tasks = JSON.parse(e.target.result)
        resolve(tasks)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}