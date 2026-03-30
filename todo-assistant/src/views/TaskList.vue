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
          <el-icon>
            <Refresh />
          </el-icon>
          刷新
        </el-button>
        <el-button text @click="handleBackToChat">
          <el-icon>
            <ChatDotRound />
          </el-icon>
          对话
        </el-button>
        <el-button text @click="handleViewStatistics">
          <el-icon>
            <DataAnalysis />
          </el-icon>
          统计看板
        </el-button>
        <el-button text @click="handleLogout" type="danger">退出</el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-date-picker v-model="filters.date" type="date" placeholder="日期筛选" clearable style="width: 160px"
          format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleFilterChange" />

        <el-select v-model="filters.status" placeholder="状态筛选" clearable style="width: 120px"
          @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="进行中" value="进行中" />
          <el-option label="已完成" value="已完成" />
          <el-option label="已过期" value="已过期" />
        </el-select>

        <el-select v-model="filters.importance" placeholder="优先级筛选" clearable style="width: 120px"
          @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="高" value="高" />
          <el-option label="中" value="中" />
          <el-option label="低" value="低" />
        </el-select>

        <el-select v-model="filters.category" placeholder="分类筛选" clearable style="width: 120px"
          @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="工作" value="工作" />
          <el-option label="学习" value="学习" />
          <el-option label="生活" value="生活" />
          <el-option label="出行" value="出行" />
          <el-option label="其他" value="其他" />
        </el-select>

        <el-input v-model="filters.keyword" placeholder="搜索任务内容" clearable style="width: 200px"
          @input="handleFilterChange">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>

        <el-button :type="hasActiveFilters ? 'primary' : 'info'" :plain="!hasActiveFilters" @click="handleResetFilters"
          :disabled="!hasActiveFilters">
          <el-icon>
            <RefreshLeft />
          </el-icon>
          重置筛选
        </el-button>
      </div>

      <div class="toolbar-right">
        <!-- 排序控件 -->
        <div class="sort-group">
          <span class="sort-label">排序：</span>

          <!-- 排序字段选择 -->
          <div class="sort-chips">
            <div v-for="opt in sortOptions" :key="opt.value" class="sort-chip"
              :class="{ active: sortField === opt.value }" @click="handleSortFieldChange(opt.value)">
              <el-icon>
                <component :is="opt.icon" />
              </el-icon>
              {{ opt.label }}
              <!-- 当前激活的字段显示升降序箭头 -->
              <span v-if="sortField === opt.value" class="sort-direction-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
          </div>

          <!-- 升降序切换按钮（仅在有激活字段时显示） -->
          <el-button v-if="sortField" size="small" :type="sortOrder === 'asc' ? 'primary' : 'warning'" plain
            @click="toggleSortOrder" style="min-width: 80px">
            <el-icon>
              <component :is="sortOrder === 'asc' ? 'SortUp' : 'SortDown'" />
            </el-icon>
            {{ sortOrder === 'asc' ? '升序' : '降序' }}
          </el-button>

          <!-- 清除排序 -->
          <el-button v-if="sortField" size="small" text @click="clearSort" style="color: #909399">
            <el-icon>
              <Close />
            </el-icon>
            清除
          </el-button>
        </div>

        <div class="task-count">
          共 <strong>{{ sortedAndFilteredTasks.length }}</strong> 项任务
        </div>
      </div>
    </div>

    <!-- 排序说明条（有激活排序时展示） -->
    <div v-if="sortField" class="sort-hint-bar">
      <el-icon style="color: #409EFF">
        <Sort />
      </el-icon>
      <span>
        当前按
        <strong>{{ currentSortLabel }}</strong>
        {{ sortOrder === 'asc' ? '升序' : '降序' }}排列
        <span v-if="sortOrder === 'asc'" class="sort-hint-desc">
          （{{ getSortHintText('asc') }}）
        </span>
        <span v-else class="sort-hint-desc">
          （{{ getSortHintText('desc') }}）
        </span>
      </span>
    </div>

    <!-- 任务列表 -->
    <div class="task-content">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="sortedAndFilteredTasks.length === 0" class="empty">
        <el-icon>
          <DocumentCopy />
        </el-icon>
        <p>暂无任务</p>
        <el-button type="primary" @click="handleBackToChat">
          前往添加任务
        </el-button>
      </div>

      <div v-else class="task-list-container">
        <div v-for="task in sortedAndFilteredTasks" :key="task.id" class="task-card" :class="{
          'task-completed': task.status === '已完成',
          'task-expired': task.status === '已过期',
          'task-high': task.importance === '高',
          'task-medium': task.importance === '中',
          'task-low': task.importance === '低'
        }">
          <div class="task-header">
            <div class="task-priority" :class="getPriorityClass(task.importance)">
              {{ task.importance }}
            </div>
            <div class="task-category">{{ task.category }}</div>
            <div class="task-status">
              <el-tag :type="task.status === '已完成' ? 'success' : (task.status === '已过期' ? 'danger' : 'primary')"
                size="small">
                {{ task.status }}
              </el-tag>
            </div>
          </div>

          <div class="task-body">
            <div class="task-content-text">{{ task.task_content }}</div>
            <div v-if="task.description" class="task-description">
              {{ task.description }}
            </div>
            <div v-if="isExpiredTask(task)" class="task-expired-hint">
              <el-icon>
                <Warning />
              </el-icon>
              此任务已逾期
            </div>
          </div>

          <div class="task-footer">
            <div class="task-deadline" v-if="task.deadline" :class="{
              warning: isDeadlineNear(task.deadline),
              expired: isExpiredTask(task)
            }">
              <el-icon>
                <Clock />
              </el-icon>
              {{ isDeadlineNear(task.deadline) ? '即将到期: ' : '截止: ' }}
              {{ formatDeadline(task.deadline) }}
            </div>
            <div v-else class="task-deadline-empty">
              <el-icon>
                <Warning />
              </el-icon>
              <span>未设置截止时间</span>
            </div>
            <div class="task-actions">
              <el-button text type="primary" size="small" @click="handleToggleStatus(task)">
                <el-icon>
                  <CircleCheck />
                </el-icon>
                {{ task.status === '已完成' ? '标记未完成' : '标记完成' }}
              </el-button>
              <el-button class="edit-btn" text type="primary" size="small" @click="handleEditTask(task)">
                <el-icon>
                  <Edit />
                </el-icon>
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteTask(task)">
                <el-icon>
                  <Delete />
                </el-icon>
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑任务对话框 -->
    <el-dialog v-model="editDialogVisible" :append-to-body="true" title="编辑任务" width="500px"
      :close-on-click-modal="false" :close-on-press-escape="false" @close="editDialogVisible = false">
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
          <el-date-picker v-model="editForm.deadline" type="datetime" placeholder="选择截止日期" style="width: 100%"
            format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm" />
          <div v-if="!editForm.deadline" class="deadline-tip">
            <el-icon size="14">
              <Warning />
            </el-icon>
            <span>截止时间为空，建议设置截止时间以便更好地管理任务</span>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已过期" value="已过期" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入任务描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveEdit" :loading="isSavingEdit" :disabled="isSavingEdit">
            {{ isSavingEdit ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 操作遮罩 -->
    <div v-if="editSaving || isDeleting || isToggling" class="edit-mask">
      <el-icon class="is-loading" :size="40">
        <Loading />
      </el-icon>
      <span>{{ isDeleting ? '正在删除任务...' : isToggling ? '正在更新状态...' : '正在处理...' }}</span>
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
  Refresh, ChatDotRound, Search, Loading, DocumentCopy,
  Edit, Delete, Clock, CircleCheck, RefreshLeft, DataAnalysis,
  Warning, Sort, Close
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const tasks = ref([])

const filters = reactive({
  status: '', importance: '', category: '', keyword: '', date: ''
})

// ── 排序状态 ─────────────────────────────────────────────────────────
const sortField = ref('')   // 当前排序字段
const sortOrder = ref('asc') // 'asc' | 'desc'

/** 所有可用排序选项 */
const sortOptions = [
  { value: 'created_at', label: '创建时间', icon: 'Calendar' },
  { value: 'deadline', label: '截止时间', icon: 'Clock' },
  { value: 'importance', label: '优先级', icon: 'Star' },
  { value: 'status', label: '状态', icon: 'CircleCheck' },
  { value: 'category', label: '分类', icon: 'Collection' },
]

/** 优先级排序权重 */
const importanceWeight = { '高': 3, '中': 2, '低': 1 }

/** 状态排序权重 */
const statusWeight = { '进行中': 3, '已过期': 2, '已完成': 1 }

/** 切换排序字段（点同一字段则切换升降序，点新字段则激活并默认升序） */
function handleSortFieldChange(field) {
  if (sortField.value === field) {
    // 已激活 → 切换升降序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    // 截止时间和创建时间默认升序（最近的排前面），优先级默认降序（高优先）
    sortOrder.value = (field === 'importance' || field === 'status') ? 'desc' : 'asc'
  }
}

/** 切换升降序 */
function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

/** 清除排序 */
function clearSort() {
  sortField.value = ''
  sortOrder.value = 'asc'
}

/** 当前激活排序字段的显示名称 */
const currentSortLabel = computed(() =>
  sortOptions.find(o => o.value === sortField.value)?.label || ''
)

/** 当前激活排序字段的图标 */
const currentSortIcon = computed(() =>
  sortOptions.find(o => o.value === sortField.value)?.icon || 'Sort'
)

/** 排序说明文本 */
function getSortHintText(order) {
  const field = sortField.value
  if (field === 'created_at') return order === 'asc' ? '最早创建在前' : '最近创建在前'
  if (field === 'deadline') return order === 'asc' ? '最近截止在前' : '最晚截止在前'
  if (field === 'importance') return order === 'asc' ? '低优先级在前' : '高优先级在前'
  if (field === 'status') return order === 'asc' ? '已完成在前' : '进行中在前'
  if (field === 'category') return order === 'asc' ? 'A→Z 分类顺序' : 'Z→A 分类顺序'
  return ''
}

/** 获取任务对应排序字段的展示值 */
function getSortFieldValue(task) {
  if (!sortField.value) return ''
  if (sortField.value === 'created_at') return task.created_at ? formatDeadline(task.created_at) : '未知'
  if (sortField.value === 'deadline') return task.deadline ? formatDeadline(task.deadline) : '未设置'
  if (sortField.value === 'importance') return task.importance || ''
  if (sortField.value === 'status') return task.status || ''
  if (sortField.value === 'category') return task.category || ''
  return ''
}

// ── 核心计算：筛选 + 排序 ────────────────────────────────────────────
const filteredTasks = computed(() => {
  let result = tasks.value

  if (filters.date) {
    const selected = new Date(filters.date)
    result = result.filter(task => {
      if (!task.deadline) return false
      const d = new Date(task.deadline)
      return d.toDateString() === selected.toDateString()
    })
  }
  if (filters.status) result = result.filter(t => t.status === filters.status)
  if (filters.importance) result = result.filter(t => t.importance === filters.importance)
  if (filters.category) result = result.filter(t => t.category === filters.category)
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    result = result.filter(t =>
      t.task_content.toLowerCase().includes(kw) ||
      (t.description && t.description.toLowerCase().includes(kw))
    )
  }
  return result
})

const sortedAndFilteredTasks = computed(() => {
  if (!sortField.value) return filteredTasks.value

  const field = sortField.value
  const order = sortOrder.value
  const dir = order === 'asc' ? 1 : -1

  return [...filteredTasks.value].sort((a, b) => {
    let va, vb

    if (field === 'created_at') {
      va = a.created_at ? new Date(a.created_at).getTime() : 0
      vb = b.created_at ? new Date(b.created_at).getTime() : 0
    } else if (field === 'deadline') {
      // 没有截止时间的任务排到最后
      va = a.deadline ? new Date(a.deadline).getTime() : Infinity
      vb = b.deadline ? new Date(b.deadline).getTime() : Infinity
    } else if (field === 'importance') {
      va = importanceWeight[a.importance] ?? 0
      vb = importanceWeight[b.importance] ?? 0
    } else if (field === 'status') {
      va = statusWeight[a.status] ?? 0
      vb = statusWeight[b.status] ?? 0
    } else if (field === 'category') {
      va = a.category || ''
      vb = b.category || ''
      return dir * va.localeCompare(vb, 'zh-CN')
    } else {
      return 0
    }

    if (va < vb) return -dir
    if (va > vb) return dir
    return 0
  })
})

// ── 筛选相关 ─────────────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
  !!(filters.date || filters.status || filters.importance || filters.category || filters.keyword)
)

