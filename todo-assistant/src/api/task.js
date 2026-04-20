/**
 * 待办任务 API
 * 
 * 通过 Coze Bot 的数据库查询能力获取任务数据
 * Bot 会查询 todo_list 表并返回结构化 JSON 数据
 */

import { callCozeBot } from './coze';


/**
 * 查询任务列表
 * @param {Object} filters - 筛选条件
 * @param {string} filters.date - 日期筛选
 * @param {string} filters.status - 状态筛选：'进行中' | '已完成' | ''
 * @param {string} filters.category - 分类筛选：'工作' | '学习' | '生活' | '其他' | ''
 * @param {string} filters.importance - 优先级筛选：'高' | '中' | '低' | ''
 * @param {string} filters.keyword - 关键词搜索
 * @param {string} userId - 用户ID（默认为 'user_default'）
 * @returns {Promise<Array>} 任务列表
 */
export async function getTaskList(filters = {}, userId = 'user_default') {
  try {
    console.log('🔍 开始查询任务列表');
    console.log('📋 筛选条件:', filters);
    
    // 构建查询指令
    let query = '查询我所有的待办任务，返回纯JSON格式数据';
    
    // 添加筛选条件（直接使用中文，不需要映射）
    const conditions = [];

    if (filters.date) {
      conditions.push(`截止日期为${filters.date}`);
    }
    
    if (filters.status) {
      conditions.push(`状态为${filters.status}`);
    }
    
    if (filters.category) {
      conditions.push(`分类为${filters.category}`);
    }
    
    if (filters.importance) {
      conditions.push(`优先级为${filters.importance}`);
    }
    
    if (filters.keyword) {
      conditions.push(`关键词包含"${filters.keyword}"`);
    }
    
    if (conditions.length > 0) {
      query += `，筛选条件：${conditions.join('、')}`;
    }
    
    // 添加 JSON 格式要求
    query += `

返回格式要求（必须是纯JSON，不要添加任何其他文字）：
{
  "type": "task_list",
  "data": {
    "total": 任务总数,
    "tasks": [
      {
        "id": 任务ID,
        "task_content": "任务内容",
        "category": "分类",
        "deadline": "截止时间(YYYY-MM-DD HH:mm:ss)",
        "importance": "优先级",
        "status": "状态",
        "created_at": "创建时间(YYYY-MM-DD HH:mm:ss)",
        "description": "描述",
        "updated_at": "更新时间(YYYY-MM-DD HH:mm:ss)",
        "completed_at": "完成时间(YYYY-MM-DD HH:mm:ss)" 
      }
    ]
  }
}

注意：必须是纯JSON格式，不要添加任何其他文字说明，不要有"以下是任务列表"这样的前缀。`;
    
    // 调用 Bot API
    const response = await callCozeBot(query, userId);
    
    console.log('📥 Bot响应:', response);
    
    // 解析返回的任务列表
    const tasks = parseTaskListFromResponse(response);
    
    console.log(`✅ 查询成功，共 ${tasks.length} 条任务`);
    
    return tasks;
    
  } catch (error) {
    console.error('❌ 查询任务列表失败:', error);
    throw error;
  }
}

/**
 * 从 Bot 响应中解析任务列表
 * 支持多种响应格式
 * @param {Object} response - Bot 响应对象
 * @returns {Array} 任务列表
 */
import JSONBig from 'json-bigint';

function parseTaskListFromResponse(response) {
  if (!response || !response.content) {
    console.warn('⚠️ 响应内容为空');
    return [];
  }

  const content = response.content;
  console.log('📝 解析响应内容:', content);

  try {
    // 使用 json-bigint 解析 JSON
    const jsonData = JSONBig.parse(content);
    console.log('📊 解析后的数据:', jsonData);

    let tasks = [];

    if (jsonData && jsonData.data && jsonData.data.tasks) {
      tasks = jsonData.data.tasks;
      console.log('📦 格式: 标准格式');
    } else if (jsonData && Array.isArray(jsonData.tasks)) {
      tasks = jsonData.tasks;
      console.log('📦 格式: 简化格式');
    } else if (Array.isArray(jsonData)) {
      tasks = jsonData;
      console.log('📦 格式: 直接数组');
    } else {
      console.warn('⚠️ 无法识别的数据格式:', jsonData);
      return [];
    }

    // 确保任务 ID 的正确性
    const formattedTasks = tasks.map(task => formatTaskData(task));
    console.log('✨ 格式化后的任务:', formattedTasks);

    return formattedTasks;

  } catch (error) {
    console.error('❌ 解析任务列表失败:', error);
    return [];
  }
}

