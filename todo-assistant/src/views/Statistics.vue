<template>
  <div class="statistics">
    <el-container>
      <el-header>
        <div class="header-left">
          <el-button link @click="$router.push('/chat')">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <span class="title">统计看板</span>
        </div>
        <div class="header-right">
          <el-button link @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </el-header>

      <el-main>
        <!-- 总览卡片 -->
        <div class="overview-cards">
          <StatCard title="总任务数" :value="taskStore.allTasks.length" />
          <StatCard title="已完成" :value="taskStore.completedTasks.length" />
          <StatCard title="待办数" :value="taskStore.pendingTasks.length" />
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
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useTaskStore } from '@/stores/task'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import StatCard from '@/components/StatCard.vue'

const taskStore = useTaskStore()

const trendChart = ref(null)
const categoryChart = ref(null)
const priorityChart = ref(null)

let trendChartInstance = null
let categoryChartInstance = null
let priorityChartInstance = null

// 初始化完成率趋势图
function initTrendChart() {
  if (!trendChart.value) return

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
      const taskDate = new Date(task.updatedAt).toISOString().split('T')[0]
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
    series: [
      {
        data: completedCount,
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.5)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
            ]
          }
        },
        itemStyle: {
          color: '#409EFF'
        }
      }
    ]
  }

  trendChartInstance.setOption(option)
}

// 初始化分类统计图
function initCategoryChart() {
  if (!categoryChart.value) return

  categoryChartInstance = echarts.init(categoryChart.value)

  // 计算各分类任务数
  const categories = ['工作类', '学习类', '生活类', '健康类']
  const data = categories.map(category => ({
    name: category,
    value: taskStore.allTasks.filter(t => t.category === category).length
  }))

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      right: 10
    },
    series: [
      {
        name: '任务分类',
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
      }
    ]
  }

  categoryChartInstance.setOption(option)
}

// 初始化优先级分布图
function initPriorityChart() {
  if (!priorityChart.value) return

  priorityChartInstance = echarts.init(priorityChart.value)

  // 计算各优先级任务数
  const priorities = ['高', '中', '低']
  const data = priorities.map(priority => ({
    name: priority,
    value: taskStore.allTasks.filter(t => t.priority === priority).length
  }))

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
  if (trendChartInstance) {
    trendChartInstance.dispose()
  }
  if (categoryChartInstance) {
    categoryChartInstance.dispose()
  }
  if (priorityChartInstance) {
    priorityChartInstance.dispose()
  }

  initTrendChart()
  initCategoryChart()
  initPriorityChart()
}

function handleRefresh() {
  refreshCharts()
  ElMessage.success('数据已刷新')
}

// 响应式调整图表大小
function handleResize() {
  trendChartInstance?.resize()
  categoryChartInstance?.resize()
  priorityChartInstance?.resize()
}

onMounted(() => {
  taskStore.loadTasks()  // 加载最新数据
  refreshCharts()
  window.addEventListener('resize', handleResize)
})

// 监听任务数据变化，自动刷新图表
watch(
  () => taskStore.tasks,
  () => {
    refreshCharts()
  },
  { deep: true }
)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  categoryChartInstance?.dispose()
  priorityChartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.statistics {
  height: 100vh;
  background: #F5F7FA;

  .el-container {
    height: 100%;
  }

  .el-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border-bottom: 1px solid #DCDFE6;
    padding: 0 24px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .title {
        font-size: 16px;
        font-weight: bold;
        color: #303133;
      }
    }

    .header-right {
      display: flex;
      gap: 8px;
    }
  }

  .el-main {
    padding: 24px;
    overflow-y: auto;

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
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
}
</style>