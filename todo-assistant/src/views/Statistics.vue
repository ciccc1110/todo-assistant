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

        <!-- 生成报告按钮 -->
        <div class="report-button-group">
          <el-button
            type="primary"
            @click="handleGenerateReport"
            :loading="isGenerating"
            size="large"
          >
            <el-icon v-if="!isGenerating"><Document /></el-icon>
            {{ isGenerating ? 'AI 生成中...' : '生成复盘报告' }}
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

    <!-- ========== 报告生成中 Loading 对话框 ========== -->
    <el-dialog
      v-model="reportLoadingVisible"
      title=""
      width="460px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="report-loading-dialog"
    >
      <div class="report-loading-body">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring delay1"></div>
          <div class="spinner-ring delay2"></div>
        </div>
        <h3 class="loading-title">AI 正在生成复盘报告</h3>
        <p class="loading-sub">正在分析您的任务数据，生成个性化洞察...</p>
        <div class="loading-steps">
          <div class="step" :class="{ active: loadingStep >= 1, done: loadingStep > 1 }">
            <span class="step-icon">{{ loadingStep > 1 ? '✓' : '①' }}</span>
            <span>收集任务数据</span>
          </div>
          <div class="step" :class="{ active: loadingStep >= 2, done: loadingStep > 2 }">
            <span class="step-icon">{{ loadingStep > 2 ? '✓' : '②' }}</span>
            <span>分析完成情况</span>
          </div>
          <div class="step" :class="{ active: loadingStep >= 3, done: loadingStep > 3 }">
            <span class="step-icon">{{ loadingStep > 3 ? '✓' : '③' }}</span>
            <span>生成报告内容</span>
          </div>
          <div class="step" :class="{ active: loadingStep >= 4 }">
            <span class="step-icon">④</span>
            <span>格式化输出</span>
          </div>
        </div>
        <div class="loading-progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <p class="loading-hint">预计需要 30–60 秒，请耐心等待</p>
      </div>
    </el-dialog>

    <!-- ========== 报告展示对话框 ========== -->
    <el-dialog
      v-model="reportContentVisible"
      :title="currentReportTitle"
      width="860px"
      top="4vh"
      class="report-content-dialog"
      destroy-on-close
    >
      <div class="report-viewer" ref="reportViewerRef">
        <!-- 报告头部信息 -->
        <div class="report-meta">
          <div class="report-meta-item">
            <span class="meta-label">📅 时间范围</span>
            <span class="meta-value">{{ currentReportDateRange }}</span>
          </div>
          <div class="report-meta-item">
            <span class="meta-label">👤 用户</span>
            <span class="meta-value">{{ userStore.userName }}</span>
          </div>
          <div class="report-meta-item">
            <span class="meta-label">🕐 生成时间</span>
            <span class="meta-value">{{ currentReportGenTime }}</span>
          </div>
        </div>
        <!-- Markdown 渲染区 -->
        <div class="markdown-body" v-html="renderedMarkdown"></div>
      </div>

      <template #footer>
        <div class="report-dialog-footer">
          <el-button type="primary" @click="handleExportPdf" :loading="isExportingPdf">
            <el-icon><Download /></el-icon>
            {{ isExportingPdf ? '导出中...' : '导出 PDF' }}
          </el-button>
          <el-button @click="handleExportMarkdown">
            <el-icon><Document /></el-icon>
            导出 Markdown
          </el-button>
          <el-button @click="reportContentVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useUserStore } from '@/stores/user'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Refresh, List, ChatDotRound, Document,
  RefreshLeft, Download, Loading
} from '@element-plus/icons-vue'
import StatCard from '@/components/StatCard.vue'
import { getTaskList, generateReport } from '@/api/task'

const router = useRouter()
const taskStore = useTaskStore()
const userStore = useUserStore()

const trendChart = ref(null)
const categoryChart = ref(null)
const priorityChart = ref(null)
const loading = ref(false)

// ─── 报告相关状态 ────────────────────────────────────────────────
const reportLoadingVisible = ref(false)   // 生成中 loading 弹窗
const reportContentVisible = ref(false)   // 报告展示弹窗
const isGenerating = ref(false)
const isExportingPdf = ref(false)

const currentReportTitle = ref('')
const currentReportDateRange = ref('')
const currentReportGenTime = ref('')
const currentMarkdown = ref('')           // 原始 markdown
const renderedMarkdown = ref('')          // 渲染后 HTML

