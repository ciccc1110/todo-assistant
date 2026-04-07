<template>
  <div class="bot-chat">
    <!-- 顶部导航栏 -->
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">📋</div>
        </div>
        <div class="title">个人日常待办事项智能管理助手</div>
      </div>
      <div class="header-right">
        <div class="user-info">{{ userStore.userName }}</div>
        <el-button text @click="handleViewTasks">
          <el-icon><List /></el-icon>
          任务列表
        </el-button>
        <el-button text @click="handleViewStatistics">
          <el-icon><DataAnalysis /></el-icon>
          统计看板
        </el-button>
        <!-- 【可扩展】自动登录模式下隐藏退出按钮；恢复多用户登录后取消注释 -->
        <!-- <el-button text @click="handleLogout" type="danger">退出</el-button> -->
      </div>
    </div>

    <!-- 对话历史区域 -->
    <div class="chat-container" ref="chatContainer">
      <div 
        v-for="message in chatStore.messages" 
        :key="message.id"
        :class="['message', message.role === 'user' ? 'user-message' : 'bot-message']"
      >
        <div class="avatar">
          {{ message.role === 'user' ? '我' : 'BOT' }}
        </div>
        <div class="content">
          <div class="message-text" v-html="formatMessage(message.content)"></div>

          <!-- Bot快捷问题 -->
          <div v-if="message.quickQuestions && message.quickQuestions.length" class="quick-questions">
            <div 
              v-for="(question, index) in message.quickQuestions" 
              :key="index"
              class="quick-question"
              @click="handleQuickQuestion(question)"
            >
              {{ question }}
            </div>
          </div>


        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="message bot-message">
        <div class="avatar">BOT</div>
        <div class="content">
          <div class="loading">正在思考中...</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-wrapper">
        <div class="input-icon clear-icon" @click="handleClearChat" title="清空对话">🗑️</div>
        <el-input
          v-model="inputMessage"
          placeholder="发送消息..."
          @keyup.enter="sendMessage"
          size="large"
        />
      </div>
      <div class="action-buttons">
        <button class="action-btn" @click="sendMessage" :disabled="!inputMessage.trim()">
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';
import { callCozeBot } from '@/api/coze';
import { ElMessage } from 'element-plus';
import { List, DataAnalysis } from '@element-plus/icons-vue';


const router = useRouter();
const chatStore = useChatStore();
const userStore = useUserStore();
const inputMessage = ref('');
const chatContainer = ref(null);
const isLoading = ref(false);

// 格式化消息内容（将换行符转换为 <br> 标签）
const formatMessage = (content) => {
  if (!content) return '';
  // 将换行符 \n 转换为 <br> 标签
  return content.replace(/\n/g, '<br>');
};

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  const message = inputMessage.value;
  inputMessage.value = '';

  // 先添加用户消息到界面
  chatStore.addUserMessage(message);
  await scrollToBottom();

  isLoading.value = true;

  try {
    console.log('开始调用Bot API...');
    console.log('用户ID:', userStore.userId);
    const botResponse = await callCozeBot(message, userStore.userId,chatStore.conversationId);
    if (botResponse.conversation_id) {
      chatStore.setConversationId(botResponse.conversation_id);
    }
    
    console.log('Bot响应:', botResponse);

    // 添加Bot回复到界面
    chatStore.addBotMessage(
      botResponse.content || '抱歉，我没有理解您的话。',
      botResponse.quickQuestions || [],
      botResponse.quickButtons || []
    );

    await scrollToBottom();
  } catch (error) {
    console.error('发送失败:', error);
    ElMessage.error(error.message || '发送失败,请稍后重试');
    
    // 添加错误提示到对话界面
    chatStore.addBotMessage(`抱歉，发生了错误：${error.message}`);
    await scrollToBottom();
  } finally {
    isLoading.value = false;
  }
};

// 点击快捷提问
const handleQuickQuestion = async (question) => {
  if (isLoading.value) return;
  inputMessage.value = question;
  await sendMessage();
};



// 处理清屏
const handleClearChat = () => {
  if (confirm('确定要清空当前对话记录吗？（数据会保留，仅清空对话界面）')) {
    chatStore.clearMessages();
    // 重新显示欢迎消息
    chatStore.addBotMessage(
      '🌟 欢迎使用「小安同学」—— 您的智能待办管理助手 🌟\n\n' +
      '我可以帮你：\n' +
      '📝 智能识别任务 —— 用自然语言来添加、修改、删除任务\n' +
      '⏰ 贴心提醒 —— 重要事项不再遗漏\n' +
      '📊 统计分析 —— 随时掌握任务完成情况\n\n' +
      '试试这样跟我说：\n' +
      '• "明天下午3点开会"\n'+
      '• "添加一个任务: 完成毕业设计中期报告"\n'+
      '• "查看今天的待办任务"\n'+
      '• "把线上会议时间改为明天早上八点"\n'+
      '• "删除下午拿快递的任务"\n\n' +
      '开始你的高效管理之旅吧！🎯',
      ['今天有什么待办任务?', '查看所有任务', '今日学习任务']
    );
    ElMessage.success('对话记录已清空');
    scrollToBottom();
  }
};


