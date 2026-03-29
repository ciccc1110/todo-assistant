<template>
  <div class="statistics">
    <!-- 顶部导航栏  -->
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">📋</div>
        </div>
        <div class="title">统计看板</div>
      </div>
      <div class="header-right">
        <div class="user-info">{{ userStore.userName }}</div>
        <el-button text @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button text @click="handleViewChat">
          <el-icon><ChatDotRound /></el-icon>
          对话
        </el-button>
        <el-button text @click="handleViewTasks">
          <el-icon><List /></el-icon>
          任务列表
        </el-button>
        <el-button text @click="handleLogout" type="danger">退出</el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
    </div>

  <!-- 主内容区 -->
    <div class="main-content">

      <!-- 时间维度筛选和生成报告 -->
      <div class="filter-actions">
        <div class="filter-group">
          <span class="filter-label">时间维度：</span>
            <el-radio-group v-model="timeDimension" @change="handleTimeDimensionChange">
              <el-radio-button value="week">本周</el-radio-button>
              <el-radio-button value="month">当月</el-radio-button>
              <el-radio-button value="custom">自定义</el-radio-button>
            </el-radio-group>

          <!-- 自定义日期范围选择器 -->
          <div v-if="timeDimension === 'custom'" class="custom-date-picker">
            <el-date-picker
              v-model="customDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="handleCustomDateChange"
              :clearable="false"
              style="width: 360px; margin-left: 12px"
            />

            <el-button
              :type="hasCustomDateRange ? 'primary' : 'info'"
              :plain="!hasCustomDateRange"
              :disabled="!hasCustomDateRange"
              @click="handleResetCustomDate"
              style="margin-left: 12px"
            >
              <el-icon><RefreshLeft /></el-icon>
              重置筛选
            </el-button>
          </div>
        </div>
        
        <!-- 生成报告按钮组 -->
        <div class="report-button-group">
          <el-button 
            type="primary" 
            @click="handleGenerateReport"
            :loading="isGenerating"
            size="large"
          >
            <el-icon><Document /></el-icon>
            {{ isGenerating ? '生成中...' : '生成报告' }}
          </el-button>
          <el-button 
            size="large"
            @click="showReportLogDialog = true"
          >
            <el-icon><Tickets /></el-icon>
            报告日志
            <el-badge v-if="pendingReportsCount > 0" :value="pendingReportsCount" class="badge" />
          </el-button>
        </div>
      </div>

      <!-- 总览卡片 -->
      <div class="overview-cards">
        <StatCard title="总任务数" :value="filteredStats.total" />
        <StatCard title="已完成" :value="filteredStats.completed" />
        <StatCard title="待办数" :value="filteredStats.pending" />
        <StatCard title="已过期" :value="filteredStats.expired" />
      </div>
      
      <!-- 完成率统计卡片（并列显示） -->
      <div class="overview-cards">
        <div class="rate-card blue-card">
          <div class="rate-icon">📊</div>
          <div class="rate-content">
            <div class="rate-title">完成率</div>
            <div class="rate-value">{{ completionRate }}%</div>
            <div class="rate-desc">已完成任务占总任务数的比例</div>
          </div>
        </div>
        <div class="rate-card purple-card">
          <div class="rate-icon">⏱️</div>
          <div class="rate-content">
            <div class="rate-title">准时完成率</div>
            <div class="rate-value">{{ onTimeCompletionRate }}%</div>
            <div class="rate-desc">截止时间前主动完成的任务占比</div>
          </div>
        </div>
                <div class="rate-card red-card">
          <div class="rate-icon">⚠️</div>
          <div class="rate-content">
            <div class="rate-title">逾期率</div>
            <div class="rate-value">{{ overdueRate }}%</div>
            <div class="rate-desc">逾期任务占总任务数的比例</div>
          </div>
        </div>
      </div>


      <!-- 完成率/任务增长率趋势图 -->
      <div class="chart-container">
        <h3>完成率趋势与任务增长率（{{ timeDimension === 'week' ? '本周' : (timeDimension === 'month' ? '当月' : '自定义时间段') }}）</h3>
        <div ref="trendChart" class="chart"></div>
      </div>

      <!-- 任务分类统计 -->
      <div class="chart-container">
        <h3>任务分类统计</h3>
        <div ref="categoryChart" class="chart"></div>
      </div>

      <!-- 优先级分布 -->
      <div class="chart-container">
        <h3>优先级分布</h3>
        <div ref="priorityChart" class="chart"></div>
      </div>
    </div>

