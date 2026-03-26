// 管理任务数据的状态

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTaskStore = defineStore('task', () => {
  // 从本地存储加载任务
  const loadTasksFromStorage = () => {
    const tasksStr = localStorage.getItem('tasks')
    if (tasksStr) {
      try {
        return JSON.parse(tasksStr)
      } catch (e) {
        console.error('加载任务失败:', e)
        return []
      }
    }
    return []
  }

  // 所有任务
  const tasks = ref(loadTasksFromStorage())

  // 计算属性：所有任务
  const allTasks = computed(() => tasks.value)

  // 计算属性：已完成任务
  const completedTasks = computed(() => 
    tasks.value.filter(task => task.status === '已完成')
  )

  // 计算属性：待办任务
  const pendingTasks = computed(() => 
    tasks.value.filter(task => task.status !== '已完成')
  )

  // 保存任务到本地存储
  const saveTasks = () => {
    localStorage.setItem('tasks', JSON.stringify(tasks.value))
  }

  // 添加任务
  const addTask = (taskData) => {
    const newTask = {
      id: Date.now().toString(),
      title: taskData.title || '',
      description: taskData.description || '',
      category: taskData.category || '工作',
      priority: taskData.priority || '中',
      deadline: taskData.deadline || null,
      status: taskData.status || '进行中',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tasks.value.push(newTask)
    saveTasks()
    return newTask
  }

  // 更新任务
  const updateTask = (taskId, updates) => {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value[index] = {
        ...tasks.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveTasks()
      return tasks.value[index]
    }
    return null
  }

  // 删除任务
  const deleteTask = (taskId) => {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      saveTasks()
      return true
    }
    return false
  }

  // 切换任务状态
  const toggleTaskStatus = (taskId) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = task.status === '已完成' ? '进行中' : '已完成'
      task.updatedAt = new Date().toISOString()
      saveTasks()
      return task
    }
    return null
  }

  // 清空所有任务
  const clearAllTasks = () => {
    tasks.value = []
    saveTasks()
  }

  // 刷新任务（从本地存储重新加载）
  const refreshTasks = () => {
    tasks.value = loadTasksFromStorage()
  }

  return {
    tasks,
    allTasks,
    completedTasks,
    pendingTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    clearAllTasks,
    refreshTasks,
    loadTasksFromStorage
  }
})
