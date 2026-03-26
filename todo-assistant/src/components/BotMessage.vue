<template>
  <div class="bot-message">
    <div class="message-header">
      <div class="avatar">
        <img src="@/assets/images/bot-avatar.png" alt="Bot" />
      </div>
      <div class="title">华泰股市助手</div>
    </div>
    <div class="message-content">
      <div class="text">{{ content }}</div>
      <div v-if="quickQuestions && quickQuestions.length > 0" class="quick-questions">
        <div class="questions-title">可尝试问我：</div>
        <div v-for="(question, index) in quickQuestions" :key="index" class="question-item">
          <span class="arrow">↑</span>
          <span>{{ question }}</span>
        </div>
      </div>
      <div v-if="quickButtons && quickButtons.length > 0" class="quick-buttons">
        <el-button
          v-for="(button, index) in quickButtons"
          :key="index"
          class="quick-btn"
          @click="$emit('quick-click', button.action)"
        >
          {{ button.text }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  content: {
    type: String,
    required: true
  },
  quickQuestions: {
    type: Array,
    default: () => []
  },
  quickButtons: {
    type: Array,
    default: () => []
  }
})

defineEmits(['quick-click'])
</script>

<style scoped lang="scss">
.bot-message {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  max-width: 80%;
  margin-bottom: 16px;

  .message-header {
    display: flex;
    align-items: center;
    gap: 12px;

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #F56C6C;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }
    }

    .title {
      font-size: 16px;
      font-weight: bold;
      color: #303133;
    }
  }

  .message-content {
    .text {
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
    }

    .quick-questions {
      margin-top: 12px;

      .questions-title {
        font-size: 14px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 8px;
      }

      .question-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #606266;
        margin-bottom: 4px;

        .arrow {
          color: #E6A23C;
        }
      }
    }

    .quick-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;

      .quick-btn {
        padding: 10px 16px;
        border: 1px solid #DCDFE6;
        border-radius: 8px;
        background: #fff;
        color: #303133;
        font-size: 14px;
        transition: all 0.3s;

        &:hover {
          border-color: #409EFF;
          color: #409EFF;
        }
      }
    }
  }
}
</style>