<!-- 报告生成进度对话框 -->
    <el-dialog 
      v-model="reportDialogVisible" 
      title="正在生成报告" 
      width="450px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="report-progress-dialog"
    >
      <div class="report-loading">
        <el-icon class="is-loading" :size="48"><Loading /></el-icon>
        <p>AI 正在分析您的任务数据，生成个性化报告...</p>
        <p class="loading-tip">预计需要 30-60 秒，请耐心等待</p>
        <div class="loading-progress">
          <el-progress 
            :percentage="reportProgress" 
            :stroke-width="8"
            :show-text="true"
            :color="progressColor"
          />
        </div>
        <div class="loading-actions">
          <el-button text type="info" @click="handleCancelGenerate" size="small">
            后台生成，稍后查看
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 报告内容对话框 -->
    <el-dialog 
      v-model="showReportContentDialog" 
      :title="currentReportTitle" 
      width="80%"
      :close-on-click-modal="false"
      destroy-on-close
      class="report-dialog"
    >
      <div class="report-content" v-html="currentReportHtml"></div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleExportCurrentReport" :icon="Download">
            导出报告
          </el-button>
          <el-button @click="showReportContentDialog = false" :icon="Close">
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 报告日志对话框 -->
    <el-dialog 
      v-model="showReportLogDialog" 
      title="报告生成日志" 
      width="700px"
      class="report-log-dialog"
    >
      <div class="report-log-list">
        <div v-if="reportLogs.length === 0" class="empty-logs">
          <el-icon><Document /></el-icon>
          <p>暂无报告记录</p>
          <p class="empty-tip">点击"生成报告"开始创建您的第一份复盘报告</p>
        </div>
        <div v-else class="log-items">
          <div 
            v-for="log in reportLogs" 
            :key="log.id" 
            class="log-item"
            :class="{
              'log-pending': log.status === 'pending',
              'log-success': log.status === 'success',
              'log-failed': log.status === 'failed'
            }"
          >
            <div class="log-header">
              <div class="log-info">
                <el-icon v-if="log.status === 'pending'" class="is-loading"><Loading /></el-icon>
                <el-icon v-else-if="log.status === 'success'"><CircleCheck /></el-icon>
                <el-icon v-else><CircleClose /></el-icon>
                <span class="log-title">{{ log.title }}</span>
              </div>
              <div class="log-time">{{ log.createTime }}</div>
            </div>
            <div class="log-date-range">时间范围：{{ log.dateRange }}</div>
            <div class="log-actions" v-if="log.status === 'success'">
              <!-- 只保留导出按钮，移除查看按钮 -->
              <el-button size="small" type="primary" @click="exportReportLog(log)">
                <el-icon><Download /></el-icon>
                导出报告
              </el-button>
              <el-button size="small" type="danger" @click="deleteReportLog(log)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
            <div class="log-error" v-if="log.status === 'failed' && log.error">
              <el-icon><Warning /></el-icon>
              {{ log.error }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showReportLogDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useUserStore } from '@/stores/user'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Refresh, List, ChatDotRound, Document, RefreshLeft, Download, Close, Tickets, Loading, CircleCheck, CircleClose, View, Delete, Warning } from '@element-plus/icons-vue'
import StatCard from '@/components/StatCard.vue'
import { getTaskList, generateReport,generateReportAsync, getReportStatus, getReportLogs,deleteReportLog as deleteReportLogApi } from '@/api/task'

const router = useRouter()
const taskStore = useTaskStore()
const userStore = useUserStore()

const trendChart = ref(null)
const categoryChart = ref(null)
const priorityChart = ref(null)
const loading = ref(false)

// 报告相关状态
const reportDialogVisible = ref(false)
const showReportContentDialog = ref(false)
const showReportLogDialog = ref(false)
const isGenerating = ref(false)
const currentReportId = ref(null)
const currentReportTitle = ref('')
const currentReportHtml = ref('')
const currentRawReport = ref('')
const reportProgress = ref(0)
let progressInterval = null
let pollingInterval = null

// 报告日志列表
const reportLogs = ref([])

// 待处理报告数量
const pendingReportsCount = computed(() => {
  return reportLogs.value.filter(log => log.status === 'pending').length
})

