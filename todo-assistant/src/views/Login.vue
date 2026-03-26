<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">
          <div class="logo-icon">📋</div>
        </div>
        <h1 class="title">个人日常待办事项智能管理助手</h1>
        <p class="subtitle">登录以开始管理您的待办任务</p>
      </div>

      <div class="login-form">
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-position="top"
          size="large"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="用户名" prop="userName">
            <el-input
              v-model="loginForm.userName"
              placeholder="请输入您的用户名"
              clearable
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>

          <el-form-item>
            <div class="login-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>首次登录将自动创建账户</span>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { ElMessage } from 'element-plus'
import { User, InfoFilled } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  userName: ''
})

const loginRules = {
  userName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    // 验证表单
    await loginFormRef.value.validate()

    loading.value = true

    // 模拟登录延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 🔥 清空之前的聊天历史（防止切换用户后显示上一个用户的对话）
    chatStore.clearMessages()
    localStorage.removeItem('chat_messages')

    // 🔥 使用固定的 userId（基于用户名）
    const fixedUserId = userStore.generateFixedUserId(loginForm.userName)

    // 登录用户
    userStore.login(fixedUserId, loginForm.userName)

    ElMessage.success(`欢迎，${loginForm.userName}！`)

    // 跳转到聊天页面
    router.push('/chat')
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  padding: 40px 30px 30px;
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

  .logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);

    .logo-icon {
      font-size: 40px;
    }
  }

  .title {
    font-size: 22px;
    font-weight: 700;
    color: #303133;
    margin-bottom: 10px;
    line-height: 1.4;
  }

  .subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.login-form {
  padding: 30px;

  .login-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .login-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #909399;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 8px;
    text-align: center;
    justify-content: center;

    .el-icon {
      color: #409eff;
      font-size: 16px;
    }
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: none;
  border: 1px solid #dcdfe6;
  transition: all 0.3s;

  &:hover {
    border-color: #409eff;
  }

  &.is-focus {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
  }
}
</style>
