<template>
  <div class="statistics">
    <!-- 顶部导航栏 -->
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">📋</div>
        </div>
        <div class="title">统计看板</div>
      </div>
      <div class="header-right">
        <div class="user-info">{{ userStore.userName }}</div>
        <el-button text @click="handleRefresh"><el-icon>
            <Refresh />
          </el-icon>刷新</el-button>
        <el-button text @click="handleViewChat"><el-icon>
            <ChatDotRound />
          </el-icon>对话</el-button>
        <el-button text @click="handleViewTasks"><el-icon>
            <List />
          </el-icon>任务列表</el-button>
        <!-- 【可扩展】自动登录模式下隐藏退出按钮；恢复多用户登录后取消注释 -->
        <!-- <el-button text @click="handleLogout" type="danger">退出</el-button> -->
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">

      <!-- 时间维度筛选 + 按钮组 -->
      <div class="filter-actions">
        <div class="filter-group">
          <span class="filter-label">时间维度：</span>
          <el-radio-group v-model="timeDimension" @change="handleTimeDimensionChange">
            <el-radio-button value="week">本周</el-radio-button>
            <el-radio-button value="month">当月</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
          <div v-if="timeDimension === 'custom'" class="custom-date-picker">
            <el-date-picker v-model="customDateRange" type="daterange" range-separator="至" start-placeholder="开始日期"
              end-placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleCustomDateChange"
              :clearable="false" style="width: 360px; margin-left: 12px" />
            <el-button :type="hasCustomDateRange ? 'primary' : 'info'" :plain="!hasCustomDateRange"
              :disabled="!hasCustomDateRange" @click="handleResetCustomDate" style="margin-left:12px">
              <el-icon>
                <RefreshLeft />
              </el-icon>重置筛选
            </el-button>
          </div>
        </div>
        <div class="report-button-group">
          <el-button type="primary" @click="handleGenerateReport" :loading="isGenerating" size="large">
            <el-icon v-if="!isGenerating">
              <Document />
            </el-icon>
            {{ isGenerating ? '生成中...' : '生成复盘报告' }}
          </el-button>
          <el-badge :value="reportLogs.length" :hidden="reportLogs.length === 0" type="info">
            <el-button size="large" @click="logDrawerVisible = true">
              <el-icon>
                <Tickets />
              </el-icon>报告日志
            </el-button>
          </el-badge>
        </div>
      </div>

      <!-- 总览卡片 -->
      <div class="overview-cards">
        <StatCard title="总任务数" :value="filteredStats.total" />
        <StatCard title="已完成" :value="filteredStats.completed" />
        <StatCard title="待办数" :value="filteredStats.pending" />
        <StatCard title="已过期" :value="filteredStats.expired" />
      </div>

      <!-- 完成率卡片 -->
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

      <div class="chart-container">
        <h3>完成率趋势与任务增长率（{{ timeDimension === 'week' ? '本周' : timeDimension === 'month' ? '当月' : '自定义时间段' }}）</h3>
        <div ref="trendChart" class="chart"></div>
      </div>
      <div class="chart-container">
        <h3>任务分类统计</h3>
        <div ref="categoryChart" class="chart"></div>
      </div>
      <div class="chart-container">
        <h3>优先级分布</h3>
        <div ref="priorityChart" class="chart"></div>
      </div>
    </div>

    <!-- ══════════ 报告生成中 Loading 弹窗 ══════════ -->
    <el-dialog v-model="reportLoadingVisible" title="" width="460px" :close-on-click-modal="false"
      :close-on-press-escape="false" :show-close="false" class="report-loading-dialog">
      <div class="report-loading-body">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring delay1"></div>
          <div class="spinner-ring delay2"></div>
        </div>
        <h3 class="loading-title">正在生成复盘报告</h3>
        <p class="loading-sub">正在分析您的任务数据，生成个性化洞察...</p>
        <div class="loading-steps">
          <div class="step" v-for="(s, i) in loadingStepList" :key="i"
            :class="{ active: loadingStep >= i + 1, done: loadingStep > i + 1 }">
            <span class="step-icon">{{ loadingStep > i + 1 ? '✓' : `${i + 1}` }}</span>
            <span>{{ s }}</span>
          </div>
        </div>
        <div class="loading-progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <p class="loading-hint">预计需要 30–60 秒，请耐心等待</p>
      </div>
    </el-dialog>

    <!-- ══════════ 报告展示弹窗 ══════════ -->
    <el-dialog v-model="reportContentVisible" :title="currentReportTitle" width="860px" top="4vh"
      class="report-content-dialog" destroy-on-close>
      <div class="report-viewer" ref="reportViewerRef">
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
        <div class="markdown-body" v-html="renderedMarkdown"></div>
      </div>
      <template #footer>
        <div class="report-dialog-footer">
          <el-button type="primary" @click="handleExportPdf" :loading="isExportingPdf">
            <el-icon>
              <Download />
            </el-icon>{{ isExportingPdf ? '导出中...' : '导出 PDF' }}
          </el-button>
          <el-button @click="handleExportMarkdown">
            <el-icon>
              <Document />
            </el-icon>导出 Markdown
          </el-button>
          <el-button @click="reportContentVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ══════════ 报告日志抽屉 ══════════ -->
    <el-drawer v-model="logDrawerVisible" direction="rtl" size="480px" class="log-drawer" :with-header="false">
      <div class="log-drawer-inner">

        <!-- 抽屉头部 -->
        <div class="log-drawer-header">
          <div class="log-drawer-title">
            <span class="title-icon">🗂️</span>
            <span>报告历史记录</span>
            <el-tag size="small" type="info" round
              style="margin-left:8px;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff">{{
                reportLogs.length }} 份</el-tag>
          </div>
          <div class="log-drawer-actions">
            <el-popconfirm title="确定清空所有历史记录？" @confirm="handleClearAllLogs" confirm-button-text="清空"
              cancel-button-text="取消">
              <template #reference>
                <el-button v-if="reportLogs.length > 0" text type="danger" size="small" class="clear-btn">
                  <el-icon>
                    <Delete />
                  </el-icon>清空
                </el-button>
              </template>
            </el-popconfirm>
            <el-button text size="small" class="close-btn" @click="logDrawerVisible = false">
              <el-icon>
                <Close />
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="reportLogs.length === 0" class="log-empty">
          <div class="log-empty-icon">📭</div>
          <p class="log-empty-title">暂无历史报告</p>
          <p class="log-empty-sub">点击「生成复盘报告」即可创建第一份报告<br>生成后会自动保存到这里</p>
          <el-button type="primary" size="small" @click="logDrawerVisible = false">
            去生成报告
          </el-button>
        </div>

        <!-- 日志列表 -->
        <div v-else class="log-list">
          <transition-group name="log-item-anim">
            <div v-for="log in filteredLogs" :key="log.id" class="log-card"
              :class="{ 'log-card--empty': log.isEmpty }">
              <div class="log-card-top">
                <span class="log-card-badge">
                  <span class="badge-dot"></span>{{ log.dateRange }}
                </span>
                <span v-if="log.isEmpty" class="log-empty-badge">无数据</span>
                <span class="log-card-time">{{ log.createdAt }}</span>
              </div>
              <div class="log-card-title">{{ log.title }}</div>
              <div class="log-card-preview">{{ log.preview }}</div>
              <div class="log-card-actions">
                <el-button size="small" type="primary" plain @click="handleViewLog(log)">
                  <el-icon>
                    <View />
                  </el-icon>查看
                </el-button>
                <el-button size="small" plain @click="handleExportLogPdf(log)">
                  <el-icon>
                    <Download />
                  </el-icon>PDF
                </el-button>
                <el-button size="small" plain @click="handleExportLogMd(log)">
                  <el-icon>
                    <Document />
                  </el-icon>Markdown
                </el-button>
                <el-popconfirm :title="`删除「${log.title}」？`" @confirm="handleDeleteLog(log.id)" confirm-button-text="删除"
                  cancel-button-text="取消">
                  <template #reference>
                    <el-button size="small" type="danger" plain>
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </transition-group>

          <div v-if="filteredLogs.length === 0 && logSearch" class="log-no-result">
            <el-icon>
              <Search />
            </el-icon>
            <p>未找到包含「{{ logSearch }}」的报告</p>
          </div>
        </div>

        <!-- 底部提示 -->
        <div class="log-drawer-footer" v-if="reportLogs.length > 0">
          最多保留 20 份记录，超出后自动删除最早的记录
        </div>
      </div>
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useUserStore } from '@/stores/user'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Refresh, List, ChatDotRound, Document, RefreshLeft,
  Download, Loading, Tickets, Delete, Close, Search, View
} from '@element-plus/icons-vue'
import StatCard from '@/components/StatCard.vue'
import { getTaskList, generateReport } from '@/api/task'

