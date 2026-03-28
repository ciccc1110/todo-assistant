import request from '@/utils/request'

// Coze Bot 配置

const COZE_CONFIG = {
  bot_id: '7610285463999381558',  // 你的Bot ID
  api_url: 'https://api.coze.cn/open_api/v2/chat',
  api_key: 'pat_ek2yIAeokxcXfAnyrIKc46sOrDPY7n8FNdtwBTho9yTOlvzDHn0hMJbR2bHWjMWo'  // ← 在这里填入你的真实API密钥
}


/**
 * API 请求重试机制（带指数退避）
 * @param {Function} apiCall - API 调用函数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} API 响应数据
 */
async function callApiWithRetry(apiCall, maxRetries = 2) {
  let retries = 0

  while (retries <= maxRetries) {
    try {
      const result = await apiCall()
      return result
    } catch (error) {
      retries++

      // 判断是否应该重试
      const shouldRetry =
        error.message.includes('timeout') ||
        error.message.includes('Network Error') ||
        error.response?.status >= 500

      if (retries > maxRetries || !shouldRetry) {
        throw error
      }

      console.warn(`⚠️ 请求失败，正在重试（${retries}/${maxRetries}）...`)
      console.warn(`⚠️ 错误信息: ${error.message}`)

      // 指数退避策略，每次重试等待时间翻倍
      const delay = 1000 * Math.pow(2, retries - 1)
      console.warn(`⏰ 等待 ${delay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}


/**
 * 调用 Coze Bot API（支持自定义变量）
 * @param {string} query - 用户输入的问题
 * @param {string} userId - 用户ID（可选，默认 'user_default'）
 * @param {string} conversationId - 对话ID（可选，用于保持上下文）
 * @param {Object} customVars - 自定义变量（可选，如 { task_id: 'xxx' }）
 * @returns {Promise<Object>} Bot响应数据
 */
export async function callCozeBot(query, userId = 'user_default', conversationId = null, customVars = {}) {
  try {
    console.log('正在调用Coze Bot API...')
    console.log('Bot ID:', COZE_CONFIG.bot_id)
    console.log('用户输入:', query)
    console.log('用户ID:', userId)
    console.log('自定义变量:', customVars)

    // 构建符合 Coze API v2 规范的请求体
    const requestData = {
      bot_id: COZE_CONFIG.bot_id,
      user: userId,
      query: query,
      stream: false,
      additional_messages: [],
      // 🔥 传递自定义变量给 Bot 工作流
      // Bot 工作流中可以通过 {{custom_variables.task_id}} 获取此值
      custom_variables: {
        app_userid: userId,
        channel: 'chat',
        ...customVars  // 🔥 支持传入额外的自定义变量，如 task_id
      }
    }

    // 如果提供了 conversation_id，添加到请求中（保持对话上下文）
    if (conversationId) {
      requestData.conversation_id = conversationId
    }

    console.log('请求数据:', JSON.stringify(requestData, null, 2))

    // 发送请求（带超时配置和重试机制）
    const response = await callApiWithRetry(async () => {
      return await request.post(COZE_CONFIG.api_url, requestData, {
        headers: {
          'Authorization': `Bearer ${COZE_CONFIG.api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000  // 🔥 设置超时时间为60秒，避免默认30秒超时导致请求失败
      })
    }, 2)  // 最大重试2次

    console.log('Bot响应:', response)

    // 解析 Coze 返回的数据
    // Coze API v2 返回格式：{ code: 0, msg: 'success', messages: [...], conversation_id: '...' }
    if (response.code === 0 && response.messages) {
      console.log('✅ API 调用成功')
      console.log('消息数量:', response.messages.length)

      const messages = response.messages || []

      // 找到 type 为 'answer' 的消息（Bot 的最终回答）
      const answerMessage = messages.find(m => m.type === 'answer')

      if (answerMessage) {
        console.log('✅ 找到 answer 消息:', answerMessage.content)
      } else {
        console.warn('⚠️ 未找到 answer 类型的消息')
      }

      const botResponse = {
        type: determineResponseType(messages),
        content: extractContent(messages),
        task: extractTask(messages),
        quickQuestions: [],
        quickButtons: [],
        conversation_id: response.conversation_id // 保存 conversation_id
      }

      console.log('解析后的Bot响应:', botResponse)
      console.log('对话ID:', response.conversation_id)
      return botResponse
    } else {
      console.error('❌ Bot返回错误:', response)
      throw new Error(response.msg || 'Bot调用失败')
    }
  } catch (error) {
    console.error('Coze API调用失败:', error)

    // 如果是网络错误，给出更友好的提示
    if (error.message.includes('Network Error')) {
      throw new Error('网络连接失败，请检查网络设置')
    }

    // 如果是 API 密钥错误
    if (error.response?.status === 401) {
      throw new Error('API 密钥错误，请检查 coze.js 中的 api_key 配置')
    }

    // 如果是超时错误
    if (error.message.includes('timeout')) {
      throw new Error('请求超时，请稍后重试')
    }

    throw error
  }
}

/**
 * 判断响应类型
 */
function determineResponseType(messages) {
  if (!messages || messages.length === 0) {
    return 'chat'
  }

  const lastMessage = messages[messages.length - 1]

  // 检查是否是任务相关的响应
  if (lastMessage.type === 'answer') {
    const content = lastMessage.content || ''

    // 简单判断：如果包含"任务"、"添加"等关键词，可能是任务操作
    if (content.includes('任务') || content.includes('添加') || content.includes('删除')) {
      return 'task'
    }
  }

  return 'chat'
}

/**
 * 提取文本内容
 */
function extractContent(messages) {
  if (!messages || messages.length === 0) {
    return '抱歉，我没有理解您的话。'
  }

  // 查找类型为 'answer' 的消息
  const answerMessage = messages.find(m => m.type === 'answer')

  if (answerMessage && answerMessage.content) {
    return answerMessage.content
  }

  // 如果没有 answer 类型的消息，返回最后一条消息的内容
  const lastMessage = messages[messages.length - 1]
  return lastMessage?.content || '抱歉，我没有理解您的话。'
}

/**
 * 提取任务信息（如果Bot返回的是任务）
 */
function extractTask(messages) {
  if (!messages || messages.length === 0) {
    return null
  }

  const answerMessage = messages.find(m => m.type === 'answer')

  if (answerMessage && answerMessage.content) {
    try {
      // 尝试解析JSON格式的任务信息
      const jsonData = JSON.parse(answerMessage.content)

      if (jsonData.type === 'task' && jsonData.data) {
        return jsonData.data
      }
    } catch (e) {
      // 如果不是JSON格式，说明只是普通对话，没有任务信息
      console.warn('无法解析任务信息，可能是普通对话:', e)
    }
  }

  return null
}

/**
 * 获取多轮对话的conversation_id
 */
export function getConversationId(response) {
  if (response && response.data && response.data.conversation_id) {
    return response.data.conversation_id
  }
  return ''
}