function handleFilterChange() { /* 筛选由 computed 自动响应 */ }

function handleResetFilters() {
  filters.date = ''; filters.status = ''; filters.importance = ''
  filters.category = ''; filters.keyword = ''
  ElMessage.success('筛选条件已重置')
}

// ── 工具函数 ─────────────────────────────────────────────────────────
const formatDeadline = (deadline) => {
  if (!deadline) return ''
  if (typeof deadline === 'string') {
    const m1 = deadline.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?(?::\d{2})?$/)
    if (m1) {
      const [, y, mo, d, h = '00', min = '00'] = m1
      return `${y}/${mo}/${d} ${h}:${min}`
    }
    const m2 = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`
    const dt = new Date(deadline)
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
    }
  }
  return deadline
}

const getPriorityClass = (importance) =>
  ({ '高': 'priority-high', '中': 'priority-medium', '低': 'priority-low' }[importance] || 'priority-medium')

const isDeadlineNear = (deadline) => {
  if (!deadline) return false
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return false
  const diff = d - new Date()
  return diff > 0 && diff < 86400000
}

const isExpiredTask = (task) => {
  if (task.status === '已完成' || task.status === '进行中') return false
  return new Date(task.deadline) < new Date()
}

// ── 数据加载 ─────────────────────────────────────────────────────────
const loadAllTasks = async () => {
  loading.value = true
  try {
    const tasksData = await getTaskList(
      { deadline: filters.date, status: filters.status, importance: filters.importance, category: filters.category, keyword: filters.keyword },
      userStore.userId
    )
    tasks.value = tasksData
  } catch (error) {
    ElMessage.error('加载任务失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// ── 编辑任务 ─────────────────────────────────────────────────────────
const editDialogVisible = ref(false)
const editForm = reactive({
  id: null, task_content: '', category: '', importance: '',
  deadline: '', status: '', description: ''
})
const isSavingEdit = ref(false)
const editSaving = ref(false)

const handleEditTask = (task) => {
  editForm.id = String(task.id)
  editForm.task_content = task.task_content
  editForm.category = task.category
  editForm.importance = task.importance
  editForm.deadline = task.deadline
  editForm.status = task.status
  editForm.description = task.description
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  isSavingEdit.value = true
  editSaving.value = true
  try {
    await updateTask(
      { id: String(editForm.id), task_content: editForm.task_content, category: editForm.category, importance: editForm.importance, deadline: editForm.deadline, status: editForm.status, description: editForm.description },
      userStore.userId
    )
    editDialogVisible.value = false
    ElMessage.success('任务已更新')
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  } finally {
    isSavingEdit.value = false
    editSaving.value = false
    await loadAllTasks()
  }
}

// ── 切换状态 ─────────────────────────────────────────────────────────
const isToggling = ref(false)
const handleToggleStatus = async (task) => {
  const newStatus = task.status === '已完成' ? '进行中' : (task.status === '已过期' ? '已完成' : '已完成')
  isToggling.value = true
  try {
    await updateTask(
      { id: task.id, status: newStatus, task_content: task.task_content, category: task.category, importance: task.importance, deadline: task.deadline, description: task.description },
      userStore.userId
    )
    task.status = newStatus
    ElMessage.success(newStatus === '已完成' ? '任务已完成' : '任务已标记为进行中')
  } catch (error) {
    ElMessage.error('操作失败：' + error.message)
  } finally {
    isToggling.value = false
  }
}

// ── 删除任务 ─────────────────────────────────────────────────────────
const isDeleting = ref(false)
const handleDeleteTask = async (task) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务"${task.task_content}"吗？`, '删除确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    isDeleting.value = true
    await deleteTask(task.id, userStore.userId)
    tasks.value = tasks.value.filter(t => t.id !== task.id)
    ElMessage.success('任务已删除')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败：' + error.message)
  } finally {
    isDeleting.value = false
  }
}