const router = useRouter()
const taskStore = useTaskStore()
const userStore = useUserStore()

// ── 图表 DOM refs ────────────────────────────────────────────────
const trendChart = ref(null)
const categoryChart = ref(null)
const priorityChart = ref(null)
const loading = ref(false)
let trendChartInstance = null, categoryChartInstance = null, priorityChartInstance = null

// ── 报告展示状态 ─────────────────────────────────────────────────
const reportLoadingVisible = ref(false)
const reportContentVisible = ref(false)
const isGenerating = ref(false)
const isExportingPdf = ref(false)
const reportViewerRef = ref(null)

const currentReportTitle = ref('')
const currentReportDateRange = ref('')
const currentReportGenTime = ref('')
const currentMarkdown = ref('')
const renderedMarkdown = ref('')

// Loading 动画
const loadingStep = ref(1)
const loadingProgress = ref(0)
const loadingStepList = ['收集任务数据', '分析完成情况', '生成报告内容', '格式化输出']
let loadingTimer = null

// ── 时间维度 ─────────────────────────────────────────────────────
const timeDimension = ref('week')
const customDateRange = ref([])

// ════════════════════════════════════════════════════════════════
//  报告日志（基于 localStorage 本地持久化）
//  数据结构: [{ id, title, dateRange, createdAt, preview, markdown }]
// ════════════════════════════════════════════════════════════════
const logDrawerVisible = ref(false)
const reportLogs = ref([])
const MAX_LOGS = 20

// localStorage key 带用户隔离
const LOG_STORAGE_KEY = computed(() =>
  `report_logs_${userStore.userId || 'anonymous'}`
)

/** 从 localStorage 读取日志列表 */
function loadLogsFromStorage() {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY.value)
    reportLogs.value = raw ? JSON.parse(raw) : []
  } catch {
    reportLogs.value = []
  }
}