// 进度条颜色
const progressColor = computed(() => {
  if (reportProgress.value < 30) return '#409EFF'
  if (reportProgress.value < 70) return '#E6A23C'
  return '#67C23A'
})

// 时间维度筛选：week-本周, month-当月, custom-自定义
const timeDimension = ref('week')
// 自定义日期范围
const customDateRange = ref([])

let trendChartInstance = null
let categoryChartInstance = null
let priorityChartInstance = null

// 根据时间维度过滤任务
const filteredTasks = computed(() => {
  const now = new Date()
  let startDate, endDate

  if (timeDimension.value === 'all') {
    // 全部：返回所有任务，不进行时间过滤
    return taskStore.tasks
  } else if (timeDimension.value === 'week') {
    // 本周：周一至周日
    const day = now.getDay() || 7 // 周日转为7
    startDate = new Date(now)
    startDate.setDate(now.getDate() - day + 1) // 周一
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date(now)
    endDate.setDate(now.getDate() + (7 - day)) // 周日
    endDate.setHours(23, 59, 59, 999)
  } else if (timeDimension.value === 'month') {
    // 当月：1日至月底
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endDate.setHours(23, 59, 59, 999)
  } else if (timeDimension.value === 'custom') {
    // 自定义日期范围
    if (customDateRange.value && customDateRange.value.length === 2) {
      startDate = new Date(customDateRange.value[0])
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(customDateRange.value[1])
      endDate.setHours(23, 59, 59, 999)
    } else {
      return []
    }
  }

  return taskStore.tasks.filter(task => {
    const taskDate = new Date(task.createdAt)
    return taskDate >= startDate && taskDate <= endDate
  })
})

const hasCustomDateRange = computed(() => {
  return Array.isArray(customDateRange.value) && customDateRange.value.length === 2
    && !!customDateRange.value[0] && !!customDateRange.value[1]
})


function handleResetCustomDate() {
  customDateRange.value = []
  refreshCharts()
  ElMessage.success('筛选条件已重置')
}



// 计算过滤后的任务统计
const filteredStats = computed(() => {
  const tasks = filteredTasks.value
  const completed = tasks.filter(t => t.status === '已完成').length
  const expired = tasks.filter(t => t.status === '已过期').length
  const total = tasks.length
  return {
    total: total,
    completed: completed,
    expired: expired,
    pending: total - completed - expired  // 待办数 = 总任务 - 已完成 - 已过期
  }
})

// 计算完成率：已完成 / 总任务数 × 100%
const completionRate = computed(() => {
  const total = filteredStats.value.total
  const completed = filteredStats.value.completed
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
})

// 计算准时完成率
const onTimeCompletionRate = computed(() => {
  const tasks = filteredTasks.value
  const completedOnTime = tasks.filter(task => {
    if (task.status !== '已完成' || !task.deadline || !task.completedAt) return false
    const completedAt = new Date(task.completedAt)
    const deadline = new Date(task.deadline)
    return completedAt <= deadline  // ✅ 完成时间 <= 截止时间 = 准时完成
  }).length

  const totalCompleted = filteredStats.value.completed
  if (totalCompleted === 0) return 0
  return Math.round((completedOnTime / totalCompleted) * 100)
})

// 计算逾期率
const overdueRate = computed(() => {
  const total = filteredStats.value.total
  const expired = filteredStats.value.expired
  if (total === 0) return 0
  return Math.round((expired / total) * 100)
})


console.log('📊 [Statistics] 组件初始化')