const reportViewerRef = ref(null)

// 生成中动画进度
const loadingStep = ref(1)
const loadingProgress = ref(0)
let loadingTimer = null

// ─── 时间维度筛选 ─────────────────────────────────────────────────
const timeDimension = ref('week')
const customDateRange = ref([])

let trendChartInstance = null
let categoryChartInstance = null
let priorityChartInstance = null

// ─── 计算属性 ─────────────────────────────────────────────────────
const filteredTasks = computed(() => {
  const now = new Date()
  let startDate, endDate

  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    startDate = new Date(now); startDate.setDate(now.getDate() - day + 1); startDate.setHours(0,0,0,0)
    endDate = new Date(now); endDate.setDate(now.getDate() + (7 - day)); endDate.setHours(23,59,59,999)
  } else if (timeDimension.value === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1); startDate.setHours(0,0,0,0)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); endDate.setHours(23,59,59,999)
  } else if (timeDimension.value === 'custom') {
    if (customDateRange.value && customDateRange.value.length === 2) {
      startDate = new Date(customDateRange.value[0]); startDate.setHours(0,0,0,0)
      endDate = new Date(customDateRange.value[1]); endDate.setHours(23,59,59,999)
    } else { return [] }
  }

  return taskStore.tasks.filter(task => {
    const d = new Date(task.createdAt)
    return d >= startDate && d <= endDate
  })
})

const hasCustomDateRange = computed(() =>
  Array.isArray(customDateRange.value) && customDateRange.value.length === 2
  && !!customDateRange.value[0] && !!customDateRange.value[1]
)

const filteredStats = computed(() => {
  const tasks = filteredTasks.value
  const completed = tasks.filter(t => t.status === '已完成').length
  const expired = tasks.filter(t => t.status === '已过期').length
  return { total: tasks.length, completed, expired, pending: tasks.length - completed - expired }
})

const completionRate = computed(() => {
  const { total, completed } = filteredStats.value
  return total === 0 ? 0 : Math.round((completed / total) * 100)
})

const onTimeCompletionRate = computed(() => {
  const tasks = filteredTasks.value
  const completedOnTime = tasks.filter(task => {
    if (task.status !== '已完成' || !task.deadline || !task.completedAt) return false
    return new Date(task.completedAt) <= new Date(task.deadline)
  }).length
  const totalCompleted = filteredStats.value.completed
  return totalCompleted === 0 ? 0 : Math.round((completedOnTime / totalCompleted) * 100)
})

const overdueRate = computed(() => {
  const { total, expired } = filteredStats.value
  return total === 0 ? 0 : Math.round((expired / total) * 100)
})

// ─── Loading 步骤动画 ─────────────────────────────────────────────
function startLoadingAnimation() {
  loadingStep.value = 1
  loadingProgress.value = 0
  if (loadingTimer) clearInterval(loadingTimer)

  const stages = [
    { step: 1, progress: 20, delay: 1500 },
    { step: 2, progress: 45, delay: 3000 },
    { step: 3, progress: 70, delay: 5000 },
    { step: 4, progress: 88, delay: 8000 },
  ]
  let stageIdx = 0

  loadingTimer = setInterval(() => {
    if (stageIdx < stages.length) {
      loadingStep.value = stages[stageIdx].step
      loadingProgress.value = stages[stageIdx].progress
      stageIdx++
    }
  }, 4000)
}

function stopLoadingAnimation(success = true) {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null }
  if (success) {
    loadingStep.value = 4
    loadingProgress.value = 100
  }
}

// ─── Markdown 解析 ────────────────────────────────────────────────
/**
 * 将 Markdown 文本转换为 HTML
 * 支持：标题(h1-h6)、粗体、斜体、代码块、行内代码、列表、表格、引用、分隔线、链接
 */