/** 将日志列表写回 localStorage */
function saveLogsToStorage() {
  try {
    localStorage.setItem(LOG_STORAGE_KEY.value, JSON.stringify(reportLogs.value))
  } catch (e) {
    // 超出存储配额时降级处理：删最老一条再重试
    if (reportLogs.value.length > 1) {
      reportLogs.value.pop()
      try { localStorage.setItem(LOG_STORAGE_KEY.value, JSON.stringify(reportLogs.value)) } catch { }
    }
  }
}

/** 新增一条日志 */
function addLog(title, dateRange, genTime, markdown, isEmpty = false) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  // 去除 Markdown 语法符号，提取纯文本摘要
  const preview = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*>`\-_\[\]|!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  reportLogs.value.unshift({ id, title, dateRange, createdAt: genTime, preview, markdown, isEmpty })
  if (reportLogs.value.length > MAX_LOGS) {
    reportLogs.value = reportLogs.value.slice(0, MAX_LOGS)
  }
  saveLogsToStorage()
}

/** 搜索过滤后的日志列表 */
const filteredLogs = computed(() =>  reportLogs.value)

// ── 日志操作 ─────────────────────────────────────────────────────

/** 从日志打开报告详情弹窗 */
function handleViewLog(log) {
  currentMarkdown.value = log.markdown
  renderedMarkdown.value = parseMarkdown(log.markdown)
  currentReportTitle.value = log.title
  currentReportDateRange.value = log.dateRange
  currentReportGenTime.value = log.createdAt
  logDrawerVisible.value = false
  reportContentVisible.value = true
}

/** 从日志导出 PDF */
function handleExportLogPdf(log) {
  openPrintWindow(log.title, log.dateRange, log.createdAt, log.markdown)
}

/** 从日志导出 Markdown */
function handleExportLogMd(log) {
  downloadMd(log.title, log.markdown)
}

/** 删除单条日志 */
function handleDeleteLog(id) {
  reportLogs.value = reportLogs.value.filter(l => l.id !== id)
  saveLogsToStorage()
  ElMessage.success('已删除')
}

/** 清空全部日志 */
function handleClearAllLogs() {
  reportLogs.value = []
  saveLogsToStorage()
  ElMessage.success('历史记录已全部清空')
}

// ── 计算属性 ─────────────────────────────────────────────────────
const filteredTasks = computed(() => {
  const now = new Date()
  let startDate, endDate
  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    startDate = new Date(now); startDate.setDate(now.getDate() - day + 1); startDate.setHours(0, 0, 0, 0)
    endDate = new Date(now); endDate.setDate(now.getDate() + (7 - day)); endDate.setHours(23, 59, 59, 999)
  } else if (timeDimension.value === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); endDate.setHours(23, 59, 59, 999)
  } else if (timeDimension.value === 'custom') {
    if (customDateRange.value?.length === 2) {
      startDate = new Date(customDateRange.value[0]); startDate.setHours(0, 0, 0, 0)
      endDate = new Date(customDateRange.value[1]); endDate.setHours(23, 59, 59, 999)
    } else return []
  }
  return taskStore.tasks.filter(t => {
    const d = new Date(t.createdAt); return d >= startDate && d <= endDate
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
  return total === 0 ? 0 : Math.round(completed / total * 100)
})
const onTimeCompletionRate = computed(() => {
  const tasks = filteredTasks.value
  const ok = tasks.filter(t =>
    t.status === '已完成' && t.deadline && t.completedAt &&
    new Date(t.completedAt) <= new Date(t.deadline)
  ).length
  return filteredStats.value.completed === 0 ? 0 : Math.round(ok / filteredStats.value.completed * 100)
})
const overdueRate = computed(() => {
  const { total, expired } = filteredStats.value
  return total === 0 ? 0 : Math.round(expired / total * 100)
})

// ── Loading 动画 ──────────────────────────────────────────────────
function startLoadingAnimation() {
  loadingStep.value = 1; loadingProgress.value = 0
  if (loadingTimer) clearInterval(loadingTimer)
  let i = 0
  const steps = [{ s: 1, p: 20 }, { s: 2, p: 45 }, { s: 3, p: 70 }, { s: 4, p: 88 }]
  loadingTimer = setInterval(() => {
    if (i < steps.length) { loadingStep.value = steps[i].s; loadingProgress.value = steps[i].p; i++ }
  }, 4000)
}
function stopLoadingAnimation(ok = true) {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null }
  if (ok) { loadingStep.value = 4; loadingProgress.value = 100 }
}

// ── Markdown 解析（逐行状态机，健壮处理表格/列表/代码块） ───────────
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 对单元格/段落文字做行内样式替换（粗体/斜体/行内代码/链接） */
function inlineMarkdown(s) {
  s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
  return s
}

/** 判断一行是否是表格分隔行（如 |---|:---:|---| ） */
function isTableSep(line) {
  return /^\|?\s*[-:]+[-| :]*\|?\s*$/.test(line.trim())
}

/** 判断一行是否是表格数据行（以 | 开头或结尾，或包含 | ） */
function isTableRow(line) {
  const t = line.trim()
  return t.startsWith('|') || t.endsWith('|') || (t.includes('|') && !t.startsWith('#'))
}

/** 解析一行表格行，返回单元格数组 */
function parseTableRow(line) {
  return line.trim()
    .replace(/^\|/, '').replace(/\|$/, '')
    .split('|')
    .map(c => c.trim())
}

/**
 * 健壮的 Markdown → HTML 解析器
 * 采用逐行状态机，正确处理：
 *  - 多行代码块
 *  - 有无末尾换行的表格（核心修复点）
 *  - 连续有序/无序列表
 *  - 引用块
 *  - 标题、分隔线、段落
 */
function parseMarkdown(md) {
  if (!md) return ''

  // 统一换行符
  const raw = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = raw.split('\n')

  const out = []
  let i = 0

  // 状态
  let inCode = false
  let codeLang = ''
  let codeLines = []

  // 表格缓冲
  let tableHeader = null   // string[]
  let tableRows = []     // string[][]

  // 列表缓冲
  let listType = null   // 'ul' | 'ol'
  let listItems = []

  // 段落缓冲
  let paraLines = []

  /** 把累积的表格 flush 成 HTML */
  function flushTable() {
    if (!tableHeader) return
    const thHtml = '<tr>' + tableHeader.map(c => `<th>${inlineMarkdown(c)}</th>`).join('') + '</tr>'
    const tbHtml = tableRows.map(cells =>
      '<tr>' + cells.map(c => `<td>${inlineMarkdown(c)}</td>`).join('') + '</tr>'
    ).join('')
    out.push(
      `<table class="md-table"><thead>${thHtml}</thead>` +
      (tbHtml ? `<tbody>${tbHtml}</tbody>` : '') +
      `</table>`
    )
    tableHeader = null
    tableRows = []
  }

  /** 把累积的列表 flush 成 HTML */
  function flushList() {
    if (!listType || listItems.length === 0) { listType = null; listItems = []; return }
    const tag = listType
    const html = `<${tag}>${listItems.map(t => `<li>${inlineMarkdown(t)}</li>`).join('')}</${tag}>`
    out.push(html)
    listType = null
    listItems = []
  }

  /** 把累积的段落 flush 成 HTML */
  function flushPara() {
    if (paraLines.length === 0) return
    const text = paraLines.join('<br>')
    if (text.trim()) out.push(`<p>${inlineMarkdown(text)}</p>`)
    paraLines = []
  }

  /** 所有 flush 一起调用 */
  function flushAll() {
    flushTable()
    flushList()
    flushPara()
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── 代码块开始/结束 ──────────────────────────────────────────
    if (trimmed.startsWith('```')) {
      if (!inCode) {
        flushAll()
        inCode = true
        codeLang = trimmed.slice(3).trim() || 'text'
        codeLines = []
      } else {
        out.push(
          `<pre class="code-block"><code class="lang-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`
        )
        inCode = false
        codeLines = []
      }
      i++; continue
    }
    if (inCode) { codeLines.push(line); i++; continue }

    // ── 空行：flush 一切 ─────────────────────────────────────────
    if (trimmed === '') {
      flushAll()
      i++; continue
    }

    // ── 标题 ────────────────────────────────────────────────────
    const headMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headMatch) {
      flushAll()
      const level = headMatch[1].length
      out.push(`<h${level}>${inlineMarkdown(headMatch[2])}</h${level}>`)
      i++; continue
    }

    // ── 分隔线（纯 --- / *** / ___ 行，且不是表格分隔） ──────────
    if (/^(---|\*\*\*|___)$/.test(trimmed) && !isTableRow(line)) {
      flushAll()
      out.push('<hr class="md-hr"/>')
      i++; continue
    }

    // ── 引用 ────────────────────────────────────────────────────
    if (trimmed.startsWith('> ')) {
      flushTable(); flushList()
      paraLines.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`)
      i++; continue
    }

    // ── 表格（核心修复：向前看分隔行，不依赖末尾换行） ────────────
    if (isTableRow(line)) {
      // 如果下一行是分隔行，当前行是表头
      const nextLine = lines[i + 1]
      if (!tableHeader && nextLine !== undefined && isTableSep(nextLine)) {
        flushList(); flushPara()
        tableHeader = parseTableRow(line)
        i += 2   // 跳过表头行 + 分隔行
        continue
      }
      // 如果已在表格中，当前行是数据行
      if (tableHeader !== null && !isTableSep(line)) {
        tableRows.push(parseTableRow(line))
        i++; continue
      }
      // 下一行不是分隔行 → 不是表格，作为普通文本处理（fall through 到段落）
    }

    // 遇到非表格行时终结正在收集中的表格
    if (tableHeader !== null && !isTableRow(line)) {
      flushTable()
    }

    // ── 无序列表 ─────────────────────────────────────────────────
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      flushTable()
      if (listType === 'ol') flushList()
      if (!listType) listType = 'ul'
      listItems.push(ulMatch[1])
      i++; continue
    }

    // ── 有序列表 ─────────────────────────────────────────────────
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      flushTable()
      if (listType === 'ul') flushList()
      if (!listType) listType = 'ol'
      listItems.push(olMatch[1])
      i++; continue
    }

    // ── 普通段落文字 ─────────────────────────────────────────────
    flushTable()
    flushList()
    paraLines.push(trimmed)
    i++
  }

  // 文档末尾：flush 所有剩余内容
  if (inCode) {
    out.push(`<pre class="code-block"><code class="lang-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  flushAll()

  return out.join('\n')
}