// 从API加载任务数据
async function loadTasksFromAPI() {
  loading.value = true
  try {
    console.log('🔄 [Statistics] 开始从API加载任务数据')
    console.log('👤 [Statistics] 当前用户ID:', userStore.userId)
    console.log('👤 [Statistics] userStore.isLoggedIn:', userStore.isLoggedIn)
    
    const tasksData = await getTaskList({}, userStore.userId)
    
    console.log('✅ [Statistics] API返回任务数量:', tasksData.length)
    console.log('📦 [Statistics] API任务数据:', tasksData)
    
    // 将API数据转换为taskStore格式
    const formattedTasks = tasksData.map(task => ({
      id: String(task.id),
      title: task.task_content,
      description: task.description || '',
      category: task.category || '其他',
      importance: task.importance || '中',
      deadline: task.deadline || null,
      status: task.status || '进行中',
      createdAt: task.created_at || new Date().toISOString(),
      updatedAt: task.updated_at || task.created_at || new Date().toISOString(),
      completedAt: task.completed_at || null
    }))
    
    console.log('✨ [Statistics] 格式化后任务数量:', formattedTasks.length)
    
    // 更新taskStore中的任务数据
    taskStore.tasks = formattedTasks
    
    console.log('🎯 [Statistics] taskStore已更新，当前任务数量:', taskStore.tasks.length)
    
    return formattedTasks
    
  } catch (error) {
    console.error('❌ [Statistics] 从API加载任务失败:', error)
    console.error('❌ [Statistics] 错误详情:', error.message)
    
    ElMessage.error('加载任务数据失败：' + error.message)
    return []
  } finally {
    loading.value = false
  }
}
// 启动进度动画
function startProgressAnimation() {
  reportProgress.value = 0
  if (progressInterval) clearInterval(progressInterval)
  
  progressInterval = setInterval(() => {
    if (reportProgress.value < 90) {
      const increment = reportProgress.value < 30 ? 10 : (reportProgress.value < 60 ? 5 : 2)
      reportProgress.value = Math.min(reportProgress.value + increment, 90)
    }
  }, 3000)
}

// 停止进度动画
function stopProgressAnimation() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  reportProgress.value = 100
  setTimeout(() => {
    reportProgress.value = 0
  }, 500)
}

// Statistics.vue - 修改轮询函数，传入 userId
function startPolling(reportId) {
  if (pollingInterval) clearInterval(pollingInterval)
  
  pollingInterval = setInterval(async () => {
    try {
      // 传入 userId
      const result = await getReportStatus(reportId, userStore.userId)
      
      if (result.status === 'success') {
        clearInterval(pollingInterval)
        pollingInterval = null
        stopProgressAnimation()
        isGenerating.value = false
        reportDialogVisible.value = false
        
        // 刷新日志列表
        await loadReportLogs()
        
        ElMessage.success('报告生成成功！')
        
      } else if (result.status === 'failed') {
        clearInterval(pollingInterval)
        pollingInterval = null
        stopProgressAnimation()
        isGenerating.value = false
        reportDialogVisible.value = false
        
        ElMessage.error('报告生成失败：' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('轮询报告状态失败:', error)
    }
  }, 3000)
}

// 加载报告日志
async function loadReportLogs() {
  try {
    const logs = await getReportLogs(userStore.userId)
    reportLogs.value = logs
  } catch (error) {
    console.error('加载报告日志失败:', error)
  }
}

// 生成报告处理（异步模式）
async function handleGenerateReport() {
  if (isGenerating.value) {
    ElMessage.warning('已有报告正在生成中，请稍后再试')
    return
  }
  
  isGenerating.value = true
  reportDialogVisible.value = true
  startProgressAnimation()
  
  try {
    console.log('📄 [Statistics] 开始异步生成报告')
    
    const { startDate, endDate } = getCurrentDateRange()
    const dateRangeText = `${startDate} 至 ${endDate}`
    const title = `复盘报告_${startDate}_${endDate}`
    
    console.log('📅 [Statistics] 报告时间范围:', startDate, '至', endDate)
    
    // 调用异步生成API
    const response = await generateReportAsync({
      user_id: userStore.userId,
      start_date: startDate,
      end_date: endDate,
      title: title
    })
    
    currentReportId.value = response.report_id
    
    // 添加到日志列表
    const newLog = {
      id: response.report_id,
      title: title,
      dateRange: dateRangeText,
      createTime: new Date().toLocaleString('zh-CN'),
      status: 'pending',
      content: null,
      error: null
    }
    reportLogs.value.unshift(newLog)
    
    // 开始轮询
    startPolling(response.report_id)
    
  } catch (error) {
    console.error('❌ [Statistics] 生成报告失败:', error)
    ElMessage.error('生成报告失败：' + error.message)
    reportDialogVisible.value = false
    isGenerating.value = false
    stopProgressAnimation()
  }
}

// 取消生成（后台继续）
function handleCancelGenerate() {
  reportDialogVisible.value = false
  ElMessage.info('报告正在后台生成，可在"报告日志"中查看结果')
}

// 获取当前筛选的日期范围
function getCurrentDateRange() {
  const now = new Date()
  let startDate, endDate
  
  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    startDate = new Date(now)
    startDate.setDate(now.getDate() - day + 1)
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date(now)
    endDate.setDate(now.getDate() + (7 - day))
    endDate.setHours(23, 59, 59, 999)
    
  } else if (timeDimension.value === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)
    
  } else if (timeDimension.value === 'custom' && customDateRange.value.length === 2) {
    startDate = new Date(customDateRange.value[0])
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date(customDateRange.value[1])
    endDate.setHours(23, 59, 59, 999)
    
  } else {
    startDate = new Date(now)
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)
  }
  
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