// 查看全部任务
const handleViewTasks = () => {
  router.push('/tasks');
};

// 查看统计看板
const handleViewStatistics = () => {
  router.push('/statistics');
};

// 退出登录
// 【可扩展】恢复多用户登录后取消注释
// const handleLogout = () => {
//   if (confirm('确定要退出登录吗？')) {
//     userStore.logout();
//     ElMessage.success('已退出登录');
//     router.push('/login');
//   }
// };

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// 初始化
onMounted(async () => {
  // 加载用户信息
  userStore.loadFromStorage();
  
  // 如果没有用户信息，跳转到登录页
 // 【可扩展】自动登录模式下无需检查登录状态，userStore 已由 main.js 自动填充
// if (!userStore.isLoggedIn) {
//   router.push('/login');
//   return;
// }
// 如果没有消息,显示欢迎消息
  if (chatStore.messages.length === 0) {
    chatStore.addBotMessage(
      '🌟 欢迎使用「小安同学」—— 您的智能待办管理助手 🌟\n\n' +
      '我可以帮你：\n' +
      '📝 智能识别任务 —— 用自然语言来添加、修改、删除任务\n' +
      '⏰ 贴心提醒 —— 重要事项不再遗漏\n' +
      '📊 统计分析 —— 随时掌握任务完成情况\n\n' +
      '试试这样跟我说：\n' +
      '• "明天下午3点开会"\n'+
      '• "添加一个任务: 完成毕业设计中期报告"\n'+
      '• "查看今天的待办任务"\n'+
      '• "把线上会议时间改为明天早上八点"\n'+
      '• "删除下午拿快递的任务"\n\n' +
      '开始你的高效管理之旅吧！🎯',
      ['今天有什么待办任务?', '查看所有任务', '今日学习任务']
    );
  }
  await scrollToBottom();
});
</script>

<style scoped lang="scss">
.bot-chat {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #F5F7FA;
}

.header {
  height: 60px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #E4E7ED;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .logo-icon {
        font-size: 18px;
      }
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .header-right {
    display: flex;
    gap: 8px;
  }
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  animation: fadeIn 0.3s ease;

  &.bot-message {
    align-self: flex-start;

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #F56C6C;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .content {
      background-color: #FFFFFF;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

      .message-text {
        font-size: 14px;
        color: #606266;
        line-height: 1.6;
        margin-bottom: 12px;
        white-space: pre-wrap;
      }

      .loading {
        color: #909399;
        font-size: 14px;
      }

      .quick-questions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;

        .quick-question {
          background-color: #F5F7FA;
          border: 1px solid #DCDFE6;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 14px;
          color: #303133;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            border-color: #409EFF;
            color: #409EFF;
            background-color: #ecf5ff;
          }
        }
      }


    }
  }

  &.user-message {
    align-self: flex-end;
    flex-direction: row-reverse;

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #409EFF;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .content {
      background-color: #409EFF;
      color: white;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

.input-area {
  background-color: #FFFFFF;
  padding: 16px 20px;
  border-top: 1px solid #E4E7ED;
  display: flex;
  align-items: center;
  gap: 12px;

  .input-wrapper {
    flex: 1;
    position: relative;

    .input-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #909399;
      z-index: 1;
      cursor: pointer;
      transition: all 0.3s;
    }

    .clear-icon:hover {
      color: #F56C6C;
      transform: translateY(-50%) scale(1.2);
    }

    :deep(.el-input) {
      .el-input__wrapper {
        padding-left: 40px;
        border-radius: 24px;
        box-shadow: none;
        border: 1px solid #DCDFE6;

        &:hover {
          border-color: #409EFF;
        }

        &.is-focus {
          border-color: #409EFF;
          box-shadow: 0 0 0 1px #409EFF;
        }
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 8px;

    .action-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background-color: #F5F7FA;
      color: #606266;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover:not(:disabled) {
        background-color: #409EFF;
        color: white;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}


.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  padding: 6px 12px;
  background-color: #F5F7FA;
  border-radius: 20px;
  margin-right: 8px;

  &::before {
    content: '👤';
    font-size: 16px;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
                                                                                                                                                                                                                                           