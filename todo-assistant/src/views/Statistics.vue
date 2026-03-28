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
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="week">按周</el-radio-button>
            <el-radio-button label="month">按月</el-radio-button>
          </el-radio-group>
        </div>
        <el-button type="primary" @click="handleGenerateReport">
          <el-icon><Document /></el-icon>
          生成报告
        </el-button>
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
        <h3>完成率趋势与任务增长率（{{ timeDimension === 'all' ? '全部' : (timeDimension === 'week' ? '近7天' : '近30天') }}）</h3>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useUserStore } from '@/stores/user'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { Refresh, List, ChatDotRound , Document} from '@element-plus/icons-vue'
import StatCard from '@/components/StatCard.vue'
import { getTaskList } from '@/api/task'
import { Loading } from '@element-plus/icons-vue'

const router = useRouter()
const taskStore = useTaskStore()
const userStore = useUserStore()

const trendChart = ref(null)
const categoryChart = ref(null)
const priorityChart = ref(null)
const loading = ref(false)

// 时间维度筛选：week-按周, month-按月
const timeDimension = ref('week')

let trendChartInstance = null
let categoryChartInstance = null
let priorityChartInstance = null

// 根据时间维度过滤任务
const filteredTasks = computed(() => {
  const now = new Date()
  let startDate

  if (timeDimension.value === 'all') {
    // 全部：返回所有任务，不进行时间过滤
    return taskStore.tasks
  } else if (timeDimension.value === 'week') {
    // 近7天
    startDate = new Date(now)
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
  } else if (timeDimension.value === 'month') {
    // 近30天
    startDate = new Date(now)
    startDate.setDate(now.getDate() - 29)
    startDate.setHours(0, 0, 0, 0)
  }

  return taskStore.tasks.filter(task => {
    const taskDate = new Date(task.createdAt)
    return taskDate >= startDate && taskDate <= now
  })
})

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

// 初始化完成率趋势与任务增长率混合图
function initTrendChart() {
  if (!trendChart.value) return

  if (trendChartInstance) {
    trendChartInstance.dispose()
  }

  trendChartInstance = echarts.init(trendChart.value)

  // 根据时间维度确定天数范围
  let days
  if (timeDimension.value === 'all') {
    // 全部：计算所有任务的最早和最晚日期，显示完整的时间跨度
    const tasks = taskStore.tasks
    if (tasks.length === 0) {
      days = 7 // 默认显示7天
    } else {
      const dates = tasks.map(task => new Date(task.createdAt).getTime())
      const minDate = new Date(Math.min(...dates))
      const maxDate = new Date(Math.max(...dates))
      const diffTime = Math.abs(maxDate - minDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      days = Math.max(diffDays, 1) // 至少显示1天
    }
  } else if (timeDimension.value === 'week') {
    days = 7
  } else if (timeDimension.value === 'month') {
    days = 30
  }

  // 计算时间范围内的数据
  const dates = []
  const completionRates = []
  const newTaskCounts = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    // 使用本地时间格式化日期，避免时区问题
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`  // ✅ 本地时间

    // 显示格式：MM-DD
    const displayDate = `${month}-${day}`
    dates.push(displayDate)

    // 计算截止到当天的累计完成率（使用过滤后的任务）
    const tasksCreatedBeforeOrOnDate = filteredTasks.value.filter(task => {
      const taskDate = new Date(task.createdAt)
      const taskYear = taskDate.getFullYear()
      const taskMonth = String(taskDate.getMonth() + 1).padStart(2, '0')
      const taskDay = String(taskDate.getDate()).padStart(2, '0')
      const taskDateStr = `${taskYear}-${taskMonth}-${taskDay}`
      return taskDateStr <= dateStr
    })

    const tasksCompletedBeforeOrOnDate = tasksCreatedBeforeOrOnDate.filter(task => {
      return task.status === '已完成'
    })

    // 计算累计完成率百分比
    const rate = tasksCreatedBeforeOrOnDate.length > 0
      ? Math.round((tasksCompletedBeforeOrOnDate.length / tasksCreatedBeforeOrOnDate.length) * 100)
      : 0
    completionRates.push(rate)

    // 统计当天创建的任务数量（任务增长率，使用过滤后的任务）
    const count = filteredTasks.value.filter(task => {
      const taskDate = new Date(task.createdAt)
      const taskYear = taskDate.getFullYear()
      const taskMonth = String(taskDate.getMonth() + 1).padStart(2, '0')
      const taskDay = String(taskDate.getDate()).padStart(2, '0')
      const taskDateStr = `${taskYear}-${taskMonth}-${taskDay}`
      return taskDateStr === dateStr
    }).length
    newTaskCounts.push(count)
  }

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

// 生成报告处理（空函数）
function handleGenerateReport() {
  console.log('📄 [Statistics] 点击生成报告按钮')
  ElMessage.info('生成报告功能开发中...')
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

  console.log('🔄 [Statistics] 手动刷新')
  
  loadTasksFromAPI().then(() => {
    try{
      refreshCharts()
      ElMessage.success('数据已刷新')
    } catch (error) {
        ElMessage.error('数据刷新失败')
    } finally {
    // ✅ 隐藏遮罩
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

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  console.log('🔚 [Statistics] 组件已卸载')
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  categoryChartInstance?.dispose()
  priorityChartInstance?.dispose()
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
  }
}
</style>