// 查看报告
function viewReport(log) {
  if (log.content) {
    currentReportTitle.value = log.title
    currentRawReport.value = log.content
    formatReportContent(log.content)
    showReportContentDialog.value = true
  } else {
    ElMessage.warning('报告内容不存在')
  }
}

// 格式化报告内容
function formatReportContent(markdown) {
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(cell => cell.trim())
      if (cells.some(cell => cell.includes('---'))) {
        return ''
      }
      const cellHtml = cells.map(cell => `<td>${cell.trim()}</td>`).join('')
      return `<tr>${cellHtml}</tr>`
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br>')
  
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table>$1</table>')
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
  
  currentReportHtml.value = html
}

// 导出当前报告
function handleExportCurrentReport() {
  if (!currentRawReport.value) {
    ElMessage.warning('没有可导出的报告内容')
    return
  }
  
  try {
    const blob = new Blob([currentRawReport.value], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentReportTitle.value}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('报告导出成功')
  } catch (error) {
    console.error('❌ [Statistics] 导出报告失败:', error)
    ElMessage.error('导出报告失败：' + error.message)
  }
}

// 导出报告（直接从工作流重新生成）
async function exportReportLog(log) {
  const loading = ElMessage.loading('正在生成报告内容...', { duration: 0 })
  
  try {
    // 重新调用工作流生成报告内容
    const reportContent = await generateReport({
      user_id: userStore.userId,
      start_date: log.startDate,
      end_date: log.endDate
    })
    
    if (reportContent) {
      const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${log.title}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      ElMessage.success('报告导出成功')
    } else {
      ElMessage.error('报告内容为空')
    }
  } catch (error) {
    console.error('导出报告失败:', error)
    ElMessage.error('导出失败：' + error.message)
  } finally {
    loading.close()
  }
}

// 删除报告日志
async function deleteReportLog(log) {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告"${log.title}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteReportLogApi(log.id, userStore.userId)
    reportLogs.value = reportLogs.value.filter(l => l.id !== log.id)
    ElMessage.success('删除成功')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 初始化完成率趋势与任务增长率混合图
function initTrendChart() {
  if (!trendChart.value) return

  if (trendChartInstance) {
    trendChartInstance.dispose()
  }

  trendChartInstance = echarts.init(trendChart.value)

   const now = new Date()
  const dates = []
  const completionRates = []
  const newTaskCounts = []

  // ✅ 根据时间维度，生成起止日期列表
  let dateList = []

  if (timeDimension.value === 'week') {
    // 本周：从周一到周日
    const day = now.getDay() || 7
    for (let i = -(day - 1); i <= (7 - day); i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      dateList.push(d)
    }
  } else if (timeDimension.value === 'month') {
    // ✅ 当月：从1号到今天（不是往前推N天！）
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.getDate()
    for (let d = 1; d <= today; d++) {
      dateList.push(new Date(year, month, d))
    }
  } else if (timeDimension.value === 'custom') {
    // 自定义：从 startDate 到 endDate
    if (customDateRange.value && customDateRange.value.length === 2) {
      const start = new Date(customDateRange.value[0])
      const end = new Date(customDateRange.value[1])
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dateList.push(new Date(d))
      }
    }
  }

  // 遍历日期列表，计算每天的数据
  dateList.forEach(date => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const displayDate = `${month}-${day}`
    dates.push(displayDate)

    // 累计完成率（截止当天）
    const tasksUpToDate = filteredTasks.value.filter(task => {
      const taskDate = new Date(task.createdAt)
      const ty = taskDate.getFullYear()
      const tm = String(taskDate.getMonth() + 1).padStart(2, '0')
      const td = String(taskDate.getDate()).padStart(2, '0')
      return `${ty}-${tm}-${td}` <= dateStr
    })
    const completedUpToDate = tasksUpToDate.filter(t => t.status === '已完成')
    const rate = tasksUpToDate.length > 0
      ? Math.round((completedUpToDate.length / tasksUpToDate.length) * 100)
      : 0
    completionRates.push(rate)

    // 当天新增任务数
    const count = filteredTasks.value.filter(task => {
      const taskDate = new Date(task.createdAt)
      const ty = taskDate.getFullYear()
      const tm = String(taskDate.getMonth() + 1).padStart(2, '0')
      const td = String(taskDate.getDate()).padStart(2, '0')
      return `${ty}-${tm}-${td}` === dateStr
    }).length
    newTaskCounts.push(count)
  })

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = `<div style="padding: 8px;"><strong>${params[0].axisValue}</strong></div>`
        params.forEach(param => {
          const marker = param.marker
          const seriesName = param.seriesName
          const value = param.value
          if (seriesName === '完成率') {
            result += `<div style="margin-top: 6px;">${marker} ${seriesName}: ${value}%</div>`
          } else {
            result += `<div style="margin-top: 6px;">${marker} ${seriesName}: ${value}个</div>`
          }
        })
        return result
      }
    },
    legend: {
      data: ['完成率', '任务增长率'],
      top: 0
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '完成率 (%)',
        min: 0,
        max: 100,
        position: 'left',
        axisLabel: {
          formatter: '{value}%'
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#409EFF'
          }
        }
      },
      {
        type: 'value',
        name: '任务数 (个)',
        min: 0,
        position: 'right',
        axisLabel: {
          formatter: '{value}'
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#67C23A'
          }
        }
      }
    ],
    series: [
      {
        name: '完成率',
        type: 'line',
        yAxisIndex: 0,
        data: completionRates,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        }
      },
      {
        name: '任务增长率',
        type: 'bar',
        yAxisIndex: 1,
        data: newTaskCounts,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }

  trendChartInstance.setOption(option)
}