function parseMarkdown(md) {
  if (!md) return ''
  let html = md

  // 代码块（先处理，避免内部被其他规则影响）
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="code-block"><code class="lang-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
  })

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // 标题
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // 分隔线
  html = html.replace(/^(---|\*\*\*|___)\s*$/gm, '<hr class="md-hr" />')

  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

  // 粗体+斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 表格
  html = html.replace(/(\|.+\|\n)((?:\|[-: ]+\|\n))((?:\|.+\|\n?)*)/g, (match, header, separator, rows) => {
    const parseRow = (row, tag = 'td') => {
      const cells = row.trim().replace(/^\||\|$/g, '').split('|')
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>'
    }
    const headerHtml = parseRow(header, 'th')
    const rowsHtml = rows.trim().split('\n').filter(Boolean).map(r => parseRow(r)).join('')
    return `<table class="md-table"><thead>${headerHtml}</thead><tbody>${rowsHtml}</tbody></table>`
  })

  // 有序列表
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, match => {
    const items = match.trim().split('\n').map(line => {
      return '<li>' + line.replace(/^\d+\. /, '') + '</li>'
    }).join('')
    return `<ol>${items}</ol>`
  })

  // 无序列表
  html = html.replace(/((?:^[-*+] .+\n?)+)/gm, match => {
    const items = match.trim().split('\n').map(line => {
      return '<li>' + line.replace(/^[-*+] /, '') + '</li>'
    }).join('')
    return `<ul>${items}</ul>`
  })

  // 链接
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')

  // 段落（空行隔开的文本块，不处理已有块级元素行）
  html = html.replace(/\n\n(?!<)/g, '</p><p>')
  html = '<p>' + html + '</p>'

  // 清理：段落内的单个换行变 <br>（在块级元素外）
  html = html.replace(/(?<!>)\n(?!<)/g, '<br>')

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<p>(<(?:h[1-6]|ul|ol|pre|table|blockquote|hr)[^>]*>)/g, '$1')
  html = html.replace(/(<\/(?:h[1-6]|ul|ol|pre|table|blockquote|hr)>)<\/p>/g, '$1')

  return html
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── 生成报告（同步） ─────────────────────────────────────────────
async function handleGenerateReport() {
  if (isGenerating.value) {
    ElMessage.warning('报告正在生成中，请稍候...')
    return
  }

  const { startDate, endDate } = getCurrentDateRange()
  const title = `复盘报告 ${startDate} ~ ${endDate}`

  isGenerating.value = true
  reportLoadingVisible.value = true
  startLoadingAnimation()

  try {
    console.log('📄 [Statistics] 同步生成报告:', startDate, '~', endDate)

    const result = await generateReport({
      user_id: userStore.userId,
      start_date: startDate,
      end_date: endDate,
      title
    })

    stopLoadingAnimation(true)

    // 短暂停留让进度条跑满
    await new Promise(resolve => setTimeout(resolve, 400))
    reportLoadingVisible.value = false

    if (!result || !result.content) {
      ElMessage.error('报告内容为空，请稍后重试')
      return
    }

    // 解析 Markdown
    currentMarkdown.value = result.content
    renderedMarkdown.value = parseMarkdown(result.content)
    currentReportTitle.value = title
    currentReportDateRange.value = `${startDate} 至 ${endDate}`
    currentReportGenTime.value = new Date().toLocaleString('zh-CN')

    reportContentVisible.value = true
    ElMessage.success('报告生成成功！')

  } catch (error) {
    console.error('❌ [Statistics] 生成报告失败:', error)
    stopLoadingAnimation(false)
    reportLoadingVisible.value = false
    ElMessage.error('生成报告失败：' + error.message)
  } finally {
    isGenerating.value = false
  }
}

