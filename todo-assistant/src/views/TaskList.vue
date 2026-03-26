<template>
  <div class="task-list">
    <!-- 顶部导航栏 -->
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">📋</div>
        </div>
        <div class="title">任务列表</div>
      </div>
      <div class="header-right">
        <div class="user-info">{{ userStore.userName }}</div>
        <el-button text @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button text @click="handleBackToChat">
          <el-icon><ChatDotRound /></el-icon>
          对话
        </el-button>
        <el-button text @click="handleViewStatistics">
          <el-icon><DataAnalysis /></el-icon>
          统计看板
        </el-button>
        <el-button text @click="handleLogout" type="danger">退出</el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-date-picker
          v-model="filters.date"
          type="date"
          placeholder="日期筛选"
          clearable
          style="width: 160px"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleFilterChange"
        />


        <el-select
          v-model="filters.status"
          placeholder="状态筛选"
          clearable
          style="width: 120px"
          @change="handleFilterChange"
        >
          <el-option label="全部" value="" />
          <el-option label="进行中" value="进行中" />
          <el-option label="已完成" value="已完成" />
        </el-select>

        <el-select
          v-model="filters.importance"
          placeholder="优先级筛选"
          clearable
          style="width: 120px"
          @change="handleFilterChange"
        >
          <el-option label="全部" value="" />
          <el-option label="高" value="高" />
          <el-option label="中" value="中" />
          <el-option label="低" value="低" />
        </el-select>

        <el-select
          v-model="filters.category"
          placeholder="分类筛选"
          clearable
          style="width: 120px"
          @change="handleFilterChange"
        >
          <el-option label="全部" value="" />
          <el-option label="工作" value="工作" />
          <el-option label="学习" value="学习" />
          <el-option label="生活" value="生活" />
          <el-option label="出行" value="出行" />
          <el-option label="其他" value="其他" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索任务内容"
          clearable
          style="width: 200px"
          @input="handleFilterChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button
          :type="hasActiveFilters ? 'primary' : 'info'"
          :plain="!hasActiveFilters"
          @click="handleResetFilters"
          :disabled="!hasActiveFilters"
        >
          <el-icon><RefreshLeft /></el-icon>
          重置筛选
        </el-button>
      </div>

      <div class="toolbar-right">
        <div class="task-count">
          共 {{ filteredTasks.length }} 项任务
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-content">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredTasks.length === 0" class="empty">
        <el-icon><DocumentCopy /></el-icon>
        <p>暂无任务</p>
        <el-button type="primary" @click="handleBackToChat">
          前往添加任务
        </el-button>
      </div>

      <div v-else class="task-list-container">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-card"
          :class="{
            'task-completed': task.status === '已完成',
            'task-high': task.importance === '高',
            'task-medium': task.importance === '中',
            'task-low': task.importance === '低'
          }"
        >
          <div class="task-header">
            <div class="task-priority" :class="getPriorityClass(task.importance)">
              {{ task.importance }}
            </div>
            <div class="task-category">{{ task.category }}</div>
            <div class="task-status">
              <el-tag
                :type="task.status === '已完成' ? 'success' : 'primary'"
                size="small"
              >
                {{ task.status }}
              </el-tag>
            </div>
          </div>

          <div class="task-body">
            <div class="task-content">{{ task.task_content }}</div>
            <div v-if="task.description" class="task-description">
              {{ task.description }}
            </div>
          </div>

          <div class="task-footer">
            <div 
              class="task-deadline" 
              v-if="task.deadline"
              :class="{ warning: isDeadlineNear(task.deadline) }"
            >
              <el-icon><Clock /></el-icon>
              {{ isDeadlineNear(task.deadline) ? '即将到期: ' : '截止: ' }}
              {{ formatDeadline(task.deadline) }}
            </div>
            <div class="task-actions">
              <el-button
                text
                type="primary"
                size="small"
                @click="handleToggleStatus(task)"
              >
                <el-icon><CircleCheck /></el-icon>
                {{ task.status === '已完成' ? '标记未完成' : '标记完成' }}
              </el-button>
              <el-button
                class="edit-btn" 
                text
                type="primary"
                size="small"
                @click="handleEditTask(task)"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                text
                type="danger"
                size="small"
                @click="handleDeleteTask(task)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑任务对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :append-to-body="true"
      title="编辑任务"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="editDialogVisible = false"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="任务内容">
          <el-input v-model="editForm.task_content" placeholder="请输入任务内容" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="工作" value="工作" />
            <el-option label="学习" value="学习" />
            <el-option label="生活" value="生活" />
            <el-option label="出行" value="出行" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="editForm.importance" placeholder="请选择优先级" style="width: 100%">
            <el-option label="高" value="高" />
            <el-option label="中" value="中" />
            <el-option label="低" value="低" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="editForm.deadline"
            type="datetime"
            placeholder="选择截止日期"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleSaveEdit"
            :loading="isSavingEdit"
            :disabled="isSavingEdit"
          >
            {{ isSavingEdit ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 遮罩层 -->
    <div v-if="editSaving" class="edit-mask">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      <span>正在处理...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { 
  getTaskList,
  updateTask,
  deleteTask
} from '@/api/task'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  ChatDotRound,
  Search,
  Loading,
  DocumentCopy,
  Edit,
  Delete,
  Clock,
  CircleCheck,
  RefreshLeft,
  DataAnalysis
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const tasks = ref([])

const filters = reactive({
  status: '',
  importance: '',
  category: '',
  keyword: '',
  date: ''  
})

// 编辑任务表单
const editDialogVisible = ref(false)
const editSaving = ref(false)  // 编辑保存状态
const editForm = reactive({
  id: null,
  task_content: '',
  category: '',
  importance: '',
  date: '',
  status: '',
  description: ''
})

// 筛选后的任务列表
const filteredTasks = computed(() => {
  let result = tasks.value

  //日期筛选
  if (filters.date) {
    const selectedDate = new Date(filters.date)
    result = result.filter(task => {
      const taskDeadline = new Date(task.deadline)
      return taskDeadline.toDateString() === selectedDate.toDateString()
    })
  }


  // 状态筛选
  if (filters.status) {
    result = result.filter(task => task.status === filters.status)
  }

  // 优先级筛选
  if (filters.importance) {
    result = result.filter(task => task.importance === filters.importance)
  }

  // 分类筛选
  if (filters.category) {
    result = result.filter(task => task.category === filters.category)
  }

  // 关键词搜索
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    result = result.filter(task =>
      task.task_content.toLowerCase().includes(keyword) ||
      (task.description && task.description.toLowerCase().includes(keyword))
    )
  }

  return result
})

// 格式化截止时间
const formatDeadline = (deadline) => {
  if (!deadline) return ''
  
  // 如果已经是格式化的字符串（YYYY-MM-DD HH:mm），直接格式化显示
  if (typeof deadline === 'string') {
    // 匹配格式：2026-03-25 15:00 或 2026-03-25 15:00:00
    const dateTimeMatch = deadline.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?(?::\d{2})?$/)
    if (dateTimeMatch) {
      const [, year, month, day, hour = '00', minute = '00'] = dateTimeMatch
      // 转换为显示格式：2026/03/25 15:00
      return `${year}/${month}/${day} ${hour}:${minute}`
    }
    
    // 匹配格式：2026-03-25（只有日期）
    const dateOnlyMatch = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch
      return `${year}/${month}/${day}`
    }
    
    // 尝试解析其他格式
    const date = new Date(deadline)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}/${month}/${day} ${hours}:${minutes}`
    }
  }
  
  return deadline
}

// 获取优先级对应的CSS类名
const getPriorityClass = (importance) => {
  const classMap = {
    '高': 'priority-high',
    '中': 'priority-medium',
    '低': 'priority-low'
  }
  return classMap[importance] || 'priority-medium'
}

// 判断截止时间是否即将到期（24小时内）
const isDeadlineNear = (deadline) => {
  if (!deadline) return false
  
  const now = new Date()
  const deadlineDate = new Date(deadline)
  
  // 如果日期解析失败，返回false
  if (isNaN(deadlineDate.getTime())) return false
  
  // 计算时间差（毫秒）
  const diff = deadlineDate - now
  
  // 24小时 = 24 * 60 * 60 * 1000 = 86400000 毫秒
  const twentyFourHours = 24 * 60 * 60 * 1000
  
  // 如果截止时间在未来且不足24小时，返回true
  return diff > 0 && diff < twentyFourHours
}

// 判断是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return !!(filters.date || filters.status || filters.importance || filters.category || filters.keyword)
})

// 重置筛选条件
const handleResetFilters = () => {
  filters.date = ''
  filters.status = ''
  filters.importance = ''
  filters.category = ''
  filters.keyword = ''
  ElMessage.success('筛选条件已重置')
}

// 加载所有任务
const loadAllTasks = async () => {
  loading.value = true
  try {
    console.log('🔍 [TaskList] 开始加载任务列表...')
    console.log('👤 用户ID:', userStore.userId)
    console.log('📋 筛选条件:', filters)
    
    // ✅ 使用 task.js 的查询函数（通过 Bot 返回 JSON）
    const tasksData = await getTaskList(
      {
        deadline: filters.date,
        status: filters.status,
        importance: filters.importance,
        category: filters.category,
        keyword: filters.keyword
      },
      userStore.userId
    )
    
    console.log('✅ [TaskList] 任务加载成功，共', tasksData.length, '条任务')
    console.log('📦 [TaskList] 任务数据:', tasksData)
    tasks.value = tasksData
    
  } catch (error) {
    console.error('❌ [TaskList] 加载任务失败:', error)
    ElMessage.error('加载任务失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 筛选条件变化
const handleFilterChange = () => {
  // 筛选逻辑由 computed 自动处理
}

// 刷新任务列表
const handleRefresh = () => {
  loadAllTasks()
  ElMessage.success('已刷新')
}

// 返回聊天界面
const handleBackToChat = () => {
  router.push('/chat')
}

// 查看统计看板
const handleViewStatistics = () => {
  router.push('/statistics');
};


// 切换任务状态
const handleToggleStatus = async (task) => {
  try {
    const newStatus = task.status === '已完成' ? '进行中' : '已完成'
    
    console.log('🔄 [TaskList] 切换任务状态:', task.id, newStatus)
    
    // ✅ 使用 task.js 的更新函数（通过 Bot）
    await updateTask(
      {
        id: task.id,
        status: newStatus,
        task_content: task.task_content,
        category: task.category,
        importance: task.importance,
        deadline: task.deadline,
        description: task.description
      },
      userStore.userId
    )
    
    // 更新本地数据
    task.status = newStatus
    ElMessage.success(newStatus === '已完成' ? '任务已完成' : '任务已标记为进行中')
    
  } catch (error) {
    console.error('❌ [TaskList] 切换状态失败:', error)
    ElMessage.error('操作失败：' + error.message)
  }
}

// 编辑任务
const handleEditTask = (task) => {
  console.log('✏️ [TaskList] 编辑任务:', task)

  // ✅ 关键修复：确保 ID 以字符串形式存储，避免大整数精度丢失
  editForm.id = String(task.id)
  editForm.task_content = task.task_content
  editForm.category = task.category
  editForm.importance = task.importance
  editForm.deadline = task.deadline
  editForm.status = task.status
  editForm.description = task.description

  editDialogVisible.value = true
}

const isSavingEdit = ref(false)

// 保存编辑
const handleSaveEdit = async () => {
  
  // ✅ 开始保存
  isSavingEdit.value = true
  try {
    console.log('💾 [TaskList] 保存编辑:', editForm)
    
    // ✅ 使用 task.js 的更新函数（通过 Bot）
    await updateTask(
      {
        id: String(editForm.id),
        task_content: editForm.task_content,
        category: editForm.category,
        importance: editForm.importance,
        deadline: editForm.deadline,
        status: editForm.status,
        description: editForm.description
      },
      userStore.userId
    )

    editDialogVisible.value = false
    ElMessage.success('任务已更新')
    
    // 重新加载任务列表
    await loadAllTasks()
    
  } catch (error) {
    console.error('❌ [TaskList] 保存编辑失败:', error)
    ElMessage.error('保存失败：' + error.message)
  } finally {
    // ✅ 恢复按钮状态
    isSavingEdit.value = false
  }
}

// 删除任务
const handleDeleteTask = async (task) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务"${task.task_content}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    console.log('🗑️ [TaskList] 删除任务:', task.id)
    
    // ✅ 使用 task.js 的删除函数（通过 Bot）
    await deleteTask(task.id, userStore.userId)
    
    // 从列表中移除
    tasks.value = tasks.value.filter(t => t.id !== task.id)
    
    ElMessage.success('任务已删除')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('❌ [TaskList] 删除任务失败:', error)
      ElMessage.error('删除失败：' + error.message)
    }
  }
}


// 退出登录
const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}

// 初始化
onMounted(() => {
  userStore.loadFromStorage()

  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  loadAllTasks()
})
</script>

<style scoped lang="scss">
.task-list {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

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
    gap: 16px;

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
  }
}

.toolbar {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;

  .toolbar-left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .toolbar-right {
    .task-count {
      font-size: 14px;
      color: #909399;
    }
  }
}

.task-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
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

.task-list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.task-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border-left: 4px solid transparent;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-3px);
  }

  &.task-completed {
    opacity: 0.5;
    border-left-color: #C0C6CC;

    .task-content {
      text-decoration: line-through;
      color: #909399;
    }
  }

  &.task-high {
    border-left-color: #F56C6C;
    box-shadow: 0 2px 12px rgba(245, 108, 108, 0.15);
  }

  &.task-medium {
    border-left-color: #E6A23C;
    box-shadow: 0 2px 12px rgba(230, 162, 60, 0.15);
  }

  &.task-low {
    border-left-color: #67C23A;
    box-shadow: 0 2px 12px rgba(103, 194, 58, 0.15);
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;

  .task-priority {
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    color: white;
    display: flex;
    align-items: center;
    gap: 5px;

    &::before {
      content: "●";
      font-size: 8px;
    }

    &.priority-high {
      background: linear-gradient(135deg, #F56C6C 0%, #F89898 100%);
    }

    &.priority-medium {
      background: linear-gradient(135deg, #E6A23C 0%, #F0C78A 100%);
    }

    &.priority-low {
      background: linear-gradient(135deg, #67C23A 0%, #85D570 100%);
    }
  }

  .task-category {
    font-size: 13px;
    color: #909399;
    background: #F5F7FA;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .task-status {
    flex-shrink: 0;
  }
}

.task-body {
  margin-bottom: 20px;

  .task-content {
    font-size: 20px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 10px;
    line-height: 1.6;
    padding-right: 10px;
  }

  .task-description {
    font-size: 14px;
    color: #606266;
    line-height: 1.6;
    padding: 10px;
    background: #F9FAFB;
    border-radius: 6px;
    border-left: 2px solid #E4E7ED;
  }
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px dashed #E4E7ED;

  .task-deadline {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #909399;

    &.warning {
      color: #f56c6c;
      font-weight: 500;

      .el-icon {
        color: #f56c6c;
      }
    }

    .el-icon {
      font-size: 14px;
    }
  }

  .task-actions {
    display: flex;
    gap: 10px;
    .el-button {
      padding: 4px 10px;
      font-size: 12px;
      background: transparent !important;
      border: none !important;
      color: #606266 !important;
      
      /* 标记完成/未完成按钮：淡黄色背景 + 深黄色文字 */
      &:hover:not(.edit-btn):not(.el-button--danger) {
        background: #FFF9E6 !important;
        color: #E6A23C !important;
      }
      
      /* 编辑按钮：淡蓝色背景 + 深蓝色文字 */
      &.edit-btn:hover {
        background: #ECF5FF !important;
        color: #409EFF !important;
      }
      
      /* 删除按钮：淡红色背景 + 深红色文字（保持原样） */
      &.el-button--danger:hover {
        color: #f56c6c !important;
        background: #fef0f0 !important;
      }
    }
  }
}

.task-status .el-tag {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  
  &.primary {
    background-color: #409EFF;
    border-color: #409EFF;
  }
  
  &.success {
    background-color: #67C23A;
    border-color: #67C23A;
  }
}

.edit-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: white;
  font-size: 16px;
  gap: 20px;

  .el-icon {
    animation: rotating 2s linear infinite;
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
</style>