// 初始化任务分类统计图
function initCategoryChart() {
  if (!categoryChart.value) return

  if (categoryChartInstance) {
    categoryChartInstance.dispose()
  }

  categoryChartInstance = echarts.init(categoryChart.value)

  // 使用过滤后的任务数据统计分类
  const categories = {}
  filteredTasks.value.forEach(task => {
    const category = task.category || '其他'
    categories[category] = (categories[category] || 0) + 1
  })

  const data = Object.keys(categories).map(key => ({
    name: key,
    value: categories[key]
  }))

  // 计算每个分类的百分比
  const total = taskStore.tasks.length || 0
  const dataWithPercentage = data.map(item => ({
    name: item.name,
    value: item.value,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}个 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      formatter: function(name) {
        const item = dataWithPercentage.find(d => d.name === name)
        return item ? `${name} ${item.percentage}%` : name
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: data,
      label: {
        formatter: '{b}\n{d}%',
        fontSize: 12
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }

  categoryChartInstance.setOption(option)
}

// 初始化优先级分布图
function initPriorityChart() {
  if (!priorityChart.value) return

  if (priorityChartInstance) {
    priorityChartInstance.dispose()
  }

  priorityChartInstance = echarts.init(priorityChart.value)

  // 使用过滤后的任务数据统计优先级
  const priorities = ['高', '中', '低']
  const total = filteredTasks.value.length || 0

  const data = priorities.map(priority => {
    const count = filteredTasks.value.filter(task => task.importance === priority).length
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
    return {
      name: priority,
      value: count,
      percentage: percentage
    }
  })

  // 使用百分比作为 Y 轴的最大值
  const maxPercentage = 100

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        const item = data.find(d => d.name === params[0].name)
        return `${params[0].name}优先级<br/>任务数: ${item.value}个<br/>占比: ${item.percentage}%`
      }
    },
    xAxis: {
      type: 'category',
      data: priorities
    },
    yAxis: {
      type: 'value',
      max: maxPercentage,
      min: 0,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        data: data.map(item => parseFloat(item.percentage)),
        type: 'bar',
        itemStyle: {
          color: (params) => {
            const colors = ['#F56C6C', '#E6A23C', '#67C23A']
            return colors[params.dataIndex]
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
        }
      }
    ]
  }

  priorityChartInstance.setOption(option)
}

// 时间维度切换处理
function handleTimeDimensionChange(value) {
  console.log('📊 [Statistics] 时间维度切换为:', value)
  refreshCharts()
}

// 自定义日期范围变化处理
function handleCustomDateChange(value) {
  console.log('📊 [Statistics] 自定义日期范围:', value)
  refreshCharts()
}