// ── 生成报告（同步）────────────────────────────────────────────────
async function handleGenerateReport() {
  if (isGenerating.value) { ElMessage.warning('报告正在生成中，请稍候...'); return }
  const { startDate, endDate } = getCurrentDateRange()
  const title = `复盘报告 ${startDate} ~ ${endDate}`

  isGenerating.value = true
  reportLoadingVisible.value = true
  startLoadingAnimation()

  try {
    const result = await generateReport({
      user_id: userStore.userId, start_date: startDate, end_date: endDate, title
    })
    stopLoadingAnimation(true)
    await new Promise(r => setTimeout(r, 400))
    reportLoadingVisible.value = false

    // ★ 说明：当工作流 status=failed 且大模型内容为空时，
    //   task.js 的 generateReport 已自动填充兜底报告到 result.content，
    //   并将 result.isEmpty 置为 true。
    //   此处只需处理 content 彻底为空（非兜底）的异常情况。
    if (!result?.content) {
      ElMessage.error('报告内容为空，请稍后重试')
      return
    }

    const genTime   = new Date().toLocaleString('zh-CN')
    const dateRange = `${startDate} 至 ${endDate}`

    // 更新当前展示状态
    currentMarkdown.value        = result.content
    renderedMarkdown.value       = parseMarkdown(result.content)
    currentReportTitle.value     = title
    currentReportDateRange.value = dateRange
    currentReportGenTime.value   = genTime

    // ★ 写入日志时同步传入 isEmpty 标记
    addLog(title, dateRange, genTime, result.content, result.isEmpty ?? false)

    reportContentVisible.value = true

    // ★ 差异化提示：无数据兜底 vs 正常报告
    if (result.isEmpty) {
      ElMessage.warning('该时间段内暂无任务数据，已生成兜底报告并保存至日志。')
    } else {
      ElMessage.success('报告生成成功，已自动保存至报告日志！')
    }
  } catch (err) {
    console.error('❌ 生成报告失败:', err)
    stopLoadingAnimation(false)
    reportLoadingVisible.value = false
    ElMessage.error('生成报告失败：' + err.message)
  } finally {
    isGenerating.value = false
  }
}