// ─── 导出 PDF ─────────────────────────────────────────────────────
async function handleExportPdf() {
  isExportingPdf.value = true
  try {
    // 用浏览器打印功能实现 PDF 导出
    await nextTick()

    // 创建一个隐藏的打印窗口
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      ElMessage.error('无法打开打印窗口，请检查浏览器弹窗设置')
      return
    }

    const reportHtml = reportViewerRef.value?.innerHTML || renderedMarkdown.value

    printWindow.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${currentReportTitle.value}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
      font-size: 14px;
      line-height: 1.8;
      color: #1a1a2e;
      padding: 40px 60px;
      background: #fff;
    }
    /* 报告 meta */
    .report-meta {
      display: flex;
      gap: 32px;
      padding: 16px 20px;
      background: #f0f4ff;
      border-radius: 8px;
      margin-bottom: 32px;
      border-left: 4px solid #4a6cf7;
    }
    .report-meta-item { display: flex; flex-direction: column; gap: 4px; }
    .meta-label { font-size: 11px; color: #6b7280; font-weight: 500; }
    .meta-value { font-size: 13px; color: #1a1a2e; font-weight: 600; }

    /* Markdown 样式 */
    .markdown-body h1 {
      font-size: 24px; font-weight: 700; color: #1a1a2e;
      border-bottom: 2px solid #4a6cf7; padding-bottom: 10px; margin: 28px 0 16px;
    }
    .markdown-body h2 {
      font-size: 20px; font-weight: 700; color: #1a1a2e;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 24px 0 12px;
    }
    .markdown-body h3 { font-size: 17px; font-weight: 600; color: #374151; margin: 20px 0 10px; }
    .markdown-body h4 { font-size: 15px; font-weight: 600; color: #4b5563; margin: 16px 0 8px; }
    .markdown-body p { margin: 10px 0; }
    .markdown-body strong { font-weight: 700; color: #1a1a2e; }
    .markdown-body em { font-style: italic; }
    .markdown-body ul, .markdown-body ol { padding-left: 24px; margin: 10px 0; }
    .markdown-body li { margin: 5px 0; }
    .markdown-body blockquote {
      border-left: 3px solid #4a6cf7; padding: 10px 16px;
      margin: 16px 0; color: #6b7280; background: #f8faff; border-radius: 0 6px 6px 0;
    }
    .markdown-body .md-table {
      width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;
    }
    .markdown-body .md-table th {
      background: #4a6cf7; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600;
    }
    .markdown-body .md-table td {
      padding: 9px 14px; border-bottom: 1px solid #e2e8f0; color: #374151;
    }
    .markdown-body .md-table tr:nth-child(even) td { background: #f8faff; }
    .markdown-body .code-block {
      background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px;
      font-family: 'Courier New', monospace; font-size: 13px;
      overflow-x: auto; margin: 14px 0;
    }
    .markdown-body .inline-code {
      background: #f0f4ff; color: #4a6cf7; padding: 2px 6px; border-radius: 4px;
      font-family: 'Courier New', monospace; font-size: 13px;
    }
    .markdown-body .md-hr {
      border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;
    }
    a { color: #4a6cf7; text-decoration: none; }
    @media print {
      body { padding: 20px 40px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  ${reportHtml}
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
    printWindow.document.close()

    ElMessage.success('PDF 导出窗口已打开，请在打印对话框中选择"另存为 PDF"')
  } catch (error) {
    console.error('导出 PDF 失败:', error)
    ElMessage.error('导出 PDF 失败：' + error.message)
  } finally {
    isExportingPdf.value = false
  }
}

// ─── 导出 Markdown ────────────────────────────────────────────────
function handleExportMarkdown() {
  if (!currentMarkdown.value) { ElMessage.warning('没有可导出的报告内容'); return }
  const blob = new Blob([currentMarkdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentReportTitle.value}.md`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('Markdown 导出成功')
}

// ─── 日期范围工具 ─────────────────────────────────────────────────
function getCurrentDateRange() {
  const now = new Date()
  let startDate, endDate

  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    const s = new Date(now); s.setDate(now.getDate() - day + 1); s.setHours(0,0,0,0)
    const e = new Date(now); e.setDate(now.getDate() + (7 - day)); e.setHours(23,59,59,999)
    startDate = s; endDate = e
  } else if (timeDimension.value === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now)
  } else if (timeDimension.value === 'custom' && customDateRange.value.length === 2) {
    startDate = new Date(customDateRange.value[0])
    endDate = new Date(customDateRange.value[1])
  } else {
    startDate = new Date(now); startDate.setDate(now.getDate() - 6)
    endDate = new Date(now)
  }

  const fmt = d => {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${dd}`
  }
  return { startDate: fmt(startDate), endDate: fmt(endDate) }
}

// ─── API 数据加载 ─────────────────────────────────────────────────
async function loadTasksFromAPI() {
  loading.value = true
  try {
    const tasksData = await getTaskList({}, userStore.userId)
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
    taskStore.tasks = formattedTasks
    return formattedTasks
  } catch (error) {
    ElMessage.error('加载任务数据失败：' + error.message)
    return []
  } finally {
    loading.value = false
  }
}

// ─── 图表 ─────────────────────────────────────────────────────────
function initTrendChart() {
  if (!trendChart.value) return
  if (trendChartInstance) trendChartInstance.dispose()
  trendChartInstance = echarts.init(trendChart.value)

  const now = new Date()
  const dates = [], completionRates = [], newTaskCounts = []
  let dateList = []

  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    for (let i = -(day-1); i <= (7-day); i++) {
      const d = new Date(now); d.setDate(now.getDate()+i); dateList.push(d)
    }
  } else if (timeDimension.value === 'month') {
    const y = now.getFullYear(), mo = now.getMonth(), td = now.getDate()
    for (let d = 1; d <= td; d++) dateList.push(new Date(y, mo, d))
  } else if (timeDimension.value === 'custom' && customDateRange.value?.length === 2) {
    const s = new Date(customDateRange.value[0]), e = new Date(customDateRange.value[1])
    for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) dateList.push(new Date(d))
  }

  dateList.forEach(date => {
    const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0')
    const dateStr = `${y}-${m}-${d}`
    dates.push(`${m}-${d}`)

    const up = filteredTasks.value.filter(t => {
      const td2 = new Date(t.createdAt)
      return `${td2.getFullYear()}-${String(td2.getMonth()+1).padStart(2,'0')}-${String(td2.getDate()).padStart(2,'0')}` <= dateStr
    })
    const comp = up.filter(t => t.status === '已完成')
    completionRates.push(up.length > 0 ? Math.round((comp.length/up.length)*100) : 0)

    const cnt = filteredTasks.value.filter(t => {
      const td2 = new Date(t.createdAt)
      return `${td2.getFullYear()}-${String(td2.getMonth()+1).padStart(2,'0')}-${String(td2.getDate()).padStart(2,'0')}` === dateStr
    }).length
    newTaskCounts.push(cnt)
  })

  trendChartInstance.setOption({
    tooltip: { trigger: 'axis', formatter: params => {
      let r = `<strong>${params[0].axisValue}</strong>`
      params.forEach(p => { r += `<div>${p.marker} ${p.seriesName}: ${p.value}${p.seriesName==='完成率'?'%':'个'}</div>` })
      return r
    }},
    legend: { data: ['完成率', '任务增长率'], top: 0 },
    xAxis: { type: 'category', data: dates },
    yAxis: [
      { type: 'value', name: '完成率(%)', min: 0, max: 100, position: 'left', axisLabel: { formatter: '{value}%' }, axisLine: { show: true, lineStyle: { color: '#409EFF' } } },
      { type: 'value', name: '任务数(个)', min: 0, position: 'right', axisLine: { show: true, lineStyle: { color: '#67C23A' } } }
    ],
    series: [
      { name: '完成率', type: 'line', yAxisIndex: 0, data: completionRates, smooth: true, itemStyle: { color: '#409EFF' }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(64,158,255,.3)'},{offset:1,color:'rgba(64,158,255,.05)'}]) } },
      { name: '任务增长率', type: 'bar', yAxisIndex: 1, data: newTaskCounts, itemStyle: { color: '#67C23A' } }
    ]
  })
}

function initCategoryChart() {
  if (!categoryChart.value) return
  if (categoryChartInstance) categoryChartInstance.dispose()
  categoryChartInstance = echarts.init(categoryChart.value)

  const categories = {}
  filteredTasks.value.forEach(t => { const c = t.category || '其他'; categories[c] = (categories[c]||0)+1 })
  const data = Object.keys(categories).map(k => ({ name: k, value: categories[k] }))

  categoryChartInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}个 ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{ type: 'pie', radius: ['40%','70%'], data, label: { formatter: '{b}\n{d}%', fontSize: 12 }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.5)' } } }]
  })
}

function initPriorityChart() {
  if (!priorityChart.value) return
  if (priorityChartInstance) priorityChartInstance.dispose()
  priorityChartInstance = echarts.init(priorityChart.value)

  const priorities = ['高','中','低']
  const total = filteredTasks.value.length || 0
  const data = priorities.map(p => {
    const cnt = filteredTasks.value.filter(t => t.importance === p).length
    return { name: p, value: cnt, percentage: total > 0 ? ((cnt/total)*100).toFixed(1) : '0.0' }
  })

  priorityChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: params => {
      const item = data.find(d => d.name === params[0].name)
      return `${params[0].name}优先级<br/>任务数: ${item.value}个<br/>占比: ${item.percentage}%`
    }},
    xAxis: { type: 'category', data: priorities },
    yAxis: { type: 'value', max: 100, min: 0, axisLabel: { formatter: '{value}%' } },
    series: [{ data: data.map(d => parseFloat(d.percentage)), type: 'bar', itemStyle: { color: p => ['#F56C6C','#E6A23C','#67C23A'][p.dataIndex] }, label: { show: true, position: 'top', formatter: '{c}%' } }]
  })
}