// 刷新所有图表
function refreshCharts() {
  console.log('🔄 [Statistics] refreshCharts 被调用')
  console.log('📦 [Statistics] 当前任务数量:', taskStore.tasks.length)
  console.log('📦 [Statistics] 已完成任务:', taskStore.completedTasks.length)
  console.log('📦 [Statistics] 待办任务:', taskStore.pendingTasks.length - taskStore.expiredTasks.length)
  console.log('📦 [Statistics] 已过期任务:', taskStore.expiredTasks.length)

  initTrendChart()
  initCategoryChart()
  initPriorityChart()
}

function handleRefresh() {
  loading.value = true
  loadTasksFromAPI().then(() => {
    try {
      refreshCharts()
      loadReportLogs()
      ElMessage.success('数据已刷新')
    } catch (error) {
      ElMessage.error('数据刷新失败')
    } finally {
      loading.value = false
    }
  })
}

function handleViewTasks() {
  router.push('/tasks')
}

function handleViewChat() {
  router.push('/chat')
}

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}

// 响应式调整图表大小
function handleResize() {
  trendChartInstance?.resize()
  categoryChartInstance?.resize()
  priorityChartInstance?.resize()
}

// 组件初始化（与TaskList.vue和BotChat.vue保持一致）
onMounted(() => {
  console.log('🚀 [Statistics] 组件已挂载')
  
  // 加载用户信息
  userStore.loadFromStorage()
  console.log('👤 [Statistics] 用户信息加载完成')
  console.log('👤 [Statistics] userId:', userStore.userId)
  console.log('👤 [Statistics] userName:', userStore.userName)
  console.log('👤 [Statistics] isLoggedIn:', userStore.isLoggedIn)
  
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    console.warn('⚠️ [Statistics] 用户未登录，跳转到登录页')
    router.push('/login')
    return
  }
  
  // 从API加载最新数据
  loadTasksFromAPI().then(() => {
    console.log('🎯 [Statistics] 数据加载完成，开始初始化图表')
    
    // 延迟初始化图表，确保DOM已渲染
    setTimeout(() => {
      refreshCharts()
    }, 300)
  })
  loadReportLogs()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  console.log('🔚 [Statistics] 组件已卸载')
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  categoryChartInstance?.dispose()
  priorityChartInstance?.dispose()
  stopProgressAnimation()
  if (pollingInterval) clearInterval(pollingInterval)
})
</script>

<style scoped lang="scss">
.statistics {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  position: relative;

  // 统一的导航栏样式
  .header {
    background: white;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    flex-shrink: 0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .logo {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;

        .logo-icon {
          font-size: 20px;
        }
      }

      .title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 6px; // 统一按钮间距

      .user-info {
        padding: 6px 12px;
        background-color: #F5F7FA;
        border-radius: 20px;
        font-size: 14px;
        color: #606266;
        font-weight: 500;
        margin-right: 8px;

        &::before {
          content: '👤';
          font-size: 16px;
        }
      }

      // 统一按钮样式
      .el-button {
        font-size: 14px;
        padding: 8px 12px;
        
        .el-icon {
          margin-right: 4px;
        }
      }
    }
  }

  // 主内容区
  .main-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    position: relative;

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;

       // 准时完成率卡片
      .rate-card {
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
        }

        // 蓝色卡片 - 完成率
        &.blue-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);

          &:hover {
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
        }

        // 紫色卡片 - 准时完成率
        &.purple-card {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          box-shadow: 0 2px 8px rgba(240, 147, 251, 0.2);

          &:hover {
            box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
          }
        }
        
        // 红色卡片 - 逾期率
        &.red-card {
          background: linear-gradient(135deg, #cb452e 0%, #e7ba27 100%);
          box-shadow: 0 2px 8px rgba(248, 80, 50, 0.2);

          &:hover {
            box-shadow: 0 4px 12px rgba(248, 80, 50, 0.3);
          }
        }

        .rate-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .rate-content {
          flex: 1;

          .rate-title {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 4px;
          }

          .rate-value {
            font-size: 32px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 4px;
          }

          .rate-desc {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }
    }

    .chart-container {
      background: #fff;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;

      h3 {
        font-size: 16px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 16px;
      }

      .chart {
        width: 100%;
        height: 300px;
      }
    }
  }

  .loading-overlay {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(245, 247, 250, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;     // ← 足够高，覆盖图表
    color: #909399;

    .el-icon {
      font-size: 48px;
      margin-bottom: 16px;
      animation: rotating 1.5s linear infinite;
    }

    span {
      font-size: 16px;
    }
  }
  .filter-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 24px;

    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;

      .filter-label {
        font-size: 14px;
        color: #606266;
        font-weight: 500;
      }
    }
    .custom-date-picker {
      display: flex;
      align-items: center;
    }
  }
}
// 报告内容样式
.report-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f5f7fa;
  
  // Markdown 内容样式
  h1, h2, h3, h4, h5, h6 {
    margin: 20px 0 12px 0;
    color: #303133;
    font-weight: 600;
  }

  h1 {
    font-size: 28px;
    border-bottom: 2px solid #e5e5e5;
    padding-bottom: 12px;
  }

  h2 {
    font-size: 24px;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 8px;
  }

  h3 {
    font-size: 20px;
  }

  h4 {
    font-size: 18px;
  }

  p {
    margin: 12px 0;
    line-height: 1.8;
    color: #606266;
  }

  strong {
    color: #303133;
    font-weight: 600;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);

    th, td {
      padding: 12px;
      border: 1px solid #e5e5e5;
      text-align: left;
      color: #606266;
    }

    th {
      background-color: #f5f7fa;
      font-weight: 600;
      color: #303133;
    }

    tr:hover {
      background-color: #f9fafc;
    }
  }

  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
    color: #606266;

    li {
      margin: 6px 0;
      line-height: 1.8;
    }
  }

  code {
    background-color: #f5f7fa;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
  }

  blockquote {
    border-left: 4px solid #409EFF;
    padding-left: 16px;
    margin: 16px 0;
    color: #909399;
    font-style: italic;
  }
}