// ── 导出工具 ─────────────────────────────────────────────────────
const PRINT_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;font-size:14px;line-height:1.85;color:#1a1a2e;padding:40px 60px;background:#fff}
.report-meta{display:flex;gap:32px;flex-wrap:wrap;padding:16px 20px;background:#f0f4ff;border-radius:8px;margin-bottom:32px;border-left:4px solid #4a6cf7}
.report-meta-item{display:flex;flex-direction:column;gap:4px}
.meta-label{font-size:11px;color:#6b7280;font-weight:500}
.meta-value{font-size:13px;color:#1a1a2e;font-weight:600}
h1{font-size:24px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #4a6cf7;padding-bottom:10px;margin:28px 0 16px}
h2{font-size:20px;font-weight:700;color:#1a1a2e;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px}
h3{font-size:17px;font-weight:600;color:#374151;margin:20px 0 10px}
h4{font-size:15px;font-weight:600;color:#4b5563;margin:16px 0 8px}
p{margin:10px 0}strong{font-weight:700;color:#1a1a2e}em{font-style:italic}
ul,ol{padding-left:24px;margin:10px 0}li{margin:5px 0}
blockquote{border-left:3px solid #4a6cf7;padding:10px 16px;margin:16px 0;color:#6b7280;background:#f8faff;border-radius:0 6px 6px 0}
.md-table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13px;page-break-inside:avoid}
.md-table th{background:#4a6cf7;color:#fff;padding:11px 14px;text-align:left;font-weight:600;border:none}
.md-table td{padding:10px 14px;border-bottom:1px solid #edf2ff;color:#374151;vertical-align:middle}
.md-table tbody tr:last-child td{border-bottom:none}
.md-table tbody tr:nth-child(even) td{background:#f5f7ff}
.code-block{background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;font-family:'Courier New',Consolas,monospace;font-size:13px;overflow-x:auto;margin:14px 0;line-height:1.6;page-break-inside:avoid}
.inline-code{background:#f0f4ff;color:#4a6cf7;padding:2px 7px;border-radius:4px;font-family:'Courier New',Consolas,monospace;font-size:12px}
.md-hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
a{color:#4a6cf7;text-decoration:none}
@media print{body{padding:20px 40px}@page{margin:1.5cm;size:A4}h1,h2,h3,h4{page-break-after:avoid}.md-table{page-break-inside:avoid}}
`

function openPrintWindow(title, dateRange, genTime, markdown) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { ElMessage.error('无法打开打印窗口，请检查浏览器弹窗设置'); return }
  const body = `
<div class="report-meta">
  <div class="report-meta-item"><span class="meta-label">📅 时间范围</span><span class="meta-value">${dateRange}</span></div>
  <div class="report-meta-item"><span class="meta-label">👤 用户</span><span class="meta-value">${userStore.userName}</span></div>
  <div class="report-meta-item"><span class="meta-label">🕐 生成时间</span><span class="meta-value">${genTime}</span></div>
</div>
<div>${parseMarkdown(markdown)}</div>`
  win.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>${body}<script>window.onload=()=>window.print()<\/script></body></html>`)
  win.document.close()
  ElMessage.success('PDF 导出窗口已打开，请在打印对话框中选择"另存为 PDF"')
}

function downloadMd(title, markdown) {
  if (!markdown) { ElMessage.warning('没有可导出的内容'); return }
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${title}.md`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('Markdown 导出成功')
}

// 当前报告弹窗的导出
async function handleExportPdf() {
  isExportingPdf.value = true
  await nextTick()
  openPrintWindow(currentReportTitle.value, currentReportDateRange.value, currentReportGenTime.value, currentMarkdown.value)
  isExportingPdf.value = false
}
function handleExportMarkdown() {
  downloadMd(currentReportTitle.value, currentMarkdown.value)
}

// ── 日期范围工具 ──────────────────────────────────────────────────
function getCurrentDateRange() {
  const now = new Date()
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  let s, e
  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    s = new Date(now); s.setDate(now.getDate() - day + 1)
    e = new Date(now); e.setDate(now.getDate() + (7 - day))
  } else if (timeDimension.value === 'month') {
    s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now)
  } else if (timeDimension.value === 'custom' && customDateRange.value.length === 2) {
    s = new Date(customDateRange.value[0]); e = new Date(customDateRange.value[1])
  } else {
    s = new Date(now); s.setDate(now.getDate() - 6); e = new Date(now)
  }
  return { startDate: fmt(s), endDate: fmt(e) }
}

// ── API 数据加载 ──────────────────────────────────────────────────
async function loadTasksFromAPI() {
  loading.value = true
  try {
    const data = await getTaskList({}, userStore.userId)
    taskStore.tasks = data.map(t => ({
      id: String(t.id), title: t.task_content, description: t.description || '',
      category: t.category || '其他', importance: t.importance || '中',
      deadline: t.deadline || null, status: t.status || '进行中',
      createdAt: t.created_at || new Date().toISOString(),
      updatedAt: t.updated_at || t.created_at || new Date().toISOString(),
      completedAt: t.completed_at || null
    }))
  } catch (err) { ElMessage.error('加载任务数据失败：' + err.message) }
  finally { loading.value = false }
}

// ── 图表 ─────────────────────────────────────────────────────────
function initTrendChart() {
  if (!trendChart.value) return
  if (trendChartInstance) trendChartInstance.dispose()
  trendChartInstance = echarts.init(trendChart.value)
  const now = new Date(), dates = [], rates = [], counts = []
  let dateList = []
  if (timeDimension.value === 'week') {
    const day = now.getDay() || 7
    for (let i = -(day - 1); i <= (7 - day); i++) { const d = new Date(now); d.setDate(now.getDate() + i); dateList.push(d) }
  } else if (timeDimension.value === 'month') {
    const y = now.getFullYear(), mo = now.getMonth(), td = now.getDate()
    for (let d = 1; d <= td; d++) dateList.push(new Date(y, mo, d))
  } else if (timeDimension.value === 'custom' && customDateRange.value?.length === 2) {
    const s = new Date(customDateRange.value[0]), e = new Date(customDateRange.value[1])
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) dateList.push(new Date(d))
  }
  const fmtD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  dateList.forEach(date => {
    const ds = fmtD(date)
    dates.push(`${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
    const up = filteredTasks.value.filter(t => fmtD(new Date(t.createdAt)) <= ds)
    rates.push(up.length > 0 ? Math.round(up.filter(t => t.status === '已完成').length / up.length * 100) : 0)
    counts.push(filteredTasks.value.filter(t => fmtD(new Date(t.createdAt)) === ds).length)
  })
  trendChartInstance.setOption({
    tooltip: { trigger: 'axis', formatter: p => { let r = `<strong>${p[0].axisValue}</strong>`; p.forEach(x => { r += `<div>${x.marker} ${x.seriesName}: ${x.value}${x.seriesName === '完成率' ? '%' : '个'}</div>` }); return r } },
    legend: { data: ['完成率', '任务增长率'], top: 0 },
    xAxis: { type: 'category', data: dates },
    yAxis: [
      { type: 'value', name: '完成率(%)', min: 0, max: 100, position: 'left', axisLabel: { formatter: '{value}%' }, axisLine: { show: true, lineStyle: { color: '#409EFF' } } },
      { type: 'value', name: '任务数(个)', min: 0, position: 'right', axisLine: { show: true, lineStyle: { color: '#67C23A' } } }
    ],
    series: [
      { name: '完成率', type: 'line', yAxisIndex: 0, data: rates, smooth: true, itemStyle: { color: '#409EFF' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(64,158,255,.3)' }, { offset: 1, color: 'rgba(64,158,255,.05)' }]) } },
      { name: '任务增长率', type: 'bar', yAxisIndex: 1, data: counts, itemStyle: { color: '#67C23A' } }
    ]
  })
}

function initCategoryChart() {
  if (!categoryChart.value) return
  if (categoryChartInstance) categoryChartInstance.dispose()
  categoryChartInstance = echarts.init(categoryChart.value)
  const cats = {}
  filteredTasks.value.forEach(t => { const c = t.category || '其他'; cats[c] = (cats[c] || 0) + 1 })
  categoryChartInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}个 ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{ type: 'pie', radius: ['40%', '70%'], data: Object.keys(cats).map(k => ({ name: k, value: cats[k] })), label: { formatter: '{b}\n{d}%', fontSize: 12 }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.5)' } } }]
  })
}

function initPriorityChart() {
  if (!priorityChart.value) return
  if (priorityChartInstance) priorityChartInstance.dispose()
  priorityChartInstance = echarts.init(priorityChart.value)
  const total = filteredTasks.value.length || 0
  const data = ['高', '中', '低'].map(p => { const cnt = filteredTasks.value.filter(t => t.importance === p).length; return { name: p, value: cnt, pct: total > 0 ? ((cnt / total) * 100).toFixed(1) : '0.0' } })
  priorityChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const item = data.find(d => d.name === p[0].name); return `${p[0].name}优先级<br/>任务数: ${item.value}个<br/>占比: ${item.pct}%` } },
    xAxis: { type: 'category', data: ['高', '中', '低'] },
    yAxis: { type: 'value', max: 100, min: 0, axisLabel: { formatter: '{value}%' } },
    series: [{ data: data.map(d => parseFloat(d.pct)), type: 'bar', itemStyle: { color: p => ['#F56C6C', '#E6A23C', '#67C23A'][p.dataIndex] }, label: { show: true, position: 'top', formatter: '{c}%' } }]
  })
}

function refreshCharts() { initTrendChart(); initCategoryChart(); initPriorityChart() }
function handleTimeDimensionChange() { refreshCharts() }
function handleCustomDateChange() { refreshCharts() }
function handleResetCustomDate() { customDateRange.value = []; refreshCharts(); ElMessage.success('筛选条件已重置') }
function handleRefresh() { loadTasksFromAPI().then(() => { refreshCharts(); ElMessage.success('数据已刷新') }) }
function handleViewTasks() { router.push('/tasks') }
function handleViewChat() { router.push('/chat') }
// 【可扩展】恢复多用户登录后取消注释
// const handleLogout = () => {
//   if (confirm('确定要退出登录吗？')) {
//     userStore.logout();
//     ElMessage.success('已退出登录');
//     router.push('/login');
//   }
// };
function handleResize() { trendChartInstance?.resize(); categoryChartInstance?.resize(); priorityChartInstance?.resize() }

onMounted(() => {
  userStore.loadFromStorage()
  // 【可扩展】自动登录模式下无需检查登录状态，userStore 已由 main.js 自动填充
// if (!userStore.isLoggedIn) {
//   router.push('/login');
//   return;
// }
  loadLogsFromStorage()   // ★ 加载日志
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
/* ════ 基础布局 ════ */
.statistics {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  position: relative;
}

.header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      .logo-icon {
        font-size: 20px
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
    gap: 6px;

    .user-info {
      padding: 6px 12px;
      background: #F5F7FA;
      border-radius: 20px;
      font-size: 14px;
      color: #606266;
      font-weight: 500;
      margin-right: 8px;

      &::before {
        content: '👤';
        font-size: 16px
      }
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
  z-index: 9999;
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

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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
    flex-wrap: wrap;

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

  .report-button-group {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

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
    box-shadow: 0 2px 8px rgba(0, 0, 0, .05);
    transition: all .3s;

    &:hover {
      transform: translateY(-2px);
    }

    &.blue-card {
      background: linear-gradient(135deg, #667eea, #764ba2);
    }

    &.purple-card {
      background: linear-gradient(135deg, #f093fb, #f5576c);
    }

    &.red-card {
      background: linear-gradient(135deg, #cb452e, #e7ba27);
    }

    .rate-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: rgba(255, 255, 255, .2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .rate-content {
      .rate-title {
        font-size: 14px;
        color: rgba(255, 255, 255, .9);
        margin-bottom: 4px
      }

      .rate-value {
        font-size: 32px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 4px
      }

      .rate-desc {
        font-size: 12px;
        color: rgba(255, 255, 255, .7)
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

/* ════ 报告 Loading 弹窗 ════ */
:deep(.report-loading-dialog .el-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.report-loading-dialog .el-dialog__header) {
  display: none;
}

:deep(.report-loading-dialog .el-dialog__body) {
  padding: 0;
}

.report-loading-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 36px;
  background: #fff;
  color: #303133;
  text-align: center;
}

.loading-spinner {
  position: relative;
  width: 48px;
  height: 48px;
  margin-bottom: 20px;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid #f0f0f0;
  border-top-color: #409EFF;
  animation: spin 1s linear infinite;

  &.delay1 {
    inset: auto;
    display: none;
  }

  &.delay2 {
    inset: auto;
    display: none;
  }
}

.loading-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.loading-sub {
  font-size: 13px;
  color: #909399;
  margin-bottom: 20px;
}

.loading-steps {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;

  .step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    background: #f5f7fa;
    font-size: 13px;
    color: #909399;
    transition: all .3s;

    &.active {
      background: #e6f7ff;
      color: #409EFF;
      border: 1px solid #91caff;
    }

    &.done {
      color: #67C23A;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
    }

    .step-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
  }
}

.loading-progress-bar {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    background: #409EFF;
    transition: width 1s ease;
  }
}

.loading-hint {
  font-size: 12px;
  color: #bfbfbf;
}

/* ════ 报告展示弹窗 ════ */
:deep(.report-content-dialog .el-dialog) {
  border-radius: 14px;
  overflow: hidden;
}

:deep(.report-content-dialog .el-dialog__header) {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  padding: 18px 24px;

  .el-dialog__title {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: .3px
  }

  .el-dialog__headerbtn .el-icon {
    color: rgba(255, 255, 255, .7)
  }
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

    .meta-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 500
    }

    .meta-value {
      font-size: 13px;
      color: #1a1a2e;
      font-weight: 600
    }
  }
}

.markdown-body {
  font-size: 14px;
  line-height: 1.85;
  color: #374151;

  :deep(h1) {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
    border-bottom: 2px solid #4a6cf7;
    padding-bottom: 10px;
    margin: 28px 0 14px
  }

  :deep(h2) {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a2e;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 7px;
    margin: 22px 0 12px
  }

  :deep(h3) {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 18px 0 9px
  }

  :deep(h4) {
    font-size: 14px;
    font-weight: 600;
    color: #4b5563;
    margin: 14px 0 7px
  }

  :deep(p) {
    margin: 10px 0
  }

  :deep(strong) {
    font-weight: 700;
    color: #1a1a2e
  }

  :deep(em) {
    font-style: italic;
    color: #6b7280
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 22px;
    margin: 10px 0
  }

  :deep(li) {
    margin: 5px 0
  }

  :deep(blockquote) {
    border-left: 3px solid #4a6cf7;
    padding: 10px 16px;
    margin: 14px 0;
    color: #6b7280;
    background: #f8faff;
    border-radius: 0 6px 6px 0
  }

  :deep(.md-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 13px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(74, 108, 247, .1)
  }

  :deep(.md-table thead) {
    background: #4a6cf7
  }

  :deep(.md-table th) {
    background: #4a6cf7;
    color: #fff;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: .2px;
    border: none
  }

  :deep(.md-table td) {
    padding: 11px 16px;
    border-bottom: 1px solid #edf2ff;
    color: #374151;
    vertical-align: middle
  }

  :deep(.md-table tbody tr:last-child td) {
    border-bottom: none
  }

  :deep(.md-table tr:nth-child(even) td) {
    background: #f5f7ff
  }

  :deep(.md-table tr:hover td) {
    background: #eef2ff;
    transition: background .15s
  }

  :deep(.code-block) {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 16px;
    border-radius: 10px;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 13px;
    overflow-x: auto;
    margin: 14px 0;
    line-height: 1.6
  }

  :deep(.inline-code) {
    background: #f0f4ff;
    color: #4a6cf7;
    padding: 2px 7px;
    border-radius: 4px;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 13px
  }

  :deep(.md-hr) {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 22px 0
  }

  :deep(a) {
    color: #4a6cf7;
    text-decoration: underline
  }
}

.report-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ════ 报告日志抽屉 ════ */
:deep(.log-drawer .el-drawer) {
  border-radius: 16px 0 0 16px;
  overflow: hidden;
}

:deep(.log-drawer .el-drawer__body) {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.log-drawer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafbfc;
}

.log-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2b55 100%);
  flex-shrink: 0;

  .log-drawer-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;

    .title-icon {
      font-size: 18px;
    }
  }

  .log-drawer-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .clear-btn {
    color: rgba(255, 255, 255, .55) !important;

    &:hover {
      color: #f87171 !important
    }
  }

  .close-btn {
    color: rgba(255, 255, 255, .55) !important;
    font-size: 18px !important;

    &:hover {
      color: #fff !important
    }
  }
}


.log-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 28px;
  text-align: center;

  .log-empty-icon {
    font-size: 60px;
    margin-bottom: 18px;
    opacity: .55;
  }

  .log-empty-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }

  .log-empty-sub {
    font-size: 13px;
    color: #909399;
    line-height: 1.7;
    margin-bottom: 20px;
  }
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 20px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e0e0e0;
    border-radius: 99px;
  }
}

.log-card {
  background: #fff;
  border-radius: 12px;
  padding: 15px 16px;
  margin-bottom: 10px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .05);
  transition: all .22s;

  &:hover {
    box-shadow: 0 4px 16px rgba(74, 108, 247, .13);
    border-color: #c7d6ff;
    transform: translateY(-1px);
  }
}

.log-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.log-card-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #4a6cf7;
  background: #eef2ff;
  border-radius: 99px;
  padding: 3px 10px;

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4a6cf7;
    display: inline-block;
    flex-shrink: 0;
  }
}

.log-card-time {
  font-size: 11px;
  color: #c0c0c0;
}

.log-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 5px;
  line-height: 1.4;
}

.log-card-preview {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 11px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.log-card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  :deep(.el-button) {
    padding: 4px 10px;
    font-size: 12px;
  }
}

.log-no-result {
  text-align: center;
  padding: 36px 20px;
  color: #909399;

  .el-icon {
    font-size: 32px;
    margin-bottom: 8px;
    display: block;
  }

  p {
    font-size: 13px;
  }
}

.log-drawer-footer {
  flex-shrink: 0;
  padding: 10px 16px;
  font-size: 11px;
  color: #bbb;
  text-align: center;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

/* 动画 */
.log-item-anim-enter-active,
.log-item-anim-leave-active {
  transition: all .28s ease;
}

.log-item-anim-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.log-item-anim-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* 无数据兜底报告徽章 */
.log-empty-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
}

/* 无数据卡片整体降低饱和度 */
.log-card--empty {
  opacity: 0.85;
  border-color: #ffe7ba;

  &:hover {
    border-color: #ffc069;
    box-shadow: 0 4px 16px rgba(250, 140, 22, 0.12);
  }

  .log-card-badge {
    background: #fff7e6;
    color: #d46b08;

    .badge-dot {
      background: #fa8c16;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg)
  }

  to {
    transform: rotate(360deg)
  }
}
</style>