// ── 导航 ─────────────────────────────────────────────────────────────
const handleRefresh = () => { loadAllTasks(); ElMessage.success('已刷新') }
const handleBackToChat = () => router.push('/chat')
const handleViewStatistics = () => router.push('/statistics')
const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout(); ElMessage.success('已退出登录'); router.push('/login')
  }
}

onMounted(() => {
  userStore.loadFromStorage()
  if (!userStore.isLoggedIn) { router.push('/login'); return }
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

/* ── 顶部导航 ── */
.header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);

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
    gap: 16px;

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

/* ── 工具栏 ── */
.toolbar {
  background: white;
  padding: 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid #e4e7ed;

  .toolbar-left {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
}

/* ── 排序控件组 ── */
.sort-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .sort-label {
    font-size: 13px;
    color: #606266;
    font-weight: 500;
    white-space: nowrap;
  }
}

.sort-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sort-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  background: #f5f7fa;
  color: #606266;
  transition: all 0.2s;
  user-select: none;

  .el-icon {
    font-size: 13px;
  }

  .sort-direction-icon {
    font-size: 14px;
    font-weight: 700;
    margin-left: 2px;
    line-height: 1;
  }

  &:hover {
    border-color: #409EFF;
    color: #409EFF;
    background: #ecf5ff;
  }

  &.active {
    border-color: #409EFF;
    background: #409EFF;
    color: #fff;
    box-shadow: 0 2px 6px rgba(64, 158, 255, .35);

    .sort-direction-icon {
      color: #fff;
    }
  }
}

