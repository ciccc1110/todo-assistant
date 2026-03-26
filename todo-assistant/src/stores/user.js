import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 状态
  const currentUser = ref(null)
  const isLoggedIn = ref(false)

  // 计算属性
  const userId = computed(() => {
    return currentUser.value?.userId || null
  })

  const userName = computed(() => {
    return currentUser.value?.userName || '未登录'
  })

  // 🔥 生成固定的 userId（基于用户名）
  // 转换为纯英文+数字格式，移除中文和特殊字符
  function generateFixedUserId(userName) {
    // 将中文转换为拼音首字母或使用英文标识
    // 这里使用简单方案：如果有中文，使用 'user_' + 用户名的hash值
    // 如果是纯英文/数字，直接使用
    
    // 检测是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(userName)
    
    if (hasChinese) {
      // 包含中文，生成数字hash作为用户ID
      let hash = 0
      for (let i = 0; i < userName.length; i++) {
        const char = userName.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 转换为32位整数
      }
      // 使用正数hash
      const positiveHash = Math.abs(hash)
      return `user_${positiveHash}`
    } else {
      // 纯英文/数字，直接使用
      const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '_')
      return `user_${cleanName}`
    }
  }

  // 方法
  function login(userId, userName) {
    currentUser.value = {
      userId,
      userName,
      loginTime: new Date().toISOString()
    }
    isLoggedIn.value = true

    // 保存到本地存储
    localStorage.setItem('user_info', JSON.stringify(currentUser.value))
  }

  // 🔥 使用固定 userId 登录
  function loginWithFixedId(userName) {
    const fixedUserId = generateFixedUserId(userName)
    login(fixedUserId, userName)
  }

  function logout() {
    currentUser.value = null
    isLoggedIn.value = false

    // 清除本地存储
    localStorage.removeItem('user_info')
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem('user_info')
      if (stored) {
        currentUser.value = JSON.parse(stored)
        isLoggedIn.value = true
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  }

  function generateUniqueId() {
    // 生成唯一ID（基于时间戳和随机数）- 已弃用
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  return {
    currentUser,
    isLoggedIn,
    userId,
    userName,
    login,
    loginWithFixedId,  // 🔥 新增
    logout,
    loadFromStorage,
    generateFixedUserId,  // 🔥 新增
    generateUniqueId
  }
})