function refreshCharts() { initTrendChart(); initCategoryChart(); initPriorityChart() }

function handleTimeDimensionChange() { refreshCharts() }
function handleCustomDateChange() { refreshCharts() }
function handleResetCustomDate() { customDateRange.value = []; refreshCharts(); ElMessage.success('筛选条件已重置') }

function handleRefresh() {
  loadTasksFromAPI().then(() => { refreshCharts(); ElMessage.success('数据已刷新') })
}
function handleViewTasks() { router.push('/tasks') }
function handleViewChat() { router.push('/chat') }
function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout(); ElMessage.success('已退出登录'); router.push('/login')
  }
}

function handleResize() {
  trendChartInstance?.resize(); categoryChartInstance?.resize(); priorityChartInstance?.resize()
}

onMounted(() => {
  userStore.loadFromStorage()
  if (!userStore.isLoggedIn) { router.push('/login'); return }
  loadTasksFromAPI().then(() => { setTimeout(refreshCharts, 300) })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose(); categoryChartInstance?.dispose(); priorityChartInstance?.dispose()
  if (loadingTimer) clearInterval(loadingTimer)
})
</script>

<style scoped lang="scss">
.statistics {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  position: relative;

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
        .logo-icon { font-size: 20px; }
      }

      .title { font-size: 18px; font-weight: 600; color: #303133; }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;

      .user-info {
        padding: 6px 12px;
        background-color: #F5F7FA;
        border-radius: 20px;
        font-size: 14px;
        color: #606266;
        font-weight: 500;
        margin-right: 8px;
        &::before { content: '👤'; font-size: 16px; }
      }
    }
  }

  .main-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;

      .rate-card {
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: all 0.3s;
        &:hover { transform: translateY(-2px); }

        &.blue-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        &.purple-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        &.red-card { background: linear-gradient(135deg, #cb452e 0%, #e7ba27 100%); }

        .rate-icon {
          width: 56px; height: 56px; border-radius: 12px;
          background: rgba(255,255,255,.2); display: flex;
          align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
        }

        .rate-content {
          .rate-title { font-size: 14px; color: rgba(255,255,255,.9); margin-bottom: 4px; }
          .rate-value { font-size: 32px; font-weight: bold; color: #fff; margin-bottom: 4px; }
          .rate-desc { font-size: 12px; color: rgba(255,255,255,.7); }
        }
      }
    }

    .chart-container {
      background: #fff;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      h3 { font-size: 16px; font-weight: bold; color: #303133; margin-bottom: 16px; }
      .chart { width: 100%; height: 300px; }
    }
  }

  .loading-overlay {
    position: absolute;
    top: 60px; left: 0; right: 0; bottom: 0;
    background: rgba(245, 247, 250, 1);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 9999; color: #909399;
    .el-icon { font-size: 48px; margin-bottom: 16px; animation: rotating 1.5s linear infinite; }
    span { font-size: 16px; }
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
      .filter-label { font-size: 14px; color: #606266; font-weight: 500; }
    }

    .custom-date-picker { display: flex; align-items: center; }

    .report-button-group {
      display: flex;
      gap: 12px;
    }
  }
}