/** 
 * 格式化任务数据
 * @param {Object} task - 原始任务数据
 * @returns {Object} 格式化后的任务数据
 */
function formatTaskData(task) {
  return {
    // ✅ 确保 ID 始终是字符串类型
    id: String(task.id || '0'),
    task_content: task.task_content || '',
    category: task.category || '其他',
    deadline: formatDateTimeForDisplay(task.deadline),
    importance: task.importance || '中',
    status: task.status || '进行中',
    created_at: formatDateTime(task.created_at),
    updated_at: formatDateTime(task.updated_at),
    description: task.description || '',
    completed_at: formatDateTime(task.completed_at)
  };
}
/**
 * 格式化日期时间（用于数据库存储）
 * @param {string|Date} datetime - 日期时间
 * @returns {string} 格式化后的日期时间：YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(datetime) {
  if (!datetime) return '';
  
  if (typeof datetime === 'string') {
    // 如果已经是格式化过的字符串，直接返回
    if (datetime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return datetime;
    }
    // 匹配格式：2026-03-25 15:00（只有时分）
    if (datetime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
      return datetime + ':00';
    }
    // 匹配格式：2026-03-25（只有日期）
    if (datetime.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return datetime + ' 00:00:00';
    }
    // 尝试解析
    const parsedDate = new Date(datetime);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const hours = String(parsedDate.getHours()).padStart(2, '0');
      const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
      const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
  
  return datetime;
}

/**
 * 格式化日期时间用于显示（保留完整的日期和时间，不截断）
 * @param {string|Date} datetime - 日期时间
 * @returns {string} 格式化后的日期时间：YYYY-MM-DD HH:mm
 */
function formatDateTimeForDisplay(datetime) {
  if (!datetime) return '';
  
  if (typeof datetime === 'string') {
    // 匹配格式：2026-03-25 15:00:00
    if (datetime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      const match = datetime.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2}$/);
      if (match) {
        return `${match[1]} ${match[2]}`;
      }
    }
    // 匹配格式：2026-03-25 15:00
    if (datetime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
      return datetime;
    }
    // 匹配格式：2026-03-25
    if (datetime.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return datetime;
    }
    // 尝试解析
    const parsedDate = new Date(datetime);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const hours = String(parsedDate.getHours()).padStart(2, '0');
      const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }
  
  return datetime;
}

/**
 * 格式化显示日期时间（用于报告日志）
 * @param {string} datetime - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
function formatDisplayDateTime(datetime) {
  if (!datetime) return '';
  
  if (typeof datetime === 'string') {
    if (datetime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return datetime.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}):\d{2}/, '$1 $2');
    }
    if (datetime.includes('T')) {
      return datetime.replace('T', ' ').substring(0, 16);
    }
  }
  return datetime;
}

/**
 * 添加任务
 * @param {Object} task - 任务数据
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 添加结果
 */
export async function addTask(task, userId = 'user_default') {
  const query = `添加任务：
任务内容: "${task.task_content}"
分类: ${task.category}
截止日期: ${task.deadline || '无'}
优先级: ${task.importance}
描述: ${task.description || ''}`;
  
  const response = await callCozeBot(query, userId);
  return response;
}

/**
 * 更新任务
 * @param {Object} task - 任务数据
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 更新结果
 */
export async function updateTask(task, userId = 'user_default') {
  const taskId = String(task.id);
  
  const query = `修改任务：
    任务ID: ${taskId}
    任务内容: "${task.task_content}"
    分类: ${task.category}
    截止日期: ${task.deadline || '无'}
    优先级: ${task.importance}
    状态: ${task.status}
    描述: ${task.description || ''}`;
  
  const response = await callCozeBot(query, userId);
  return response;
}

/** 
 * 删除任务
 * @param {number|string} taskId - 任务ID
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteTask(taskId, userId = 'user_default') {
  const taskIdStr = String(taskId);
  const query = `删除任务ID为 ${taskIdStr} 的任务`;
  
  const response = await callCozeBot(query, userId);
  return response;
}

/**
 * 更新任务状态
 * @param {number|string} taskId - 任务ID
 * @param {string} status - 新状态：'进行中' | '已完成'
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 更新结果
 */