/* ── 排序说明条 ── */
.sort-hint-bar {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
  border-bottom: 1px solid #b3d8ff;
  padding: 8px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #409EFF;
  flex-shrink: 0;

  strong {
    font-weight: 600;
  }

  .sort-hint-desc {
    color: #909399;
    margin-left: 2px;
  }
}

/* ── 任务数量 ── */
.task-count {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;

  strong {
    color: #303133;
    font-weight: 600;
  }
}

/* ── 任务内容区 ── */
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

/* ── 任务卡片 ── */
.task-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
  transition: all 0.3s ease;
  border-left: 4px solid transparent;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, .12);
    transform: translateY(-3px);
  }

  &.task-completed {
    opacity: .5;
    border-left-color: #C0C6CC;

    .task-content-text {
      text-decoration: line-through;
      color: #909399;
    }
  }

  &.task-high {
    border-left-color: #F56C6C;
    box-shadow: 0 2px 12px rgba(245, 108, 108, .15);
  }

  &.task-medium {
    border-left-color: #E6A23C;
    box-shadow: 0 2px 12px rgba(230, 162, 60, .15);
  }

  &.task-low {
    border-left-color: #67C23A;
    box-shadow: 0 2px 12px rgba(103, 194, 58, .15);
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

    &.priority-high {
      background: linear-gradient(135deg, #F56C6C, #F89898);
    }

    &.priority-medium {
      background: linear-gradient(135deg, #E6A23C, #F0C78A);
    }

    &.priority-low {
      background: linear-gradient(135deg, #67C23A, #85D570);
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
  margin-bottom: 12px;

  .task-content-text {
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
  padding-top: 14px;
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
        color: #f56c6c
      }
    }

    &.expired {
      color: #f56c6c;
      font-weight: 600;

      .el-icon {
        color: #f56c6c
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

      &:hover:not(.edit-btn):not(.el-button--danger) {
        background: #FFF9E6 !important;
        color: #E6A23C !important;
      }

      &.edit-btn:hover {
        background: #ECF5FF !important;
        color: #409EFF !important;
      }

      &.el-button--danger:hover {
        color: #f56c6c !important;
        background: #fef0f0 !important;
      }
    }
  }
}

.task-expired-hint {
  margin-top: 12px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #fef0f0, #fde2e2);
  border-radius: 6px;
  color: #f56c6c;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-left: 3px solid #f56c6c;

  .el-icon {
    font-size: 16px;
  }
}

.task-deadline-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #E6A23C;
  background: linear-gradient(135deg, #FFF9E6, #FFFBF0);
  padding: 6px 10px;
  border-radius: 6px;
  border-left: 2px solid #E6A23C;

  .el-icon {
    font-size: 14px;
    color: #E6A23C;
  }

  span {
    font-weight: 500;
    line-height: 1.5;
  }
}

.deadline-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #E6A23C;
  margin-top: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #FFF9E6, #FFFBF0);
  border-radius: 6px;
  border-left: 3px solid #E6A23C;
  box-shadow: 0 1px 3px rgba(230, 162, 60, .1);

  .el-icon {
    flex-shrink: 0;
  }

  span {
    flex: 1;
    line-height: 1.5;
  }
}

/* ── 操作遮罩 ── */
.edit-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, .5);
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