/* ── 报告生成 Loading 弹窗 ── */
:deep(.report-loading-dialog .el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}
:deep(.report-loading-dialog .el-dialog__header) { display: none; }
:deep(.report-loading-dialog .el-dialog__body) { padding: 0; }

.report-loading-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 40px 36px;
  background: linear-gradient(160deg, #0f0c29, #302b63, #24243e);
  color: #fff;
  text-align: center;
}

/* 三环 spinner */
.loading-spinner {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 24px;
}
.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #7c7cff;
  animation: spin 1.4s linear infinite;
}
.spinner-ring.delay1 {
  inset: 10px;
  border-top-color: #a78bfa;
  animation-delay: -0.4s;
}
.spinner-ring.delay2 {
  inset: 20px;
  border-top-color: #e879f9;
  animation-delay: -0.8s;
}

.loading-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #a78bfa, #e879f9);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.loading-sub {
  font-size: 14px;
  color: rgba(255,255,255,.6);
  margin-bottom: 28px;
}

.loading-steps {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;

  .step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(255,255,255,.06);
    font-size: 14px;
    color: rgba(255,255,255,.4);
    transition: all 0.5s;

    &.active {
      background: rgba(124, 124, 255, .15);
      color: #a78bfa;
      border: 1px solid rgba(124,124,255,.3);
    }
    &.done {
      color: #6ee7b7;
      background: rgba(110,231,183,.1);
      border: 1px solid rgba(110,231,183,.25);
    }

    .step-icon {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }
  }
}