export async function updateTaskStatus(taskId, status, userId = 'user_default') {
  const taskIdStr = String(taskId);
  const statusText = status === '已完成' ? '已完成' : '进行中';
  const query = `将任务ID为 ${taskIdStr} 的任务标记为${statusText}`;
  
  const response = await callCozeBot(query, userId);
  return response;
}

/**
 * 统计任务数量
 * @param {Object} filters - 筛选条件
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 统计结果 { total, pending, completed }
 */
export async function countTasks(filters = {}, userId = 'user_default') {
  try {
    const tasks = await getTaskList(filters, userId);
    
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === '进行中').length;
    const completed = tasks.filter(t => t.status === '已完成').length;
    
    return { total, pending, completed };
  } catch (error) {
    console.error('统计任务数量失败:', error);
    throw error;
  }
}

/**
 * 从工作流 answer 文本中提取 status 字段
 *
 * 根据已观测到的两种实际输出格式（冒号类型不稳定）：
 *   格式 A：  "状态: failed\n报告内容: null"          （半角冒号 + 空格）
 *   格式 B：  "报告生成失败，具体信息如下：\n- 状态：failed\n- 报告内容：null"  （全角冒号）
 *
 * 策略：
 *   1. 用同时兼容全角/半角冒号的正则，在全文中搜索"状态"关键词行
 *   2. 提取 status 值后转小写，并判断 "报告内容" 行是否为 null/空
 *   3. 若找不到"状态"关键词 → 整段文本视为正常报告正文（success 场景）
 *
 * @param {string} answerText - Bot answer 消息的原始文本
 * @returns {{ workflowStatus: string, reportContent: string }}
 */
function parseWorkflowAnswerText(answerText) {
  if (!answerText) {
    return { workflowStatus: 'success', reportContent: '' }
  }

  const text = answerText.trim()

  // 兼容半角冒号（:）和全角冒号（：），冒号后允许有空格或无空格
  // 同时兼容带 "- " 列表前缀的格式（格式 B）
  const COLON = '[：:]'  // 字符类：匹配全角或半角冒号

  const statusRegex   = new RegExp(`(?:^|\\n)-?\\s*状态${COLON}\\s*(\\S+)`, 'i')
  const contentRegex  = new RegExp(`(?:^|\\n)-?\\s*报告内容${COLON}\\s*([\\s\\S]*?)(?:\\n|$)`, 'i')

  const statusMatch  = text.match(statusRegex)
  const contentMatch = text.match(contentRegex)

  if (statusMatch) {
    const workflowStatus = statusMatch[1].toLowerCase().trim()

    let reportContent = ''
    if (contentMatch) {
      const raw = contentMatch[1].trim()
      // "null"、空字符串均视为无内容
      reportContent = (raw === 'null' || raw === '') ? '' : raw
    }

    console.log(
      `📊 [task.js] 解析工作流 answer →`,
      `status="${workflowStatus}"`,
      `contentEmpty=${!reportContent}`
    )
    return { workflowStatus, reportContent }
  }

  // 没有匹配到"状态"关键词 → 整段文本是正常的报告正文
  return { workflowStatus: 'success', reportContent: text }
}

/**
 * 生成无任务数据时的兜底报告内容（Markdown 格式）
 * 当工作流返回 status=failed 且大模型报告内容为空时调用
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {string} Markdown 内容
 */
export function generateEmptyReportContent(startDate, endDate) {
  return `# ${startDate} - ${endDate} 复盘报告

## 执行摘要

在 **${startDate}** 至 **${endDate}** 期间，系统未检测到任何任务数据。本周期内暂无可用于分析的任务记录。

---

## 📭 本周期无任务数据

| 指标 | 数值 |
|------|------|
| 总任务数 | 0 |
| 已完成任务 | 0 |
| 进行中任务 | 0 |
| 已过期任务 | 0 |
| 完成率 | — |
| 准时完成率 | — |

---

## 可能的原因

- 该时间段内未添加任何待办任务
- 任务数据尚未同步至系统
- 时间范围设置与实际任务创建时间不匹配

---

## 改进建议

1. **养成记录习惯**：尝试每天开始前将当日计划录入系统，帮助追踪进度
2. **回顾时间范围**：如有任务但未显示，可调整统计时间维度重新生成报告
3. **设置周期目标**：在新的周期开始时，为自己设定明确的任务目标，以便后续复盘

---

> 💡 开始记录你的第一个任务，下次复盘将呈现完整的数据分析与洞察报告。`;
}