// 对话框底部按钮样式
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  
  .el-button {
    min-width: 100px;
    
    .el-icon {
      margin-right: 6px;
    }
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
// 报告按钮组
.report-button-group {
  display: flex;
  gap: 12px;
  align-items: center;
  
  .badge {
    margin-left: 4px;
  }
}

// 报告进度对话框 - 居中样式
:deep(.report-progress-dialog) {
  .el-dialog {
    border-radius: 16px;
    
    .el-dialog__header {
      text-align: center;
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .el-dialog__body {
      text-align: center;
      padding: 20px 30px 30px;
    }
  }
}

// 报告加载样式（居中）
.report-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  
  .el-icon {
    color: #409EFF;
    margin-bottom: 24px;
  }
  
  p {
    font-size: 16px;
    color: #303133;
    margin: 0 0 12px 0;
  }
  
  .loading-tip {
    font-size: 14px;
    color: #909399;
    margin-bottom: 24px;
  }
  
  .loading-progress {
    width: 100%;
    margin: 16px 0;
  }
  
  .loading-actions {
    margin-top: 20px;
  }
}

// 报告日志对话框样式
.report-log-dialog {
  .report-log-list {
    min-height: 300px;
    max-height: 500px;
    overflow-y: auto;
  }
  
  .empty-logs {
    text-align: center;
    padding: 60px 20px;
    color: #909399;
    
    .el-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    
    p {
      margin: 8px 0;
    }
    
    .empty-tip {
      font-size: 12px;
      color: #c0c4cc;
    }
  }
  
  .log-items {
    .log-item {
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      background: #f5f7fa;
      transition: all 0.3s;
      
      &:hover {
        background: #ecf5ff;
      }
      
      &.log-pending {
        border-left: 3px solid #E6A23C;
      }
      
      &.log-success {
        border-left: 3px solid #67C23A;
      }
      
      &.log-failed {
        border-left: 3px solid #F56C6C;
      }
      
      .log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        
        .log-info {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .el-icon {
            font-size: 18px;
            
            &.is-loading {
              color: #E6A23C;
            }
          }
          
          .log-title {
            font-weight: 600;
            color: #303133;
          }
        }
        
        .log-time {
          font-size: 12px;
          color: #909399;
        }
      }
      
      .log-date-range {
        font-size: 13px;
        color: #606266;
        margin-bottom: 12px;
        padding-left: 26px;
      }
      
      .log-actions {
        padding-left: 26px;
        display: flex;
        gap: 8px;
      }
      
      .log-error {
        margin-top: 8px;
        padding: 8px 12px;
        background: #fef0f0;
        border-radius: 4px;
        font-size: 12px;
        color: #F56C6C;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }
  }
}
</style>