.loading-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,.12);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 16px;

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #7c7cff, #e879f9);
    transition: width 1.2s ease;
  }
}

.loading-hint {
  font-size: 12px;
  color: rgba(255,255,255,.35);
}

/* ── 报告展示弹窗 ── */
:deep(.report-content-dialog .el-dialog) {
  border-radius: 14px;
  overflow: hidden;
}
:deep(.report-content-dialog .el-dialog__header) {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 18px 24px;
  .el-dialog__title {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .el-dialog__headerbtn .el-icon { color: rgba(255,255,255,.7); }
}
:deep(.report-content-dialog .el-dialog__body) {
  padding: 0;
  max-height: 72vh;
  overflow-y: auto;
}
:deep(.report-content-dialog .el-dialog__footer) {
  border-top: 1px solid #e5e7eb;
  padding: 14px 20px;
}

.report-viewer {
  padding: 28px 32px;
}

.report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 14px 18px;
  background: #f0f4ff;
  border-radius: 8px;
  margin-bottom: 28px;
  border-left: 4px solid #4a6cf7;

  .report-meta-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    .meta-label { font-size: 11px; color: #6b7280; font-weight: 500; }
    .meta-value { font-size: 13px; color: #1a1a2e; font-weight: 600; }
  }
}

/* Markdown 渲染样式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.85;
  color: #374151;

  :deep(h1) {
    font-size: 22px; font-weight: 700; color: #1a1a2e;
    border-bottom: 2px solid #4a6cf7; padding-bottom: 10px; margin: 28px 0 14px;
  }
  :deep(h2) {
    font-size: 18px; font-weight: 700; color: #1a1a2e;
    border-bottom: 1px solid #e5e7eb; padding-bottom: 7px; margin: 22px 0 12px;
  }
  :deep(h3) { font-size: 16px; font-weight: 600; color: #374151; margin: 18px 0 9px; }
  :deep(h4) { font-size: 14px; font-weight: 600; color: #4b5563; margin: 14px 0 7px; }
  :deep(p) { margin: 10px 0; }
  :deep(strong) { font-weight: 700; color: #1a1a2e; }
  :deep(em) { font-style: italic; color: #6b7280; }

  :deep(ul), :deep(ol) { padding-left: 22px; margin: 10px 0; }
  :deep(li) { margin: 5px 0; }

  :deep(blockquote) {
    border-left: 3px solid #4a6cf7;
    padding: 10px 16px; margin: 14px 0;
    color: #6b7280; background: #f8faff;
    border-radius: 0 6px 6px 0;
  }

  :deep(.md-table) {
    width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px;
    border-radius: 8px; overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
  :deep(.md-table th) {
    background: #1a1a2e; color: #fff;
    padding: 11px 14px; text-align: left; font-weight: 600; font-size: 13px;
  }
  :deep(.md-table td) {
    padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #374151;
  }
  :deep(.md-table tr:nth-child(even) td) { background: #f8faff; }
  :deep(.md-table tr:hover td) { background: #eff6ff; }

  :deep(.code-block) {
    background: #1e1e2e; color: #cdd6f4;
    padding: 16px; border-radius: 10px;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 13px; overflow-x: auto; margin: 14px 0;
    line-height: 1.6;
  }
  :deep(.inline-code) {
    background: #f0f4ff; color: #4a6cf7;
    padding: 2px 7px; border-radius: 4px;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 13px;
  }
  :deep(.md-hr) {
    border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;
  }
  :deep(a) { color: #4a6cf7; text-decoration: underline; }
}

.report-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>