/**
 * 同步生成任务复盘报告
 *
 * ★ 工作流 status 字段说明：
 *   Coze 工作流 returnVariables 模式下，输出变量被拼入 answer 文本，
 *   实际观测到两种格式（冒号类型不固定）：
 *
 *   格式 A（半角冒号）：
 *     "状态: failed\n报告内容: null"
 *
 *   格式 B（全角冒号 + 列表前缀）：
 *     "报告生成失败，具体信息如下：\n- 状态：failed\n- 报告内容：null"
 *
 *   当 status === 'failed' 且 reportContent 为空时，
 *   自动填充兜底 Markdown 报告，返回 isEmpty=true。
 *
 * @param {Object} params
 * @param {string} params.user_id
 * @param {string} params.start_date
 * @param {string} params.end_date
 * @param {string} [params.title]
 * @returns {Promise<{ content: string, title: string, status: string, isEmpty: boolean }>}
 */
export async function generateReport(params) {
  console.log('📄 [task.js] 开始同步生成报告', params);

  const query = `调用工作流 report_created 生成任务复盘报告。
参数：
- user_id: ${params.user_id}
- start_date: ${params.start_date}
- end_date: ${params.end_date}

请返回工作流的 string 输出变量（Markdown格式的报告内容）。不要添加任何额外文字，只返回 Markdown 报告正文。`;

  try {
    const response = await callCozeBot(query, params.user_id);
    console.log('✅ [task.js] Bot 调用成功');

    // 解析 answer 文本，兼容全角/半角冒号、带列表前缀等所有已观测格式
    const { workflowStatus, reportContent } = parseWorkflowAnswerText(response.content || '')

    // 触发条件：status === 'failed'  且  大模型内容为空
    const isFailed       = workflowStatus === 'failed'
    const isContentEmpty = !reportContent || reportContent.trim().length === 0
    const isEmpty        = isFailed && isContentEmpty

    console.log(
      `📊 [task.js] status="${workflowStatus}"`,
      `| contentEmpty=${isContentEmpty}`,
      `| isEmpty(兜底)=${isEmpty}`
    )

    const finalContent = isEmpty
      ? generateEmptyReportContent(params.start_date, params.end_date)
      : reportContent

    return {
      content : finalContent,
      title   : params.title || `复盘报告_${params.start_date}_${params.end_date}`,
      status  : workflowStatus,
      isEmpty
    };
  } catch (error) {
    console.error('❌ [task.js] 生成报告失败:', error);
    throw error;
  }
}


/**
 * 解析报告日志列表
 */
function parseReportLogsFromResponse(response) {
  if (!response || !response.content) return [];

  const content = response.content;

  try {
    let jsonStr = content;
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    const jsonData = JSONBig.parse(jsonStr);
    
    let reports = [];
    if (jsonData && jsonData.data && jsonData.data.reports) {
      reports = jsonData.data.reports;
    } else if (jsonData && Array.isArray(jsonData.reports)) {
      reports = jsonData.reports;
    } else if (Array.isArray(jsonData)) {
      reports = jsonData;
    } else {
      return [];
    }
    
    return reports.map(report => {
      let statusType = 'pending';
      if (report.status === 'success' || report.status === 'completed') {
        statusType = 'success';
      } else if (report.status === 'failed') {
        statusType = 'failed';
      }
      
      return {
        id: report.id,
        title: `复盘报告_${report.start_date || ''}_${report.end_date || ''}`,
        dateRange: `${report.start_date || ''} 至 ${report.end_date || ''}`,
        createTime: formatDisplayDateTime(report.created_at),
        status: statusType,
        startDate: report.start_date,
        endDate: report.end_date,
        content: null,
        error: null
      };
    });
    
  } catch (error) {
    console.error('❌ 解析报告日志列表失败:', error);
    return [];
  }
}

// 导出
export default {
  getTaskList,
  addTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  countTasks,
  generateReport,
  generateEmptyReportContent,
  parseTaskListFromResponse,
  formatTaskData
};