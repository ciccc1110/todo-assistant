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



    <!-- 主内容区 -->
    <div class="main-content">

      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <!-- 总览卡片 -->
      <div class="overview-cards">
        <StatCard title="总任务数" :value="taskStore.allTasks.length" />
        <StatCard title="已完成" :value="taskStore.completedTasks.length" />
        <StatCard title="待办数" :value="taskStore.pendingTasks.length" />
        <StatCard title="已过期" :value="taskStore.expiredTasks.length" />
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
            <div class="rate-value">{{ taskStore.onTimeCompletionRate ?? 0 }}%</div>
            <div class="rate-desc">截止时间前主动完成的任务占比</div>
          </div>
        </div>
      </div>

      <!-- 完成率趋势图 -->
      <div class="chart-container">
        <h3>完成率趋势（近7天）</h3>
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
import { Refresh, List, ChatDotRound } from '@element-plus/icons-vue'
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

let trendChartInstance = null
let categoryChartInstance = null
let priorityChartInstance = null


// 计算完成率：已完成 / 总任务数 × 100%
const completionRate = computed(() => {
  const total = taskStore.allTasks?.length || 0
  const completed = taskStore.completedTasks?.length || 0
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
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
      updatedAt: task.updated_at || task.created_at || new Date().toISOString()
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

// 初始化完成率趋势图
function initTrendChart() {
  if (!trendChart.value) return

  if (trendChartInstance) {
    trendChartInstance.dispose()
  }

  trendChartInstance = echarts.init(trendChart.value)

  // 计算近7天的完成数据
  const last7Days = []
  const completedCount = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    last7Days.push(dateStr.slice(5))

    const count = taskStore.completedTasks.filter(task => {
      const taskDate = new Date(task.updatedAt || task.createdAt).toISOString().split('T')[0]
      return taskDate === dateStr
    }).length

    completedCount.push(count)
  }

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: last7Days
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: completedCount,
      type: 'line',
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
    }]
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

  const categories = {}
  taskStore.tasks.forEach(task => {
    const category = task.category || '其他'
    categories[category] = (categories[category] || 0) + 1
  })

  const data = Object.keys(categories).map(key => ({
    name: key,
    value: categories[key]
  }))

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      type: 'pie',
      radius: '50%',
      data: data,
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

  const priorities = ['高', '中', '低']
  const data = priorities.map(priority => {
    const count = taskStore.tasks.filter(task => task.importance === priority).length
    return {
      name: priority,
      value: count
    }
  })

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: priorities
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        data: data.map(item => item.value),
        type: 'bar',
        itemStyle: {
          color: (params) => {
            const colors = ['#F56C6C', '#E6A23C', '#67C23A']
            return colors[params.dataIndex]
          }
        }
      }
    ]
  }

  priorityChartInstance.setOption(option)
}

// 刷新所有图表
function refreshCharts() {
  console.log('🔄 [Statistics] refreshCharts 被调用')
  console.log('📦 [Statistics] 当前任务数量:', taskStore.tasks.length)
  console.log('📦 [Statistics] 已完成任务:', taskStore.completedTasks.length)
  console.log('📦 [Statistics] 待办任务:', taskStore.pendingTasks.length)
  console.log('📦 [Statistics] 已过期任务:', taskStore.expiredTasks.length)

  initTrendChart()
  initCategoryChart()
  initPriorityChart()
}

function handleRefresh() {
  console.log('🔄 [Statistics] 手动刷新')
  loadTasksFromAPI().then(() => {
    refreshCharts()
    ElMessage.success('数据已刷新')
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

  .loading{
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #f5f7fa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;  // 改为100%
    color: #909399;

    .el-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    p {
      font-size: 16px;
      margin-bottom: 24px;
    }
  }
}
</style>